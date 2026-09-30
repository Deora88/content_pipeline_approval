# ContentPulse — AI Social Post Pipeline with Human Approval

Topic -> Tavily research -> AI-drafted post -> Human approval -> Publish (LinkedIn / Facebook)

## What we are developing

ContentPulse is an AI-powered content creation and approval system that turns a simple topic into a polished social media post with research-backed insights and a mandatory human review checkpoint before anything is published.

A user provides a topic such as "electric bikes for city commuting". The platform then:

1. researches the latest information on the live web,
2. extracts the most relevant facts and trends,
3. drafts a social-ready post in a chosen tone,
4. shows the draft to a reviewer to approve, edit, or refine with AI,
5. publishes the approved version to LinkedIn and/or Facebook from the web dashboard.

The project ships **two separate workflows** built around the same idea:

| Workflow | Entry point | Approval | Publishes to social? |
|---|---|---|---|
| **Web dashboard** | `server.py` (FastAPI) + `static/` UI | Browser UI | Yes — LinkedIn and Facebook |
| **ADK agent pipeline** | `content_pipeline/agent.py` | Terminal `y/n` prompt | No — prints the approved post only |

They do not share code: `server.py` has its own research and LLM calls, independent of the ADK agents.

## Features

- Topic-to-post generation using an LLM plus live web research (Tavily)
- Human approval gate before publishing
- AI-assisted draft refinement ("punchier", "add emojis", or any custom instruction)
- One-click publishing to the selected channels, or per-channel publishing
- Live publishing to **LinkedIn** and **Facebook Pages** only
- Browser dashboard with per-platform post previews and an activity log
- In-app settings for API keys and integration credentials (applied at runtime, no restart)
- Post history endpoint recording every publish attempt
- Transparent failure handling (see "Reliability and honesty rules" below)

## Reliability and honesty rules

The app is designed so that nothing fake ever looks real:

- **No simulated publishing.** There is no sandbox or dry-run mode. If LinkedIn or Facebook credentials are missing, the publish endpoints return `not_configured` and nothing is posted. A `success` status always means a real API call succeeded.
- **Fallback drafts are flagged.** If OpenRouter is unreachable or no key is set, the server returns a generic placeholder draft with `is_fallback: true`. The UI shows a warning banner that the text is not a real draft for the topic.
- **Refine never overwrites your draft with a fallback.** If the AI is unavailable during refinement, the API returns HTTP 502 and the draft is left unchanged.
- **Research status is honest.** If Tavily is missing or fails, the research panel and status badge say so, and the LLM is told no live research is available rather than being fed an error message as if it were a fact.
- **No invented links.** Post URLs are built only from IDs the platform actually returned.
- **UI escaping.** Research titles, snippets and links are HTML-escaped and links are restricted to `http(s)`.

## Technical approach

- **OpenRouter** provides the LLM (OpenAI-compatible API); default model `openai/gpt-4o-mini`.
- **Tavily** provides live web search and an answer summary.
- **FastAPI** serves the dashboard and the JSON API for generation, refinement, configuration, publishing and history.
- **Google ADK** provides a sequential three-agent pipeline (researcher -> writer -> finalizer) with a deterministic terminal approval callback.
- **LiteLLM** routes ADK model calls to OpenRouter.
- Human review is a hard control layer: the model drafts, the reviewer decides.

## Technologies used

- **Python 3.13** — runtime
- **FastAPI** + **Uvicorn** — web server and REST API
- **Pydantic** — request validation and API schemas
- **Google Agent Development Kit (ADK)** — agent orchestration (CLI workflow)
- **LiteLLM** — ADK-to-OpenRouter model routing
- **OpenRouter** — LLM provider
- **Tavily Search API** — live web research
- **Requests** — outbound HTTP to AI, research and social APIs
- **python-dotenv** — `.env` configuration
- **HTML, CSS and vanilla JavaScript** — browser dashboard in `static/` (no framework, no build step)
- **LinkedIn REST API** — LinkedIn publishing
- **Meta Graph API** — Facebook Page publishing

## Project structure

```
.
├── server.py                 # FastAPI backend (web workflow)
├── requirements.txt
├── README.md
├── docs/ARCHITECTURE.md
├── static/
│   ├── index.html            # dashboard markup
│   ├── app.js                # dashboard logic (fetch calls, previews, publish flow)
│   └── style.css             # dark theme styling
└── content_pipeline/
    ├── agent.py              # Google ADK workflow (CLI)
    └── .env                  # secrets (git-ignored)
```

## Setup

1. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Create `content_pipeline/.env` (a root-level `.env` also works as a fallback for `server.py`). Both are git-ignored.
   ```env
   OPENROUTER_API_KEY=your-openrouter-key
   OPENROUTER_MODEL=openai/gpt-4o-mini
   TAVILY_API_KEY=your-tavily-key

   # Optional — only needed to publish from the dashboard
   LINKEDIN_ACCESS_TOKEN=your-linkedin-token
   LINKEDIN_AUTHOR_URN=urn:li:person:xxxx
   FACEBOOK_PAGE_ACCESS_TOKEN=your-page-token
   FACEBOOK_PAGE_ID=your-page-id
   ```
3. Start the web dashboard from the project root:
   ```bash
   python -m uvicorn server:app --reload
   ```
   Open `http://127.0.0.1:8000/`.
4. Or run the standalone ADK workflow:
   ```bash
   adk run content_pipeline
   ```

You can also enter API keys in the dashboard's Settings panel; they are held in memory for the running server only.

## Environment variables

Required for real AI drafts and research:
- `OPENROUTER_API_KEY`
- `TAVILY_API_KEY`

Optional:
- `OPENROUTER_MODEL` (default: `openai/gpt-4o-mini`)
- `OPENROUTER_API_BASE` (default: `https://openrouter.ai/api/v1`)
- `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_AUTHOR_URN` — LinkedIn publishing
- `FACEBOOK_PAGE_ACCESS_TOKEN` and `FACEBOOK_PAGE_ID` — Facebook publishing

Windows PowerShell:
```powershell
$env:OPENROUTER_API_KEY = "your-openrouter-key"
$env:OPENROUTER_MODEL = "openai/gpt-4o-mini"
$env:TAVILY_API_KEY = "your-tavily-key"
```

## Web API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Serves the dashboard |
| GET | `/api/config` | Which integrations are configured (booleans only, no secrets) |
| POST | `/api/config` | Update keys/settings at runtime |
| POST | `/api/pipeline/generate` | Research + draft; returns `draft`, `research`, `is_fallback` |
| POST | `/api/pipeline/refine` | AI rewrite of the current draft; 502 if AI is unavailable |
| POST | `/api/publish/linkedin` | Publish to LinkedIn (`success`, `not_configured`, or an error status) |
| POST | `/api/publish/facebook` | Publish to a Facebook Page (`success`, `not_configured`, or an error status) |
| GET | `/api/history` | Recent posts and their publish results (in memory) |

## Run the ADK workflow

```bash
adk run content_pipeline
```

Enter a topic when prompted, e.g. `electric bikes for city commuting`. The workflow will:
1. search the web with Tavily,
2. summarize the findings,
3. draft a short social post,
4. ask for approval in the terminal,
5. print the final approved draft.

Notes:
- Approval uses a blocking terminal `input()`, so this workflow needs a real terminal and is **not compatible with `adk web`**.
- Rejecting a draft ends the run with no approved post; re-run to generate a new one.
- Fails loudly if `TAVILY_API_KEY` is missing (no mock research).

## Where the flow lives in `agent.py`

| Topic | Where |
|---|---|
| Agents | `researcher_agent`, `writer_agent`, `finalizer_agent` |
| Model config | `OPENROUTER_MODEL_NAME` and `_openrouter_model()` |
| Tools | `tavily_search` wrapped as `FunctionTool` |
| Session / State | `output_key` values: `research_notes`, `draft`, `final_post` |
| Multi-agent systems | `SequentialAgent` runs the full workflow |
| Human approval | `_prompt_for_approval_after_draft` asks for `y/n` |

## Where the flow lives in `server.py`

| Topic | Where |
|---|---|
| Runtime config store | `CONFIG` dict, updated via `POST /api/config` |
| Research | `perform_tavily_search()` (flags `research_failed` / `not_configured`) |
| LLM call | `call_llm()` returns `(text, is_fallback)` |
| Generate / refine | `generate_post()`, `refine_post()` |
| Publishing | `publish_linkedin()`, `publish_facebook()` |
| History | `POST_HISTORY` list, `_record_publish_result()` |

## Why this design

An earlier version stalled because approval depended on the model reliably emitting a tool call. The current design keeps the ADK workflow but makes approval deterministic and application-controlled: the model researches and drafts, and a person approves in the app itself.

## Known limitations

- Post history and runtime settings live in memory and reset when the server restarts (no database).
- Platform access tokens are not refreshed automatically; LinkedIn and Meta tokens expire and must be renewed.
- The ADK workflow is terminal-only and does not publish.

## Scope note

Instagram and Twitter/X support was removed. The project currently publishes to LinkedIn and Facebook only.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for architecture and request-flow details. If that document still mentions Instagram, Twitter/X, sandbox or simulated publishing, it should be updated to match this README.
