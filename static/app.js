document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const topicInput = document.getElementById("topicInput");
  const generateBtn = document.getElementById("generateBtn");
  const genSpinner = document.getElementById("genSpinner");
  const toneSelect = document.getElementById("toneSelect");
  const draftEditor = document.getElementById("draftEditor");
  const charCount = document.getElementById("charCount");
  const wordCount = document.getElementById("wordCount");
  const researchContent = document.getElementById("researchContent");
  const researchStatusBadge = document.getElementById("researchStatusBadge");
  const toggleResearch = document.getElementById("toggleResearch");
  const researchCard = document.getElementById("researchCard");
  
  // Platform Checkboxes
  const checkLinkedin = document.getElementById("checkLinkedin");
  const checkInstagram = document.getElementById("checkInstagram");
  const checkTwitter = document.getElementById("checkTwitter");
  const checkFacebook = document.getElementById("checkFacebook");

  // Platform Mockup Elements - LinkedIn
  const linkedinPreviewText = document.getElementById("linkedinPreviewText");
  const publishLinkedInBtn = document.getElementById("publishLinkedInBtn");
  const linkedinStatusText = document.getElementById("linkedinStatusText");
  const liAvatar = document.getElementById("liAvatar");
  const liAuthorName = document.getElementById("liAuthorName");
  const liAuthorHeadline = document.getElementById("liAuthorHeadline");

  // Platform Mockup Elements - Instagram
  const instagramPreviewText = document.getElementById("instagramPreviewText");
  const igHeadlineText = document.getElementById("igHeadlineText");
  const publishInstagramBtn = document.getElementById("publishInstagramBtn");
  const instagramStatusText = document.getElementById("instagramStatusText");
  const igAvatar = document.getElementById("igAvatar");
  const igAuthorName = document.getElementById("igAuthorName");

  // Platform Mockup Elements - Twitter / X
  const twitterPreviewText = document.getElementById("twitterPreviewText");
  const twCharPill = document.getElementById("twCharPill");
  const publishTwitterBtn = document.getElementById("publishTwitterBtn");
  const twitterStatusText = document.getElementById("twitterStatusText");
  const twAvatar = document.getElementById("twAvatar");
  const twAuthorName = document.getElementById("twAuthorName");
  const twAuthorHandle = document.getElementById("twAuthorHandle");

  // Platform Mockup Elements - Facebook
  const facebookPreviewText = document.getElementById("facebookPreviewText");
  const fbLinkHeadline = document.getElementById("fbLinkHeadline");
  const publishFacebookBtn = document.getElementById("publishFacebookBtn");
  const facebookStatusText = document.getElementById("facebookStatusText");
  const fbAvatar = document.getElementById("fbAvatar");
  const fbAuthorName = document.getElementById("fbAuthorName");

  // Approval Gate Buttons
  const approveAndPublishBtn = document.getElementById("approveAndPublishBtn");
  const approveOnlyBtn = document.getElementById("approveOnlyBtn");
  const copyBtn = document.getElementById("copyBtn");
  const rejectBtn = document.getElementById("rejectBtn");

  // Tab & Logs Elements
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const logsTerminal = document.getElementById("logsTerminal");
  const clearLogsBtn = document.getElementById("clearLogsBtn");
  const toast = document.getElementById("toast");

  // Status Pills
  const tavilyChip = document.getElementById("tavilyChip");
  const openrouterChip = document.getElementById("openrouterChip");
  const linkedinChip = document.getElementById("linkedinChip");
  const instaChip = document.getElementById("instaChip");
  const twitterChip = document.getElementById("twitterChip");
  const facebookChip = document.getElementById("facebookChip");

  // Stepper Elements
  const stepNodes = [
    document.getElementById("step1"),
    document.getElementById("step2"),
    document.getElementById("step3"),
    document.getElementById("step4"),
    document.getElementById("step5")
  ];

  // Settings Modal Elements
  const settingsModal = document.getElementById("settingsModal");
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const cfgUserName = document.getElementById("cfgUserName");
  const cfgUserHeadline = document.getElementById("cfgUserHeadline");
  const cfgInstagramHandle = document.getElementById("cfgInstagramHandle");
  const cfgTwitterHandle = document.getElementById("cfgTwitterHandle");
  const cfgFacebookPageName = document.getElementById("cfgFacebookPageName");
  const cfgOpenRouterKey = document.getElementById("cfgOpenRouterKey");
  const cfgTavilyKey = document.getElementById("cfgTavilyKey");
  const cfgLinkedInToken = document.getElementById("cfgLinkedInToken");
  const cfgLinkedInUrn = document.getElementById("cfgLinkedInUrn");
  const cfgInstagramToken = document.getElementById("cfgInstagramToken");
  const cfgInstagramAccount = document.getElementById("cfgInstagramAccount");
  const cfgTwitterToken = document.getElementById("cfgTwitterToken");
  const cfgTwitterApiKey = document.getElementById("cfgTwitterApiKey");
  const cfgXClientId = document.getElementById("cfgXClientId");
  const cfgXClientSecret = document.getElementById("cfgXClientSecret");
  const cfgXRedirectUri = document.getElementById("cfgXRedirectUri");
  const connectXBtn = document.getElementById("connectXBtn");
  const xOAuthStatus = document.getElementById("xOAuthStatus");
  const cfgFacebookToken = document.getElementById("cfgFacebookToken");
  const cfgFacebookPageId = document.getElementById("cfgFacebookPageId");

  // Profile State
  const profile = {
    name: localStorage.getItem("cp_user_name") || "Himanshu",
    headline: localStorage.getItem("cp_user_headline") || "AI Engineer & Tech Strategist",
    handle: localStorage.getItem("cp_ig_handle") || "himanshu_ai",
    twHandle: localStorage.getItem("cp_tw_handle") || "@himanshu_ai",
    fbPageName: localStorage.getItem("cp_fb_page_name") || "TechPulse AI"
  };

  function applyProfile() {
    if (liAuthorName) liAuthorName.textContent = profile.name;
    if (liAuthorHeadline) liAuthorHeadline.textContent = profile.headline;
    if (igAuthorName) igAuthorName.textContent = profile.handle;
    if (twAuthorName) twAuthorName.textContent = profile.name;
    if (twAuthorHandle) twAuthorHandle.textContent = profile.twHandle.startsWith("@") ? profile.twHandle : `@${profile.twHandle}`;
    if (fbAuthorName) fbAuthorName.textContent = profile.fbPageName;

    const initials = profile.name.trim().split(/\s+/).map(p => p[0]).join("").toUpperCase().slice(0, 2) || "U";
    const fbInitials = profile.fbPageName.trim().split(/\s+/).map(p => p[0]).join("").toUpperCase().slice(0, 2) || "T";
    if (liAvatar) liAvatar.textContent = initials;
    if (igAvatar) igAvatar.textContent = initials;
    if (twAvatar) twAvatar.textContent = initials;
    if (fbAvatar) fbAvatar.textContent = fbInitials;

    if (cfgUserName) cfgUserName.value = profile.name;
    if (cfgUserHeadline) cfgUserHeadline.value = profile.headline;
    if (cfgInstagramHandle) cfgInstagramHandle.value = profile.handle;
    if (cfgTwitterHandle) cfgTwitterHandle.value = profile.twHandle;
    if (cfgFacebookPageName) cfgFacebookPageName.value = profile.fbPageName;
  }

  // Initial State
  let currentPostId = null;
  let isResearchExpanded = true;

  // Logging Helper
  function addLog(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement("div");
    line.className = `log-line log-${type}`;
    line.textContent = `[${timestamp}] ${message}`;
    logsTerminal.appendChild(line);
    logsTerminal.scrollTop = logsTerminal.scrollHeight;
  }

  // Toast Helper
  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3200);
  }

  // Stepper Update
  function setStepper(stepIndex) {
    stepNodes.forEach((node, idx) => {
      node.classList.remove("active", "completed");
      if (idx < stepIndex) {
        node.classList.add("completed");
      } else if (idx === stepIndex) {
        node.classList.add("active");
      }
    });
  }

  // Fetch Server Config
  async function loadConfig() {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      
      updateChip(tavilyChip, data.TAVILY_CONFIGURED);
      updateChip(openrouterChip, data.OPENROUTER_CONFIGURED);
      updateChip(linkedinChip, data.LINKEDIN_CONFIGURED);
      updateChip(instaChip, data.INSTAGRAM_CONFIGURED);
      updateChip(twitterChip, data.TWITTER_CONFIGURED);
      updateChip(facebookChip, data.FACEBOOK_CONFIGURED);

      if (data.LINKEDIN_AUTHOR_URN && cfgLinkedInUrn) cfgLinkedInUrn.value = data.LINKEDIN_AUTHOR_URN;
      if (data.INSTAGRAM_ACCOUNT_ID && cfgInstagramAccount) cfgInstagramAccount.value = data.INSTAGRAM_ACCOUNT_ID;
      if (data.FACEBOOK_PAGE_ID && cfgFacebookPageId) cfgFacebookPageId.value = data.FACEBOOK_PAGE_ID;
      if (data.X_REDIRECT_URI && cfgXRedirectUri) cfgXRedirectUri.value = data.X_REDIRECT_URI;
      if (xOAuthStatus) {
        xOAuthStatus.textContent = data.TWITTER_CONFIGURED
          ? "X is connected for live publishing."
          : data.X_OAUTH_CONFIGURED
            ? "Credentials saved. Connect your X account to authorize posting."
            : "Save the client credentials first, then connect your X account.";
      }
      
      addLog(`Status: Tavily [${data.TAVILY_CONFIGURED ? 'CONNECTED' : 'MOCK'}], OpenRouter [${data.OPENROUTER_CONFIGURED ? 'CONNECTED' : 'MOCK'}], LinkedIn [${data.LINKEDIN_CONFIGURED ? 'READY' : 'SANDBOX'}], Instagram [${data.INSTAGRAM_CONFIGURED ? 'READY' : 'SANDBOX'}], Twitter/X [${data.TWITTER_CONFIGURED ? 'READY' : 'SANDBOX'}], Facebook [${data.FACEBOOK_CONFIGURED ? 'READY' : 'SANDBOX'}]`);
    } catch (err) {
      addLog(`Failed to fetch backend configuration: ${err.message}`, "error");
    }
  }

  function updateChip(el, active) {
    if (!el) return;
    if (active) {
      el.classList.remove("chip-inactive");
      el.classList.add("chip-active");
    } else {
      el.classList.add("chip-inactive");
      el.classList.remove("chip-active");
    }
  }

  // Text Counter & Synchronized Preview
  function updateTextStatsAndPreview() {
    const text = draftEditor.value;
    charCount.textContent = text.length;
    wordCount.textContent = text.trim() ? text.trim().split(/\s+/).length : 0;

    // Update LinkedIn Mockup
    if (linkedinPreviewText) {
      linkedinPreviewText.textContent = text || "Your approved post will appear here...";
    }

    // Update Instagram Mockup
    if (instagramPreviewText) {
      instagramPreviewText.innerHTML = `<span class="caption-user">${escapeHtml(profile.handle)}</span> ${escapeHtml(text) || "Your approved caption..."}`;
    }

    // Update dynamic headline on Instagram graphic
    const firstLine = text.split("\n")[0] || topicInput.value || "Social Media Trends";
    const cleanHeadline = firstLine.replace(/^[^a-zA-Z0-9]+/, "").slice(0, 36);
    if (igHeadlineText) {
      igHeadlineText.textContent = cleanHeadline;
    }

    // Update Twitter / X Mockup
    if (twitterPreviewText) {
      twitterPreviewText.textContent = text || "Drafting your high-impact tweet...";
    }
    if (twCharPill) {
      const remaining = 280 - text.length;
      twCharPill.textContent = remaining;
      if (remaining < 0) {
        twCharPill.classList.add("warning");
      } else {
        twCharPill.classList.remove("warning");
      }
    }

    // Update Facebook Mockup
    if (facebookPreviewText) {
      facebookPreviewText.textContent = text || "Crafting engaging Facebook update...";
    }
    if (fbLinkHeadline) {
      fbLinkHeadline.textContent = cleanHeadline || "Insights & Innovations";
    }
  }

  function escapeHtml(string) {
    return String(string)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatApiError(error) {
    if (!error) return "Failed";
    if (typeof error === "string") return error;
    if (error.message) {
      const metaError = error.meta_error?.error;
      if (metaError?.message) return `${error.message} (${metaError.message})`;
      return error.message;
    }
    if (error.error?.message) return error.error.message;
    return JSON.stringify(error);
  }

  draftEditor.addEventListener("input", updateTextStatsAndPreview);

  // Preset Topics
  document.querySelectorAll(".preset-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      topicInput.value = btn.getAttribute("data-topic");
      topicInput.focus();
    });
  });

  // AI Generation Trigger
  generateBtn.addEventListener("click", async () => {
    const topic = topicInput.value.trim();
    if (!topic) {
      showToast("Please enter a topic or content idea.");
      return;
    }

    generateBtn.disabled = true;
    genSpinner.classList.remove("hidden");
    setStepper(1); // Research step
    addLog(`Initiating Tavily web research for topic: "${topic}"...`);
    researchStatusBadge.textContent = "Researching...";

    try {
      setStepper(2); // AI Copywriting step
      addLog("Passing extracted research facts to OpenRouter Copywriter Agent...");

      const activePlatforms = [];
      if (checkLinkedin && checkLinkedin.checked) activePlatforms.push("linkedin");
      if (checkInstagram && checkInstagram.checked) activePlatforms.push("instagram");
      if (checkTwitter && checkTwitter.checked) activePlatforms.push("twitter");
      if (checkFacebook && checkFacebook.checked) activePlatforms.push("facebook");

      const response = await fetch("/api/pipeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic,
          tone: toneSelect.value,
          target_platforms: activePlatforms.length ? activePlatforms : ["linkedin", "instagram", "twitter", "facebook"]
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      currentPostId = data.post_id;

      // Render Research Intel
      renderResearch(data.research);
      researchStatusBadge.textContent = "Verified";

      // Render AI Draft
      draftEditor.value = data.draft;
      updateTextStatsAndPreview();

      setStepper(3); // Human Gate step
      addLog(`Generated draft successfully (ID: ${currentPostId}). Awaiting human approval gate.`, "success");
      showToast("Draft ready for review!");

    } catch (err) {
      addLog(`Pipeline generation failed: ${err.message}`, "error");
      showToast("Failed to generate draft. Check log.");
    } finally {
      generateBtn.disabled = false;
      genSpinner.classList.add("hidden");
    }
  });

  function renderResearch(research) {
    if (!research) return;
    let html = "";
    if (research.answer) {
      html += `<div style="margin-bottom:8px;"><strong style="color:#38bdf8;">Key Takeaway:</strong> ${escapeHtml(research.answer)}</div>`;
    }
    if (research.results && research.results.length > 0) {
      research.results.forEach(item => {
        html += `
          <div class="research-result-item">
            <span class="research-title">${escapeHtml(item.title)}</span>
            <div>${escapeHtml(item.snippet)}</div>
            ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" class="research-link">${item.url}</a>` : ''}
          </div>
        `;
      });
    }
    researchContent.innerHTML = html || "<p>No research details found.</p>";
  }

  // Refine Buttons
  document.querySelectorAll(".refine-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const instruction = btn.getAttribute("data-action");
      const currentDraft = draftEditor.value.trim();
      if (!currentDraft) {
        showToast("No content to refine yet.");
        return;
      }

      btn.disabled = true;
      addLog(`Applying AI refinement: "${instruction}"...`);

      try {
        const res = await fetch("/api/pipeline/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_draft: currentDraft,
            instruction: instruction,
            topic: topicInput.value
          })
        });
        const data = await res.json();
        draftEditor.value = data.revised_draft;
        updateTextStatsAndPreview();
        addLog("Refinement applied successfully.", "success");
        showToast("Draft updated!");
      } catch (err) {
        addLog(`Refinement error: ${err.message}`, "error");
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Approval Gate: Approve & One-Click Publish
  approveAndPublishBtn.addEventListener("click", async () => {
    const content = draftEditor.value.trim();
    if (!content) {
      showToast("No draft to publish.");
      return;
    }

    setStepper(4); // Publishing step
    addLog(`[APPROVAL GATE] Human approved draft for multi-channel publishing.`, "success");
    
    // Check which channels are selected
    const shouldLinkedin = checkLinkedin && checkLinkedin.checked;
    const shouldInsta = checkInstagram && checkInstagram.checked;
    const shouldTwitter = checkTwitter && checkTwitter.checked;
    const shouldFacebook = checkFacebook && checkFacebook.checked;

    const publishTasks = [];
    if (shouldLinkedin) publishTasks.push(publishToLinkedIn());
    if (shouldInsta) publishTasks.push(publishToInstagram());
    if (shouldTwitter) publishTasks.push(publishToTwitter());
    if (shouldFacebook) publishTasks.push(publishToFacebook());

    if (publishTasks.length === 0) {
      showToast("Please select at least one channel to publish.");
      return;
    }

    await Promise.all(publishTasks);
    showToast("Publishing sequence executed across selected channels!");
  });

  // Approval Gate: Approve Only
  approveOnlyBtn.addEventListener("click", () => {
    if (!draftEditor.value.trim()) {
      showToast("No draft to approve.");
      return;
    }
    setStepper(3);
    addLog("[APPROVAL GATE] Draft approved and marked ready for schedule/manual dispatch.", "success");
    showToast("Draft approved!");
  });

  // Approval Gate: Copy
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(draftEditor.value);
    showToast("Copied to clipboard!");
    addLog("Post text copied to clipboard.");
  });

  // Approval Gate: Reject
  rejectBtn.addEventListener("click", () => {
    draftEditor.value = "";
    updateTextStatsAndPreview();
    setStepper(0);
    addLog("[APPROVAL GATE] Draft rejected by reviewer. Workspace reset.", "warning");
    showToast("Draft rejected. Ready for new topic.");
  });

  // Direct Publish: LinkedIn
  async function publishToLinkedIn() {
    if (!publishLinkedInBtn) return;
    publishLinkedInBtn.disabled = true;
    linkedinStatusText.textContent = "Publishing to LinkedIn REST Posts API...";
    addLog("Dispatching POST request to LinkedIn API endpoint (/rest/posts)...");

    try {
      const res = await fetch("/api/publish/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: currentPostId,
          content: draftEditor.value
        })
      });
      const data = await res.json();
      
      if (data.status === "success") {
        linkedinStatusText.textContent = `Published: ${data.post_id} (${data.mode})`;
        addLog(`[LINKEDIN SUCCESS] Post ID: ${data.post_id} | Mode: ${data.mode}`, "success");
        if (data.payload_sent) {
          addLog(`LinkedIn Payload: ${JSON.stringify(data.payload_sent)}`);
        }
      } else {
        linkedinStatusText.textContent = `Error: ${formatApiError(data.error)}`;
        addLog(`[LINKEDIN ERROR] ${JSON.stringify(data)}`, "error");
      }
    } catch (err) {
      linkedinStatusText.textContent = "Network Error";
      addLog(`LinkedIn publish exception: ${err.message}`, "error");
    } finally {
      publishLinkedInBtn.disabled = false;
    }
  }
  if (publishLinkedInBtn) publishLinkedInBtn.addEventListener("click", publishToLinkedIn);

  // Direct Publish: Instagram
  async function publishToInstagram() {
    if (!publishInstagramBtn) return;
    publishInstagramBtn.disabled = true;
    instagramStatusText.textContent = "Executing 2-Step Meta Container Workflow...";
    addLog("Step 1: Creating Instagram Media Container (/media)...");

    try {
      const res = await fetch("/api/publish/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: currentPostId,
          caption: draftEditor.value
        })
      });
      const data = await res.json();
      
      if (data.status === "success") {
        instagramStatusText.textContent = `Published: ${data.post_id} (${data.mode})`;
        addLog(`[INSTAGRAM SUCCESS] Container: ${data.container_id} -> Live Media: ${data.post_id}`, "success");
      } else {
        instagramStatusText.textContent = `Error: ${formatApiError(data.error)}`;
        addLog(`[INSTAGRAM ERROR] ${JSON.stringify(data)}`, "error");
      }
    } catch (err) {
      instagramStatusText.textContent = "Network Error";
      addLog(`Instagram publish exception: ${err.message}`, "error");
    } finally {
      publishInstagramBtn.disabled = false;
    }
  }
  if (publishInstagramBtn) publishInstagramBtn.addEventListener("click", publishToInstagram);

  // Direct Publish: Twitter / X
  async function publishToTwitter() {
    if (!publishTwitterBtn) return;
    publishTwitterBtn.disabled = true;
    twitterStatusText.textContent = "Publishing to Twitter / X API v2...";
    addLog("Dispatching POST request to Twitter API v2 endpoint (/2/tweets)...");

    try {
      const res = await fetch("/api/publish/twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: currentPostId,
          tweet_text: draftEditor.value
        })
      });
      const data = await res.json();
      
      if (data.status === "success") {
        twitterStatusText.textContent = `Published: ${data.tweet_id} (${data.mode})`;
        addLog(`[TWITTER/X SUCCESS] Tweet ID: ${data.tweet_id} | URL: ${data.url} (${data.mode})`, "success");
        if (data.payload_sent) {
          addLog(`Twitter Payload: ${JSON.stringify(data.payload_sent)}`);
        }
      } else {
        twitterStatusText.textContent = `Error: ${formatApiError(data.error)}`;
        addLog(`[TWITTER/X ERROR] ${JSON.stringify(data)}`, "error");
        if (data.status_code === 402) {
          showToast("X API credits are depleted. Update billing in the X Developer Portal.");
        }
      }
    } catch (err) {
      twitterStatusText.textContent = "Network Error";
      addLog(`Twitter / X publish exception: ${err.message}`, "error");
    } finally {
      publishTwitterBtn.disabled = false;
    }
  }
  if (publishTwitterBtn) publishTwitterBtn.addEventListener("click", publishToTwitter);

  // Direct Publish: Facebook
  async function publishFacebook() {
    if (!publishFacebookBtn) return;
    publishFacebookBtn.disabled = true;
    facebookStatusText.textContent = "Publishing to Facebook Page Feed...";
    addLog("Dispatching POST request to Meta Graph API Facebook Page Feed endpoint...");

    try {
      const res = await fetch("/api/publish/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: currentPostId,
          message: draftEditor.value
        })
      });
      const data = await res.json();
      
      if (data.status === "success") {
        facebookStatusText.textContent = `Published: ${data.post_id} (${data.mode})`;
        addLog(`[FACEBOOK SUCCESS] Post ID: ${data.post_id} | URL: ${data.url} (${data.mode})`, "success");
        if (data.payload_sent) {
          addLog(`Facebook Payload: ${JSON.stringify(data.payload_sent)}`);
        }
      } else {
        facebookStatusText.textContent = `Error: ${formatApiError(data.error)}`;
        addLog(`[FACEBOOK ERROR] ${JSON.stringify(data)}`, "error");
      }
    } catch (err) {
      facebookStatusText.textContent = "Network Error";
      addLog(`Facebook publish exception: ${err.message}`, "error");
    } finally {
      publishFacebookBtn.disabled = false;
    }
  }
  if (publishFacebookBtn) publishFacebookBtn.addEventListener("click", publishFacebook);

  // Platform Tabs Switcher
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const tabName = btn.getAttribute("data-tab");
      const targetId = tabName === "linkedin" ? "tabLinkedin" : 
                       tabName === "instagram" ? "tabInstagram" : 
                       tabName === "twitter" ? "tabTwitter" : 
                       tabName === "facebook" ? "tabFacebook" : "tabActivity";
      const targetElem = document.getElementById(targetId);
      if (targetElem) targetElem.classList.add("active");
    });
  });

  // Clear Logs
  clearLogsBtn.addEventListener("click", () => {
    logsTerminal.innerHTML = '<div class="log-line log-info">Logs cleared.</div>';
  });

  // Settings Modal Handlers
  openSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.remove("hidden");
  });
  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });
  cancelSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });

  saveSettingsBtn.addEventListener("click", async () => {
    // Save Profile Brand Settings
    if (cfgUserName && cfgUserName.value.trim()) {
      profile.name = cfgUserName.value.trim();
      localStorage.setItem("cp_user_name", profile.name);
    }
    if (cfgUserHeadline && cfgUserHeadline.value.trim()) {
      profile.headline = cfgUserHeadline.value.trim();
      localStorage.setItem("cp_user_headline", profile.headline);
    }
    if (cfgInstagramHandle && cfgInstagramHandle.value.trim()) {
      profile.handle = cfgInstagramHandle.value.trim();
      localStorage.setItem("cp_ig_handle", profile.handle);
    }
    if (cfgTwitterHandle && cfgTwitterHandle.value.trim()) {
      profile.twHandle = cfgTwitterHandle.value.trim();
      localStorage.setItem("cp_tw_handle", profile.twHandle);
    }
    if (cfgFacebookPageName && cfgFacebookPageName.value.trim()) {
      profile.fbPageName = cfgFacebookPageName.value.trim();
      localStorage.setItem("cp_fb_page_name", profile.fbPageName);
    }
    applyProfile();
    updateTextStatsAndPreview();

    const payload = {
      OPENROUTER_API_KEY: cfgOpenRouterKey.value || undefined,
      TAVILY_API_KEY: cfgTavilyKey.value || undefined,
      LINKEDIN_ACCESS_TOKEN: cfgLinkedInToken.value || undefined,
      LINKEDIN_AUTHOR_URN: cfgLinkedInUrn.value || undefined,
      INSTAGRAM_ACCESS_TOKEN: cfgInstagramToken.value || undefined,
      INSTAGRAM_ACCOUNT_ID: cfgInstagramAccount.value || undefined,
      TWITTER_BEARER_TOKEN: cfgTwitterToken ? (cfgTwitterToken.value || undefined) : undefined,
      TWITTER_API_KEY: cfgTwitterApiKey ? (cfgTwitterApiKey.value || undefined) : undefined,
      X_CLIENT_ID: cfgXClientId ? (cfgXClientId.value || undefined) : undefined,
      X_CLIENT_SECRET: cfgXClientSecret ? (cfgXClientSecret.value || undefined) : undefined,
      X_REDIRECT_URI: cfgXRedirectUri ? (cfgXRedirectUri.value || undefined) : undefined,
      FACEBOOK_PAGE_ACCESS_TOKEN: cfgFacebookToken ? (cfgFacebookToken.value || undefined) : undefined,
      FACEBOOK_PAGE_ID: cfgFacebookPageId ? (cfgFacebookPageId.value || undefined) : undefined,
    };

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      showToast("Profile & Configuration saved!");
      addLog("Profile details and API credentials updated across LinkedIn, Instagram, Twitter / X, and Facebook.", "success");
      settingsModal.classList.add("hidden");
      loadConfig();
    } catch (err) {
      showToast("Failed to save credentials.");
    }
  });

  if (connectXBtn) {
    connectXBtn.addEventListener("click", () => {
      window.location.href = "/api/x/oauth/start";
    });
  }

  // Research Toggle
  toggleResearch.addEventListener("click", () => {
    isResearchExpanded = !isResearchExpanded;
    researchContent.style.display = isResearchExpanded ? "block" : "none";
  });

  // Initialize
  applyProfile();
  loadConfig();
  updateTextStatsAndPreview();
});
