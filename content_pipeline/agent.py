""" social media post pipeline:

    topic -> Tavily research -> short post -> human approval -> publish

All three agents run on OpenRouter-hosted models.

This project originally used local LM Studio and several hosted model
attempts, but the most reliable setup for an interactive approval flow is a
single OpenRouter endpoint with a standard open-source model. Set the
OPENROUTER_API_KEY environment variable and optionally OPENROUTER_MODEL to
override the default model.

Run with:
    adk run content_pipeline
from the parent directory, or `adk web` for the browser UI.
"""

"""Google ADK content pipeline using OpenRouter.

This keeps the project in the ADK model while removing the fragile
approval-tool loop that depends on model function calling. The approval is
handled by a direct terminal callback, which is deterministic and works even
when the model is not reliable at emitting tool calls.
"""

import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools import FunctionTool
from google.genai import types

load_dotenv(Path(__file__).resolve().with_name(".env"))

# ---------------------------------------------------------------------------
# OpenRouter model configuration
# ---------------------------------------------------------------------------
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL_NAME = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
OPENROUTER_API_BASE = os.environ.get(
    "OPENROUTER_API_BASE", "https://openrouter.ai/api/v1"
)

# ---------------------------------------------------------------------------
# Tavily search configuration
# ---------------------------------------------------------------------------
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY")
TAVILY_API_URL = "https://api.tavily.com/search"


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


search_tool = FunctionTool(tavily_search)


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


def _config(
    temperature: float | None = None,
    max_output_tokens: int | None = None,
) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )


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

content_pipeline_flow = SequentialAgent(
    name="content_pipeline",
    description="Runs research, writing, and human approval for one post.",
    sub_agents=[researcher_agent, writer_agent, finalizer_agent],
)

root_agent = content_pipeline_flow
