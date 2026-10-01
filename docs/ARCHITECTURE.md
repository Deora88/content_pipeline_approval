# ContentPulse — Architecture

This document describes the current state of the codebase: two independent workflows that implement the same idea — topic in, research, AI draft, human approval, publish — with no shared code between them.

## 1. Two workflows, one concept

| | Web dashboard | ADK agent pipeline |
|---|---|---|
| Entry point | `server.py` (FastAPI) + `static/` | `content_pipeline/agent.py` |
| Run with | `python -m uvicorn server:app --reload` | `adk run content_pipeline` |
| Approval | Browser UI (Approve / Refine buttons) | Blocking terminal `input()` prompt |
| Publishes to social? | Yes — LinkedIn, Facebook | No — prints the approved post only |
| LLM calls | `call_llm()` in `server.py`, direct HTTP to OpenRouter | ADK `LlmAgent` + `LiteLlm`, routed to OpenRouter |
| Web research | `perform_tavily_search()` in `server.py` | `tavily_search()`, wrapped as an ADK `FunctionTool` |

They do not import each other and do not share state. A fix made in one does not apply to the other — each must be reasoned about independently.

## 2. Web dashboard — request flow

```
Browser                    server.py                      External APIs
   │                           │                                │
   ├─ POST /api/pipeline/generate ──────────────────────────────┤
   │                           ├─ perform_tavily_search() ──────► Tavily
   │                           ├─ call_llm() ────────────────────► OpenRouter
   │   draft + is_fallback ◄───┤
   │                           │
   ├─ (optional) POST /api/pipeline/refine ──────────────────────┤
   │                           ├─ call_llm() ────────────────────► OpenRouter
   │   revised_draft, or 502 ◄─┤   (502 if the AI is unavailable — draft is never overwritten with fallback text)
   │                           │
   ├─ POST /api/publish/linkedin and/or /api/publish/facebook ───┤
   │                           ├─ live API call ─────────────────► LinkedIn / Meta Graph API
   │   success or not_configured ◄─┤
   │                           ├─ _record_publish_result() → POST_HISTORY
```

Every step is a plain JSON request/response over `fetch()` — there's no WebSocket or streaming involved.

## 3. Reliability guarantees (the "nothing fake looks real" rules)

These are enforced in code, not just documentation:

- **No sandbox or dry-run mode anywhere.** `publish_linkedin` and `publish_facebook` only ever return `"status": "success"` (a real API call actually succeeded) or `"status": "not_configured"` (no credentials — nothing was sent). There is no `mode` field and no simulated response.
- **Fallback drafts are flagged, not disguised.** `call_llm()` returns `(text, is_fallback)`. If `OPENROUTER_API_KEY` is missing, or the OpenRouter call fails, the server returns a generic placeholder with `is_fallback: true`. The dashboard shows a red banner and disables both "Approve" buttons until a real draft or a successful refine replaces it.
- **Refine fails safe.** If `call_llm()` returns a fallback during a refine request, the endpoint raises `HTTP 502` instead of returning fallback text — the user's current draft is never silently overwritten.
- **Research failures are explicit.** `perform_tavily_search()` returns `research_failed: true` (and `not_configured: true` when `TAVILY_API_KEY` is simply missing) instead of embedding an error string as if it were a fact. `generate_post()` checks this flag and tells the LLM "no live research is available" rather than feeding it a fabricated answer.
- **No invented links.** A LinkedIn or Facebook post URL is only built from an ID the platform actually returned. If the ID is missing, `url` is `null` — never a guessed link that would 404.
- **Untrusted content is escaped.** Research titles, snippets, and links rendered in the dashboard are HTML-escaped, and links are restricted to `http(s)://` schemes.
- **Every publish attempt is recorded**, success or failure, via `_record_publish_result()` — not just successes.

## 4. Web backend — key pieces in `server.py`

| Concern | Where |
|---|---|
| Runtime config (API keys, tokens) | `CONFIG` dict; updated live via `POST /api/config`, no restart needed |
| Request validation | Pydantic models: `GenerateRequest`, `RefineRequest`, `PublishLinkedInRequest`, `PublishFacebookRequest`, `ConfigUpdateRequest` |
| Web research | `perform_tavily_search()` |
| LLM calls + fallback flagging | `call_llm()` → `(text, is_fallback)` |
| Draft generation | `generate_post()` — `POST /api/pipeline/generate` |
| Draft refinement | `refine_post()` — `POST /api/pipeline/refine` |
| LinkedIn publish | `publish_linkedin()` — `POST /api/publish/linkedin` (LinkedIn REST Posts API) |
| Facebook publish | `publish_facebook()` — `POST /api/publish/facebook` (Meta Graph API, Page Feed) |
| History | `POST_HISTORY` (in-memory list) + `_record_publish_result()`; read via `GET /api/history` |
| Static frontend | `index.html`, `app.js`, `style.css` served from `static/`, mounted at `/static` |

There is no database — `CONFIG` and `POST_HISTORY` are process memory and reset on restart.

## 5. ADK agent pipeline — key pieces in `content_pipeline/agent.py`

Three `LlmAgent`s run in a fixed sequence via ADK's `SequentialAgent`:

1. **`researcher_agent`** — calls `tavily_search` (an ADK `FunctionTool`), condenses results into 2-3 factual notes. Output key: `research_notes`.
2. **`writer_agent`** — writes a short punchy post from the notes. Output key: `draft`. Its `after_agent_callback`, `_prompt_for_approval_after_draft`, fires immediately after the draft is written and blocks on terminal `input("Publish? (y/n): ")`.
3. **`finalizer_agent`** — echoes back `{final_post}` (the approved text, or a rejection message) as the pipeline's final output.

All three agents reach OpenRouter through `LiteLlm` (`_openrouter_model()`), configured by `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`).

**Important constraint:** because approval uses a blocking `input()` call, this pipeline requires a real terminal and does **not** work with `adk web`, which runs agents in a non-interactive server context.

Unlike the web dashboard, `tavily_search()` here raises a `ValueError` immediately if `TAVILY_API_KEY` is missing — there's no fallback or mock research path in the ADK pipeline.

## 6. Technology stack

- **Backend:** Python 3, FastAPI, Uvicorn, Pydantic, python-dotenv, requests
- **AI / agents:** Google ADK, LiteLLM (OpenRouter routing), OpenRouter (`openai/gpt-4o-mini` default), Tavily Search API
- **Publishing:** LinkedIn REST Posts API, Meta Graph API (Facebook Page Feed)
- **Frontend:** vanilla HTML/CSS/JavaScript — no framework, no build step
- **Storage:** in-memory only (no database)

## 7. Current scope and known limitations

- Publishes to **LinkedIn and Facebook only**. Instagram and Twitter/X support was removed entirely (backend endpoints, OAuth flow, frontend tabs and settings fields).
- Post history and runtime config live in memory and are lost on restart.
- LinkedIn and Meta access tokens are not refreshed automatically — they expire and must be renewed manually in Settings.
- The ADK workflow is terminal-only; it does not publish to any platform.
- `server.py` is a single file; splitting it into modules (config, AI calls, publishing, routes) is a reasonable future refactor as it grows.
