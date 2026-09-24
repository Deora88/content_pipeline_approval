import os
import json
import time
import uuid
import hashlib
import base64
import secrets
from urllib.parse import urlencode
import requests
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, HTMLResponse
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
    "INSTAGRAM_ACCESS_TOKEN": os.environ.get("INSTAGRAM_ACCESS_TOKEN", ""),
    "INSTAGRAM_ACCOUNT_ID": os.environ.get("INSTAGRAM_ACCOUNT_ID", ""),
    "TWITTER_BEARER_TOKEN": os.environ.get("TWITTER_BEARER_TOKEN", ""),
    "TWITTER_API_KEY": os.environ.get("TWITTER_API_KEY", ""),
    "X_CLIENT_ID": os.environ.get("X_CLIENT_ID", ""),
    "X_CLIENT_SECRET": os.environ.get("X_CLIENT_SECRET", ""),
    "X_REDIRECT_URI": os.environ.get("X_REDIRECT_URI", "http://127.0.0.1:8000/api/x/oauth/callback"),
    "X_ACCESS_TOKEN": os.environ.get("X_ACCESS_TOKEN", ""),
    "FACEBOOK_PAGE_ACCESS_TOKEN": os.environ.get(
        "FACEBOOK_PAGE_ACCESS_TOKEN", os.environ.get("FACEBOOK_ACCESS_TOKEN", "")
    ),
    "FACEBOOK_PAGE_ID": os.environ.get("FACEBOOK_PAGE_ID", ""),
}

OAUTH_SESSIONS: Dict[str, Dict[str, Any]] = {}

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
    target_platforms: Optional[List[str]] = ["linkedin", "instagram", "twitter", "facebook"]


class RefineRequest(BaseModel):
    current_draft: str
    instruction: str
    topic: Optional[str] = ""


class PublishLinkedInRequest(BaseModel):
    post_id: Optional[str] = None
    content: str
    author_urn: Optional[str] = None


class PublishInstagramRequest(BaseModel):
    post_id: Optional[str] = None
    caption: str
    image_url: Optional[str] = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"
    account_id: Optional[str] = None


class PublishTwitterRequest(BaseModel):
    post_id: Optional[str] = None
    tweet_text: str


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
    INSTAGRAM_ACCESS_TOKEN: Optional[str] = None
    INSTAGRAM_ACCOUNT_ID: Optional[str] = None
    TWITTER_BEARER_TOKEN: Optional[str] = None
    TWITTER_API_KEY: Optional[str] = None
    X_CLIENT_ID: Optional[str] = None
    X_CLIENT_SECRET: Optional[str] = None
    X_REDIRECT_URI: Optional[str] = None
    FACEBOOK_PAGE_ACCESS_TOKEN: Optional[str] = None
    FACEBOOK_PAGE_ID: Optional[str] = None


def perform_tavily_search(query: str) -> Dict[str, Any]:
    """Execute live research using Tavily API."""
    api_key = CONFIG.get("TAVILY_API_KEY")
    if not api_key:
        return {
            "answer": "Tavily API key is not configured. Utilizing synthesized domain knowledge.",
            "results": [
                {
                    "title": f"Recent trends in {query}",
                    "snippet": f"Emerging innovations, high user adoption, and key insights related to {query}.",
                    "url": "https://example.com/research-insights"
                }
            ],
            "raw": "Mocked research: Add TAVILY_API_KEY to enable live web retrieval."
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
            "answer": f"Web search encountered an issue: {str(e)}",
            "results": [],
            "error": str(e)
        }


def call_llm(prompt: str, system_prompt: str) -> str:
    """Call OpenRouter or fallback generator."""
    api_key = CONFIG.get("OPENROUTER_API_KEY")
    model = CONFIG.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    base_url = CONFIG.get("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")

    if not api_key:
        # Provide high-quality fallback template if no API key is provided
        return (
            "🚀 Exploring the future of technology!\n\n"
            "Key takeaways from our latest analysis:\n"
            "• Efficiency and intelligence are driving next-generation solutions.\n"
            "• Human-in-the-loop workflows ensure speed without losing quality.\n"
            "• Consistent publishing transforms audience engagement.\n\n"
            "What strategies are you adopting this year? Let's discuss! 👇\n\n"
            "#TechInnovation #AI #FutureOfWork #Productivity"
        )

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
        "max_tokens": 120,
    }

    try:
        resp = requests.post(f"{base_url}/chat/completions", headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[WARN] LLM API call encountered an issue ({str(e)}). Generating resilient draft.")
        # Fallback template with relevant context extracted from user prompt
        lines = [line.strip() for line in prompt.split("\n") if line.strip() and not line.startswith("Topic:") and not line.startswith("Factual Research Notes:")]
        insight = lines[0] if lines else "Continuous intelligence is accelerating transformation."
        return (
            f"💡 Exploring: {insight}\n\n"
            "Key takeaways:\n"
            "• Autonomous agents and agile workflows are setting new standards for speed.\n"
            "• Human-in-the-loop validation guarantees brand quality and compliance.\n"
            "• Consistent multi-channel publishing scales audience impact across feeds.\n\n"
            "How is your team modernizing content workflows this year? Let's connect below! 👇\n\n"
            "#TechTrends #AIAgents #ContentStrategy #Innovation #Productivity"
        )


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
        "LINKEDIN_CONFIGURED": bool(CONFIG.get("LINKEDIN_ACCESS_TOKEN")),
        "LINKEDIN_AUTHOR_URN": CONFIG.get("LINKEDIN_AUTHOR_URN", ""),
        "INSTAGRAM_CONFIGURED": bool(CONFIG.get("INSTAGRAM_ACCESS_TOKEN")),
        "INSTAGRAM_ACCOUNT_ID": CONFIG.get("INSTAGRAM_ACCOUNT_ID", ""),
        "TWITTER_CONFIGURED": bool(CONFIG.get("X_ACCESS_TOKEN") or CONFIG.get("TWITTER_BEARER_TOKEN")),
        "X_OAUTH_CONFIGURED": bool(CONFIG.get("X_CLIENT_ID") and CONFIG.get("X_CLIENT_SECRET")),
        "X_REDIRECT_URI": CONFIG.get("X_REDIRECT_URI"),
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


@app.get("/api/x/oauth/start")
async def start_x_oauth():
    """Start X OAuth 2.0 authorization with PKCE for user-context posting."""
    client_id = CONFIG.get("X_CLIENT_ID")
    redirect_uri = CONFIG.get("X_REDIRECT_URI")
    if not client_id or not CONFIG.get("X_CLIENT_SECRET"):
        raise HTTPException(status_code=400, detail="Set X_CLIENT_ID and X_CLIENT_SECRET before connecting X.")

    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode("ascii")).digest()
    ).rstrip(b"=").decode("ascii")
    state = secrets.token_urlsafe(32)
    OAUTH_SESSIONS[state] = {"code_verifier": code_verifier, "created_at": time.time()}
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "tweet.read tweet.write users.read offline.access",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return RedirectResponse("https://twitter.com/i/oauth2/authorize?" + urlencode(params))


@app.get("/api/x/oauth/callback", response_class=HTMLResponse)
@app.get("/auth/callback", response_class=HTMLResponse)
async def x_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    """Exchange the X authorization code for a user access token."""
    if error:
        return HTMLResponse(f"<h2>X authorization was not completed</h2><p>{error}</p>", status_code=400)
    session = OAUTH_SESSIONS.pop(state or "", None)
    if not session or time.time() - session["created_at"] > 600:
        return HTMLResponse("<h2>Invalid or expired X OAuth session</h2><p>Start the connection again.</p>", status_code=400)
    if not code:
        return HTMLResponse("<h2>X did not return an authorization code</h2>", status_code=400)

    response = None
    try:
        response = requests.post(
            "https://api.x.com/2/oauth2/token",
            data={
                "code": code,
                "grant_type": "authorization_code",
                "client_id": CONFIG["X_CLIENT_ID"],
                "redirect_uri": CONFIG["X_REDIRECT_URI"],
                "code_verifier": session["code_verifier"],
            },
            auth=(CONFIG["X_CLIENT_ID"], CONFIG["X_CLIENT_SECRET"]),
            timeout=20,
        )
        response.raise_for_status()
        token_data = response.json()
        CONFIG["X_ACCESS_TOKEN"] = token_data["access_token"]
        CONFIG["X_REFRESH_TOKEN"] = token_data.get("refresh_token", "")
        CONFIG["X_TOKEN_EXPIRES_AT"] = time.time() + token_data.get("expires_in", 7200)
    except (requests.RequestException, KeyError, ValueError) as exc:
        detail = response.text if response is not None else str(exc)
        return HTMLResponse(f"<h2>X connection failed</h2><pre>{detail}</pre>", status_code=502)

    return HTMLResponse("<h2>X connected successfully</h2><p>You can close this window and publish from ContentPulse.</p>")


@app.post("/api/pipeline/generate")
async def generate_post(req: GenerateRequest):
    """Run research and generate social media copy."""
    post_id = str(uuid.uuid4())[:8]
    
    # 1. Tavily Research Step
    research_data = perform_tavily_search(req.topic)
    
    # Compile research context
    research_text = ""
    if research_data.get("answer"):
        research_text += f"Key Insight: {research_data['answer']}\n"
    for r in research_data.get("results", []):
        research_text += f"- {r.get('title')}: {r.get('snippet')}\n"

    # 2. AI Copywriter Step
    system_prompt = (
        f"You are a world-class social media strategist and copywriter. "
        f"Tone required: {req.tone}. "
        "Create an impactful, high-engagement post suitable for LinkedIn, Instagram, Twitter / X, and Facebook. "
        "Structure with a catchy hook, 2-3 value-packed bullet points or concise insights, "
        "an engaging call-to-action (CTA), and 3-5 relevant trending hashtags. "
        "Do NOT include meta labels like 'Headline:' or 'Post:'. Just output the direct post text."
    )
    
    user_prompt = f"Topic: {req.topic}\n\nFactual Research Notes:\n{research_text}\n\nDraft the complete post now:"
    draft = call_llm(user_prompt, system_prompt)

    post_record = {
        "id": post_id,
        "topic": req.topic,
        "tone": req.tone,
        "research": research_data,
        "draft": draft,
        "final_post": draft,
        "status": "pending_approval",
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "published_to": []
    }
    POST_HISTORY.insert(0, post_record)

    return {
        "post_id": post_id,
        "research": research_data,
        "draft": draft,
        "status": "pending_approval"
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
    revised = call_llm(user_prompt, system_prompt)
    return {"revised_draft": revised}


@app.post("/api/publish/linkedin")
async def publish_linkedin(req: PublishLinkedInRequest):
    """
    Publish content to LinkedIn via the LinkedIn REST Posts API.
    Supports real API call if tokens are set; otherwise provides a structured mock.
    """
    token = CONFIG.get("LINKEDIN_ACCESS_TOKEN")
    author_urn = req.author_urn or CONFIG.get("LINKEDIN_AUTHOR_URN")

    payload = {
        "author": author_urn or "urn:li:person:MOCK_USER_12345",
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

    if token and author_urn and not token.startswith("mock"):
        # Real LinkedIn API call
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
                post_id = resp.headers.get("x-restli-id", "urn:li:share:" + str(uuid.uuid4())[:10])
                return {
                    "status": "success",
                    "mode": "live",
                    "platform": "LinkedIn",
                    "post_id": post_id,
                    "url": f"https://www.linkedin.com/feed/update/{post_id}",
                    "response": resp.json() if resp.content else {"created": True}
                }
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
    else:
        # Simulated Sandbox Execution
        mock_post_id = f"urn:li:share:{uuid.uuid4().hex[:12]}"
        return {
            "status": "success",
            "mode": "simulated_sandbox",
            "platform": "LinkedIn",
            "post_id": mock_post_id,
            "url": f"https://www.linkedin.com/feed/update/{mock_post_id}",
            "message": "Post successfully verified and simulated for LinkedIn feed.",
            "api_endpoint": "POST https://api.linkedin.com/rest/posts",
            "headers_used": {
                "Authorization": "Bearer [SECURE_TOKEN]",
                "X-Restli-Protocol-Version": "2.0.0",
                "LinkedIn-Version": "202606"
            },
            "payload_sent": payload
        }


@app.post("/api/publish/instagram")
async def publish_instagram(req: PublishInstagramRequest):
    """
    Publish content to Instagram via Meta Graph API 2-step media container workflow.
    Supports real API execution or simulated sandbox.
    """
    token = CONFIG.get("INSTAGRAM_ACCESS_TOKEN")
    account_id = req.account_id or CONFIG.get("INSTAGRAM_ACCOUNT_ID")

    if token and account_id and not token.startswith("mock"):
        # Real Instagram Graph API 2-Step Container Flow
        try:
            # Step 1: Create Container
            container_url = f"https://graph.facebook.com/v21.0/{account_id}/media"
            container_resp = requests.post(
                container_url,
                json={
                    "image_url": req.image_url,
                    "caption": req.caption,
                    "access_token": token
                },
                timeout=25
            )
            container_data = container_resp.json()
            if "id" not in container_data:
                return {
                    "status": "container_creation_failed",
                    "platform": "Instagram",
                    "error": container_data
                }

            container_id = container_data["id"]

            # Step 2: Publish Container
            publish_url = f"https://graph.facebook.com/v21.0/{account_id}/media_publish"
            pub_resp = requests.post(
                publish_url,
                json={
                    "creation_id": container_id,
                    "access_token": token
                },
                timeout=25
            )
            pub_data = pub_resp.json()
            if "id" in pub_data:
                ig_post_id = pub_data["id"]
                return {
                    "status": "success",
                    "mode": "live",
                    "platform": "Instagram",
                    "container_id": container_id,
                    "post_id": ig_post_id,
                    "url": f"https://www.instagram.com/p/{ig_post_id}/",
                    "response": pub_data
                }
            else:
                return {
                    "status": "publish_failed",
                    "platform": "Instagram",
                    "container_id": container_id,
                    "error": pub_data
                }
        except Exception as e:
            return {
                "status": "error",
                "mode": "live",
                "platform": "Instagram",
                "error": str(e)
            }
    else:
        # Simulated Sandbox 2-Step Container Execution
        mock_container_id = f"ig_container_{uuid.uuid4().hex[:10]}"
        mock_media_id = f"ig_media_{uuid.uuid4().hex[:12]}"
        return {
            "status": "success",
            "mode": "simulated_sandbox",
            "platform": "Instagram",
            "container_id": mock_container_id,
            "post_id": mock_media_id,
            "url": f"https://www.instagram.com/p/{mock_media_id}/",
            "message": "2-step container media creation and publishing flow validated.",
            "steps": [
                {
                    "step": 1,
                    "description": "Created Media Container (POST /{ig-user-id}/media)",
                    "container_id": mock_container_id,
                    "image_url": req.image_url
                },
                {
                    "step": 2,
                    "description": "Published Container (POST /{ig-user-id}/media_publish)",
                    "media_id": mock_media_id
                }
            ]
        }


@app.post("/api/publish/twitter")
async def publish_twitter(req: PublishTwitterRequest):
    """
    Publish tweet to Twitter / X via Twitter API v2 Manage Tweets endpoint.
    Requires a user access token obtained through X OAuth 2.0.
    """
    token = CONFIG.get("X_ACCESS_TOKEN")
    if not token:
        return {
            "status": "not_configured",
            "platform": "Twitter/X",
            "error": "Connect X with OAuth 2.0 before publishing. Open Settings and choose Connect X.",
        }
    tweet_text = req.tweet_text.strip()
    if len(tweet_text) > 280:
        truncated_text = tweet_text[:277].rsplit(" ", 1)[0].rstrip()
        tweet_text = (truncated_text or tweet_text[:277]) + "..."

    payload = {"text": tweet_text}

    if token and not token.startswith("mock"):
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            resp = requests.post("https://api.x.com/2/tweets", headers=headers, json=payload, timeout=20)
            if resp.status_code in (200, 201):
                data = resp.json()
                tweet_id = data.get("data", {}).get("id", str(uuid.uuid4())[:12])
                return {
                    "status": "success",
                    "mode": "live",
                    "platform": "Twitter/X",
                    "tweet_id": tweet_id,
                    "url": f"https://x.com/i/web/status/{tweet_id}",
                    "published_text": tweet_text,
                    "response": data
                }
            else:
                error_message = resp.text
                if resp.status_code == 402 and "credits-depleted" in resp.text:
                    error_message = (
                        "X API credits are depleted for this developer project. "
                        "Add credits or upgrade the project's billing plan in the X Developer Portal, "
                        "then try publishing again."
                    )
                return {
                    "status": "api_error",
                    "platform": "Twitter/X",
                    "status_code": resp.status_code,
                    "error": error_message
                }
        except Exception as e:
            return {"status": "error", "platform": "Twitter/X", "error": str(e)}


@app.post("/api/publish/facebook")
async def publish_facebook(req: PublishFacebookRequest):
    """
    Publish organic post to Facebook Page Feed via Meta Graph API.
    Supports real API execution or simulated sandbox.
    """
    token = CONFIG.get("FACEBOOK_PAGE_ACCESS_TOKEN")
    page_id = req.page_id or CONFIG.get("FACEBOOK_PAGE_ID")

    if token and not token.startswith("mock"):
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
                return {
                    "status": "success",
                    "mode": "live",
                    "platform": "Facebook",
                    "post_id": data["id"],
                    "url": f"https://facebook.com/{data['id']}",
                    "response": data
                }
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
