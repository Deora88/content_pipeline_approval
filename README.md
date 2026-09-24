# Simple Social Media Post Pipeline

Topic -> Tavily research -> Short post -> Human approval -> Final output

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the web and ADK architectures, request flows, API contracts, external integrations, state model, and deployment considerations.

This project is a Google ADK pipeline that uses OpenRouter as the model provider and Tavily for live web research.

## Technologies used

- **Python 3.13** - application and pipeline runtime
- **FastAPI** - web server and REST API layer
- **Uvicorn** - ASGI server used to run the web dashboard
- **Google Agent Development Kit (ADK)** - multi-agent orchestration
- **LiteLLM** - routes ADK model calls to OpenRouter
- **OpenRouter** - LLM provider for research summarization, copywriting, and refinement
- **Tavily Search API** - live web research and source retrieval
- **Requests** - outbound HTTP requests to AI, research, and social APIs
- **Pydantic** - request validation and API schemas
- **python-dotenv** - loads environment configuration from `.env` files
- **HTML, CSS, and JavaScript** - browser dashboard in `static/`
- **LinkedIn REST API** - LinkedIn publishing
- **Instagram Graph API** - Instagram media container and publishing workflow
- **X API v2 with OAuth 2.0 PKCE** - X/Twitter publishing and account authorization
- **Meta Graph API** - Facebook Page publishing

## Setup in VS Code

1. Open this folder in VS Code.
2. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
   Select `.venv` as your interpreter (`Cmd/Ctrl+Shift+P` -> "Python: Select Interpreter").
3. Create a `.env` file in the `content_pipeline` folder with:
   ```env
   OPENROUTER_API_KEY=your-openrouter-key
   OPENROUTER_MODEL=openai/gpt-4o-mini
   TAVILY_API_KEY=your-tavily-key
   ```
4. Run the app from the project root:
   ```bash
   adk run content_pipeline
   ```

## Environment variables

Required:
- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`

Optional:
- `OPENROUTER_MODEL` (default: `openai/gpt-4o-mini`)
- `OPENROUTER_API_BASE` (default: `https://openrouter.ai/api/v1`)

On Windows PowerShell:
```powershell
$env:OPENROUTER_API_KEY = "your-openrouter-key"
$env:OPENROUTER_MODEL = "openai/gpt-4o-mini"
$env:TAVILY_API_KEY = "your-tavily-key"
```

## Run it

From the project root:

```bash
adk run content_pipeline
```

Enter a topic when prompted, for example:

```
electric bikes for city commuting
```

The workflow will:
1. search the web with Tavily
2. summarize the findings
3. draft a short social post
4. ask for approval in the terminal
5. print the final approved draft

## Where the flow lives in `agent.py`

| Topic | Where |
|---|---|
| Agents | `researcher_agent`, `writer_agent`, `finalizer_agent` |
| Model config | `OPENROUTER_MODEL_NAME` and `_openrouter_model()` |
| Tools | `tavily_search` wrapped as `FunctionTool` |
| Session / State | `output_key` values such as `research_notes` and `draft` |
| Multi-agent systems | `SequentialAgent` runs the full workflow |
| Human approval | `_prompt_for_approval_after_draft` asks for `y/n` |

## Why this design

The earlier version stalled because the approval step depended on the model reliably emitting a tool call. That was not dependable in the local/hosted model attempts.

This final version keeps the ADK workflow while making approval deterministic and application-controlled. The model still does the research and drafting, but the user approves the final content in the app itself.

## Notes

- Real web search is active via Tavily.
- The human approval gate is real.
- The final output is printed only after approval.
- This is a reliable demo-friendly ADK workflow rather than a tool-call-dependent loop.
