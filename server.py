import os
import json
import time
import uuid
import requests
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Load environment variables
dotenv_path = Path(__file__).resolve().parent / "content_pipeline" / ".env"
if not dotenv_path.exists():
    dotenv_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path)

# Runtime config store (allows updating via UI without restarting server)
CONFIG = {
    "OPENROUTER_API_KEY": os.environ.get("OPENROUTER_API_KEY", ""),
    "OPENROUTER_MODEL": os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
    "OPENROUTER_API_BASE": os.environ.get("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1"),
    "TAVILY_API_KEY": os.environ.get("TAVILY_API_KEY", ""),
    "LINKEDIN_ACCESS_TOKEN": os.environ.get("LINKEDIN_ACCESS_TOKEN", ""),
    "LINKEDIN_AUTHOR_URN": os.environ.get("LINKEDIN_AUTHOR_URN", ""),  # e.g., urn:li:person:12345
    "FACEBOOK_PAGE_ACCESS_TOKEN": os.environ.get(
        "FACEBOOK_PAGE_ACCESS_TOKEN", os.environ.get("FACEBOOK_ACCESS_TOKEN", "")
    ),
    "FACEBOOK_PAGE_ID": os.environ.get("FACEBOOK_PAGE_ID", ""),
}

# Post memory store for session history
POST_HISTORY: List[Dict[str, Any]] = []

app = FastAPI(title="ContentPulse AI & Approval Engine", version="1.0.0")

# Mount static folder
static_dir = Path(__file__).resolve().parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


# Pydantic Schemas
class GenerateRequest(BaseModel):
    topic: str
    tone: Optional[str] = "Professional & Engaging"
    target_platforms: Optional[List[str]] = ["linkedin", "facebook"]


class RefineRequest(BaseModel):
    current_draft: str
    instruction: str
    topic: Optional[str] = ""


class PublishLinkedInRequest(BaseModel):
    post_id: Optional[str] = None
    content: str
    author_urn: Optional[str] = None


class PublishFacebookRequest(BaseModel):
    post_id: Optional[str] = None
    message: str
    page_id: Optional[str] = None


class ConfigUpdateRequest(BaseModel):
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: Optional[str] = None
    TAVILY_API_KEY: Optional[str] = None
    LINKEDIN_ACCESS_TOKEN: Optional[str] = None
    LINKEDIN_AUTHOR_URN: Optional[str] = None
    FACEBOOK_PAGE_ACCESS_TOKEN: Optional[str] = None
    FACEBOOK_PAGE_ID: Optional[str] = None


def perform_tavily_search(query: str) -> Dict[str, Any]:
    """Execute live research using Tavily API."""
    api_key = CONFIG.get("TAVILY_API_KEY")
    if not api_key:
        return {
            "answer": None,
            "results": [],
            "raw": "No Tavily API key configured — live web retrieval is disabled.",
            "research_failed": True,
            "not_configured": True
        }

    try:
        resp = requests.post(
            "https://api.tavily.com/search",
            json={
                "api_key": api_key,
                "query": query,
                "max_results": 4,
                "include_answer": True,
            },
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "answer": data.get("answer", "No direct answer generated."),
            "results": [
                {
                    "title": r.get("title", "Insight"),
                    "snippet": r.get("content") or r.get("snippet", ""),
                    "url": r.get("url", "")
                }
                for r in data.get("results", [])[:4]
            ],
            "raw": data
        }
    except Exception as e:
        return {
            "answer": None,
            "results": [],
            "error": str(e),
            "research_failed": True
        }


NO_KEY_FALLBACK_TEXT = (
    "🚀 Exploring the future of technology!\n\n"
    "Key takeaways from our latest analysis:\n"
    "• Efficiency and intelligence are driving next-generation solutions.\n"
    "• Human-in-the-loop workflows ensure speed without losing quality.\n"
    "• Consistent publishing transforms audience engagement.\n\n"
    "What strategies are you adopting this year? Let's discuss! 👇\n\n"
    "#TechInnovation #AI #FutureOfWork #Productivity"
)


def call_llm(prompt: str, system_prompt: str) -> tuple[str, bool]:
    """Call OpenRouter or fallback generator.

    Returns (text, is_fallback). Callers MUST surface is_fallback to the user
    before the draft can be approved — fallback text is a generic template,
    not a real AI response to the topic, and must never be presented as one.
    """
    api_key = CONFIG.get("OPENROUTER_API_KEY")
    model = CONFIG.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    base_url = CONFIG.get("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")

    if not api_key:
        # No key configured — this is not a generated draft, flag it as such.
        return (NO_KEY_FALLBACK_TEXT, True)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/content-approval",
        "X-Title": "ContentApprovalPipeline",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.5,
        "max_tokens": 400,
    }

    try:
        resp = requests.post(f"{base_url}/chat/completions", headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return (data["choices"][0]["message"]["content"].strip(), False)
    except Exception as e:
        print(f"[WARN] LLM API call encountered an issue ({str(e)}). Generating resilient draft.")
        # Fallback template with relevant context extracted from user prompt.
        # This is still a template, not a real draft — flag it as a fallback.
        excluded_prefixes = ("Topic:", "Factual Research Notes:", "Current Draft:", "Instruction:", "Revised Post:")
        lines = [line.strip() for line in prompt.split("\n") if line.strip() and not line.startswith(excluded_prefixes)]
        insight = lines[0] if lines else "Continuous intelligence is accelerating transformation."
        fallback_text = (
            f"💡 Exploring: {insight}\n\n"
            "Key takeaways:\n"
            "• Autonomous agents and agile workflows are setting new standards for speed.\n"
            "• Human-in-the-loop validation guarantees brand quality and compliance.\n"
            "• Consistent multi-channel publishing scales audience impact across feeds.\n\n"
            "How is your team modernizing content workflows this year? Let's connect below! 👇\n\n"
            "#TechTrends #AIAgents #ContentStrategy #Innovation #Productivity"
        )
        return (fallback_text, True)


def _record_publish_result(post_id: Optional[str], platform: str, result: Dict[str, Any]) -> None:
    """Record a publish attempt against its post so /api/history reflects reality
    instead of staying frozen at 'pending_approval' forever."""
    if not post_id:
        return
    for record in POST_HISTORY:
        if record.get("id") == post_id:
            record.setdefault("published_to", []).append({
                "platform": platform,
                "status": result.get("status"),
                "mode": result.get("mode"),
                "url": result.get("url"),
                "at": time.strftime("%Y-%m-%d %H:%M:%S"),
            })
            if result.get("status") == "success":
                record["status"] = "published_live"
            break


@app.get("/")
async def get_index():
    return FileResponse(str(static_dir / "index.html"))


@app.get("/api/config")
async def get_config():
    """Return configured status of API keys (masked for security)."""
    return {
        "OPENROUTER_CONFIGURED": bool(CONFIG.get("OPENROUTER_API_KEY")),
        "OPENROUTER_MODEL": CONFIG.get("OPENROUTER_MODEL"),
        "TAVILY_CONFIGURED": bool(CONFIG.get("TAVILY_API_KEY")),
        "LINKEDIN_CONFIGURED": bool(CONFIG.get("LINKEDIN_ACCESS_TOKEN") and CONFIG.get("LINKEDIN_AUTHOR_URN")),
        "LINKEDIN_AUTHOR_URN": CONFIG.get("LINKEDIN_AUTHOR_URN", ""),
        "FACEBOOK_CONFIGURED": bool(CONFIG.get("FACEBOOK_PAGE_ACCESS_TOKEN")),
        "FACEBOOK_PAGE_ID": CONFIG.get("FACEBOOK_PAGE_ID", ""),
    }


@app.post("/api/config")
async def update_config(req: ConfigUpdateRequest):
    """Update runtime configuration keys."""
    for key, val in req.model_dump().items():
        if val is not None and val.strip() != "":
            CONFIG[key] = val.strip()
    return {"status": "success", "message": "Configuration updated successfully"}


@app.post("/api/pipeline/generate")
async def generate_post(req: GenerateRequest):
    """Run research and generate social media copy."""
    post_id = str(uuid.uuid4())[:8]
    
    # 1. Tavily Research Step
    research_data = perform_tavily_search(req.topic)

    # Compile research context. If research failed or wasn't configured, say so
    # explicitly rather than feeding an error string or a fabricated placeholder
    # to the LLM as if it were a fact.
    if research_data.get("research_failed"):
        research_text = "No live research is available for this topic. Do not state specific facts, statistics, or claims as if they came from research."
    else:
        research_text = ""
        if research_data.get("answer"):
            research_text += f"Key Insight: {research_data['answer']}\n"
        for r in research_data.get("results", []):
            research_text += f"- {r.get('title')}: {r.get('snippet')}\n"
        if not research_text:
            research_text = "No live research is available for this topic. Do not state specific facts, statistics, or claims as if they came from research."

    # 2. AI Copywriter Step
    system_prompt = (
        f"You are a world-class social media strategist and copywriter. "
        f"Tone required: {req.tone}. "
        "Create an impactful, high-engagement post suitable for LinkedIn and Facebook. "
        "Structure with a catchy hook, 2-3 value-packed bullet points or concise insights, "
        "an engaging call-to-action (CTA), and 3-5 relevant trending hashtags. "
        "Do NOT include meta labels like 'Headline:' or 'Post:'. Just output the direct post text."
    )
    
    user_prompt = f"Topic: {req.topic}\n\nFactual Research Notes:\n{research_text}\n\nDraft the complete post now:"
    draft, is_fallback = call_llm(user_prompt, system_prompt)

    post_record = {
        "id": post_id,
        "topic": req.topic,
        "tone": req.tone,
        "research": research_data,
        "draft": draft,
        "final_post": draft,
        "status": "pending_approval",
        "is_fallback": is_fallback,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "published_to": []
    }
    POST_HISTORY.insert(0, post_record)

    return {
        "post_id": post_id,
        "research": research_data,
        "draft": draft,
        "status": "pending_approval",
        "is_fallback": is_fallback
    }


@app.post("/api/pipeline/refine")
async def refine_post(req: RefineRequest):
    """Refine current draft using instruction."""
    system_prompt = (
        "You are an expert social media editor. Edit and improve the provided post draft "
        "strictly following the user's refinement instruction while preserving essential context and hashtags. "
        "Output ONLY the revised post text."
    )
    user_prompt = f"Current Draft:\n{req.current_draft}\n\nInstruction:\n{req.instruction}\n\nRevised Post:"
    revised, is_fallback = call_llm(user_prompt, system_prompt)
    if is_fallback:
        # Never silently discard the user's edited draft with a generic template.
        raise HTTPException(
            status_code=502,
            detail="AI refinement is temporarily unavailable. Your current draft has not been changed."
        )
    return {"revised_draft": revised, "is_fallback": False}


@app.post("/api/publish/linkedin")
async def publish_linkedin(req: PublishLinkedInRequest):
    """
    Publish content to LinkedIn via the LinkedIn REST Posts API.
    Requires a real access token and author URN — no simulated/sandbox mode.
    """
    token = CONFIG.get("LINKEDIN_ACCESS_TOKEN")
    author_urn = req.author_urn or CONFIG.get("LINKEDIN_AUTHOR_URN")

    if not token or not author_urn:
        return {
            "status": "not_configured",
            "platform": "LinkedIn",
            "error": "Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN in Settings to publish."
        }

    payload = {
        "author": author_urn,
        "commentary": req.content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202606",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post("https://api.linkedin.com/rest/posts", headers=headers, json=payload, timeout=20)
        status_code = resp.status_code
        if status_code in (200, 201):
            post_id = resp.headers.get("x-restli-id")
            result = {
                "status": "success",
                "mode": "live",
                "platform": "LinkedIn",
                "post_id": post_id,
                # Only build a feed link when LinkedIn actually returned the real ID —
                # a fabricated ID would 404.
                "url": f"https://www.linkedin.com/feed/update/{post_id}" if post_id else None,
                "response": resp.json() if resp.content else {"created": True}
            }
            _record_publish_result(req.post_id, "LinkedIn", result)
            return result
        else:
            error_body = resp.text
            # Detect common LinkedIn permission errors and provide actionable guidance
            if status_code == 403 and "ACCESS_DENIED" in error_body:
                return {
                    "status": "api_error",
                    "mode": "live",
                    "platform": "LinkedIn",
                    "status_code": status_code,
                    "error": (
                        "LinkedIn token lacks posting permissions. "
                        "Your app needs the 'Share on LinkedIn' product enabled "
                        "and the token must include the 'w_member_social' scope. "
                        "Steps: 1) Go to linkedin.com/developers/apps → your app → Products tab → "
                        "request 'Share on LinkedIn'. "
                        "2) Re-generate your access token with the w_member_social scope. "
                        "3) Update the token in Settings."
                    ),
                    "raw_error": error_body
                }
            return {
                "status": "api_error",
                "mode": "live",
                "platform": "LinkedIn",
                "status_code": status_code,
                "error": error_body,
                "payload_sent": payload
            }
    except Exception as e:
        return {
            "status": "error",
            "mode": "live",
            "platform": "LinkedIn",
            "error": str(e),
            "payload_sent": payload
        }


@app.post("/api/publish/facebook")
async def publish_facebook(req: PublishFacebookRequest):
    """
    Publish organic post to Facebook Page Feed via Meta Graph API.
    Requires a real page access token and page ID — no simulated/sandbox mode.
    """
    token = CONFIG.get("FACEBOOK_PAGE_ACCESS_TOKEN")
    page_id = req.page_id or CONFIG.get("FACEBOOK_PAGE_ID")

    if token:
        try:
            publish_token = token
            accounts_resp = requests.get(
                "https://graph.facebook.com/v21.0/me/accounts",
                params={
                    "fields": "id,name,access_token,tasks",
                    "access_token": token,
                },
                timeout=20,
            )
            accounts_data = accounts_resp.json()
            page_accounts = accounts_data.get("data", []) if isinstance(accounts_data, dict) else []
            selected_account = next(
                (account for account in page_accounts if not page_id or account.get("id") == page_id),
                None,
            )
            if selected_account:
                page_id = selected_account.get("id")
                publish_token = selected_account.get("access_token") or token

            if not page_id:
                identity_resp = requests.get(
                    "https://graph.facebook.com/v21.0/me",
                    params={"fields": "id,name", "access_token": token},
                    timeout=20,
                )
                identity_data = identity_resp.json()
                page_id = identity_data.get("id")
                if not page_id:
                    return {
                        "status": "configuration_error",
                        "platform": "Facebook",
                        "error": (
                            "A Facebook Page ID is required, or provide a Page access token "
                            "that can identify the Page through the Meta Graph API."
                        ),
                        "details": identity_data,
                    }

            url = f"https://graph.facebook.com/v21.0/{page_id}/feed"
            resp = requests.post(
                url,
                json={
                    "message": req.message,
                    "access_token": publish_token
                },
                timeout=25
            )
            data = resp.json()
            if "id" in data:
                result = {
                    "status": "success",
                    "mode": "live",
                    "platform": "Facebook",
                    "post_id": data["id"],
                    "url": f"https://facebook.com/{data['id']}",
                    "response": data
                }
                _record_publish_result(req.post_id, "Facebook", result)
                return result
            else:
                error_message = data
                if resp.status_code in (400, 401, 403):
                    error_message = {
                        "message": (
                            "Facebook rejected this publish request. Confirm this is a Page access token, "
                            "the token has pages_manage_posts and pages_read_engagement, and the Page ID is correct."
                        ),
                        "meta_error": data,
                    }
                return {
                    "status": "api_error",
                    "platform": "Facebook",
                    "status_code": resp.status_code,
                    "error": error_message
                }
        except Exception as e:
            return {"status": "error", "platform": "Facebook", "error": str(e)}
    else:
        return {
            "status": "not_configured",
            "platform": "Facebook",
            "error": "Add a Facebook Page access token before publishing live.",
        }


@app.get("/api/history")
async def get_history():
    return POST_HISTORY


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
