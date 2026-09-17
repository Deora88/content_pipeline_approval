# Code Walk-through Handout

## Project Overview

This project is a Google ADK pipeline that turns a user topic into a short social post with three stages:

1. Research the topic using Tavily
2. Draft a short social-media post
3. Require human approval before returning the final result

The design stays inside the ADK agent framework, but the critical approval step is controlled by the application itself instead of relying on the model to emit a tool call.

---

## File Structure

- `content_pipeline/agent.py` — main workflow implementation
- `.env` — local environment variables for API keys and model config
- `README.md` — setup and usage instructions

---

## 1. Imports

```python
import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools import FunctionTool
from google.genai import types
```

These imports provide the core building blocks:

- `os` and `Path` help access environment variables and local config files.
- `requests` is used to call the Tavily search API.
- `load_dotenv` loads local secrets from the project `.env` file.
- `LlmAgent` and `SequentialAgent` compose the ADK workflow.
- `LiteLlm` connects the ADK agents to the model provider.
- `FunctionTool` wraps the Tavily search function so the model can call it.
- `types` is used for configure-generation settings.

---

## 2. Load Local Configuration

```python
load_dotenv(Path(__file__).resolve().with_name(".env"))
```

This loads environment variables from the project `.env` file, which keeps API keys and provider choices out of source code.

---

## 3. OpenRouter Model Configuration

```python
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL_NAME = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
OPENROUTER_API_BASE = os.environ.get(
    "OPENROUTER_API_BASE", "https://openrouter.ai/api/v1"
)
```

This section configures the model provider used by the agents. OpenRouter provides a standard OpenAI-compatible API and keeps model access simple and centralized.

---

## 4. Tavily Search Tool

```python
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY")
TAVILY_API_URL = "https://api.tavily.com/search"
```

These values define the Tavily endpoint and credential source for the real web search step.

```python
def tavily_search(query: str) -> str:
    """Search the web with Tavily and return concise results for the research step."""
    if not TAVILY_API_KEY:
        raise ValueError("TAVILY_API_KEY is missing. Add it to content_pipeline/.env or export it.")

    response = requests.post(
        TAVILY_API_URL,
        json={
            "api_key": TAVILY_API_KEY,
            "query": query,
            "max_results": 5,
            "include_answer": True,
            "include_raw_content": False,
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
```

This function performs a real web search through Tavily. It:

- checks that the API key exists,
- sends the query to the Tavily API,
- requests the answer and up to five relevant results,
- raises an error if the search fails.

```python
    sections = []
    answer = payload.get("answer")
    if answer:
        sections.append(f"Answer: {answer}")

    for result in payload.get("results", [])[:5]:
        title = result.get("title") or "Result"
        url = result.get("url") or ""
        snippet = result.get("content") or result.get("snippet") or ""
        line = f"{title}: {snippet}".strip()
        if url:
            line = f"{line} ({url})".strip()
        sections.append(line)

    return "\n".join(sections) if sections else "No search results found."
```

This part converts raw Tavily results into a compact research block that the model can reason about.

```python
search_tool = FunctionTool(tavily_search)
```

This wraps the search function into an ADK tool so the researcher agent can call it during its workflow.

---

## 5. Human Approval Callback

```python
async def _prompt_for_approval_after_draft(callback_context) -> None:
    """Ask the human for approval immediately after the draft is written."""
    draft = callback_context.state.get("draft", "").strip()
    if not draft:
        callback_context.state["approval_status"] = "missing"
        callback_context.state["final_post"] = "No approved draft available."
        return

    while True:
        answer = input(f"\nPost this?\n\n{draft}\n\nPublish? (y/n): ").strip().lower()
        if answer in {"y", "n"}:
            break
        print("Please answer y or n.")

    if answer == "y":
        callback_context.state["approval_status"] = "approved"
        callback_context.state["final_post"] = draft
        print(f"\nFinal approved post:\n{draft}\n")
    else:
        callback_context.state["approval_status"] = "rejected"
        callback_context.state["final_post"] = "No approved draft available."
        print("\nThe post will be reviewed and rewritten.\n")
```

This is the fix that resolved the earlier failure. It keeps the human approval step in the application rather than depending on the model to emit a tool call.

Key points:

- reads the generated draft from session state,
- asks for approval in the terminal,
- accepts `y` or `n` only,
- stores the final approved output in state,
- prints the final result if accepted.

This is what makes the workflow reliable.

---

## 6. Model Factory

```python
def _openrouter_model(tool_choice: str | None = None) -> LiteLlm:
    """Create a LiteLlm instance targeting OpenRouter's API."""
    options = {
        "api_key": OPENROUTER_API_KEY,
        "api_base": OPENROUTER_API_BASE,
        "num_retries": 2,
    }
    if tool_choice:
        options["tool_choice"] = tool_choice

    return LiteLlm(
        model=f"openrouter/{OPENROUTER_MODEL_NAME}",
        **options,
    )
```

This helper creates the LLM backend used by each ADK agent. It standardizes the provider configuration and avoids repeating the same settings across agents.

---

## 7. Generation Configuration

```python
def _config(
    temperature: float | None = None,
    max_output_tokens: int | None = None,
) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )
```

This configures the model output for each agent:

- `temperature` controls creativity,
- `max_output_tokens` limits the output length,
- each agent can have different settings.

---

## 8. Researcher Agent

```python
researcher_agent = LlmAgent(
    model=_openrouter_model(),
    name="researcher",
    tools=[search_tool],
    generate_content_config=_config(max_output_tokens=180),
    instruction="""
You are a research assistant. Use the Tavily web search tool to gather current
facts about the user's topic. Then extract the topic into 2-3 concise notes
that a writer can use as a brief creative brief. Keep it factual and brief.
Output ONLY the notes, nothing else.
""",
    output_key="research_notes",
)
```

This is the research stage.

It performs two important jobs:

1. Uses Tavily to look up the live topic context.
2. Converts the search results into a short note set.

It then stores that result in the session state under `research_notes`.

---

## 9. Writer Agent

```python
writer_agent = LlmAgent(
    model=_openrouter_model(),
    name="writer",
    generate_content_config=_config(temperature=0.5, max_output_tokens=200),
    instruction="""
You are a social media copywriter. Use the user topic and create a single,
punchy social media post. Write exactly 3 or 4 short lines, under 200
characters total, with one sentence or phrase per line. Do not add labels,
bullets, numbering, or blank lines. Output ONLY the post text.
""",
    output_key="draft",
    after_agent_callback=_prompt_for_approval_after_draft,
)
```

This is the drafting stage.

It creates a social-media post that is:

- concise,
- emotionally punchy,
- restricted to a short line count,
- saved into the `draft` state variable,
- followed immediately by the approval prompt.

The callback ensures approval happens right after the draft is created.

---

## 10. Finalizer Agent

```python
finalizer_agent = LlmAgent(
    model=_openrouter_model(),
    name="finalizer",
    generate_content_config=_config(max_output_tokens=128),
    instruction="""
Use the current `{final_post?}` value as the final post if it is available.
Return only the final post text, with no labels, commentary, or extra text.
If there is no approved draft, return: No approved draft available.
""",
    output_key="final_post",
)
```

This final stage is simple and deterministic:

- if the draft was approved, it emits the final post,
- otherwise it returns a fallback message.

This ensures the output is clean and presentation-ready.

---

## 11. Sequential Workflow

```python
content_pipeline_flow = SequentialAgent(
    name="content_pipeline",
    description="Runs research, writing, and human approval for one post.",
    sub_agents=[researcher_agent, writer_agent, finalizer_agent],
)
```

This creates the full multi-agent flow. Execution order is fixed and easy to follow:

1. Researcher agent
2. Writer agent
3. Finalizer agent

This makes the process understandable and reliable for both demo and implementation.

---

## 12. Root Agent

```python
root_agent = content_pipeline_flow
```

This sets the workflow as the top-level ADK agent. This is the object ADK runs when the application starts.

---

## Why This Is a Good Final Design

This project solves the main technical risk: approval was previously tied to model behavior. By moving approval into the application, the workflow becomes more dependable and more human-centered.

The result is a pipeline that is still ADK-based, but with a more robust operational pattern:

- live search for research,
- model-generated content,
- human approval gate,
- clean final output.

---

## Demo Message

“The critical fix was moving approval out of the model and into the application. This keeps Google ADK in the architecture, while making the approval step deterministic and reliable.”
