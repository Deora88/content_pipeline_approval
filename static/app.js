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
  const checkFacebook = document.getElementById("checkFacebook");

  // Platform Mockup Elements - LinkedIn
  const linkedinPreviewText = document.getElementById("linkedinPreviewText");
  const publishLinkedInBtn = document.getElementById("publishLinkedInBtn");
  const linkedinStatusText = document.getElementById("linkedinStatusText");
  const liAvatar = document.getElementById("liAvatar");
  const liAuthorName = document.getElementById("liAuthorName");
  const liAuthorHeadline = document.getElementById("liAuthorHeadline");

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
  const cfgFacebookPageName = document.getElementById("cfgFacebookPageName");
  const cfgOpenRouterKey = document.getElementById("cfgOpenRouterKey");
  const cfgTavilyKey = document.getElementById("cfgTavilyKey");
  const cfgLinkedInToken = document.getElementById("cfgLinkedInToken");
  const cfgLinkedInUrn = document.getElementById("cfgLinkedInUrn");
  const cfgFacebookToken = document.getElementById("cfgFacebookToken");
  const cfgFacebookPageId = document.getElementById("cfgFacebookPageId");

  // Profile State
  const profile = {
    name: localStorage.getItem("cp_user_name") || "Himanshu",
    headline: localStorage.getItem("cp_user_headline") || "AI Engineer & Tech Strategist",
    fbPageName: localStorage.getItem("cp_fb_page_name") || "TechPulse AI"
  };

  function applyProfile() {
    if (liAuthorName) liAuthorName.textContent = profile.name;
    if (liAuthorHeadline) liAuthorHeadline.textContent = profile.headline;
    if (fbAuthorName) fbAuthorName.textContent = profile.fbPageName;

    const initials = profile.name.trim().split(/\s+/).map(p => p[0]).join("").toUpperCase().slice(0, 2) || "U";
    const fbInitials = profile.fbPageName.trim().split(/\s+/).map(p => p[0]).join("").toUpperCase().slice(0, 2) || "T";
    if (liAvatar) liAvatar.textContent = initials;
    if (fbAvatar) fbAvatar.textContent = fbInitials;

    if (cfgUserName) cfgUserName.value = profile.name;
    if (cfgUserHeadline) cfgUserHeadline.value = profile.headline;
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
      updateChip(facebookChip, data.FACEBOOK_CONFIGURED);

      if (data.LINKEDIN_AUTHOR_URN && cfgLinkedInUrn) cfgLinkedInUrn.value = data.LINKEDIN_AUTHOR_URN;
      if (data.FACEBOOK_PAGE_ID && cfgFacebookPageId) cfgFacebookPageId.value = data.FACEBOOK_PAGE_ID;

      addLog(`Status: Tavily [${data.TAVILY_CONFIGURED ? 'CONNECTED' : 'NOT CONFIGURED'}], OpenRouter [${data.OPENROUTER_CONFIGURED ? 'CONNECTED' : 'NOT CONFIGURED'}], LinkedIn [${data.LINKEDIN_CONFIGURED ? 'READY' : 'NOT CONFIGURED'}], Facebook [${data.FACEBOOK_CONFIGURED ? 'READY' : 'NOT CONFIGURED'}]`);
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

    const firstLine = text.split("\n")[0] || topicInput.value || "Social Media Trends";
    const cleanHeadline = firstLine.replace(/^[^a-zA-Z0-9]+/, "").slice(0, 36);

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
      if (checkFacebook && checkFacebook.checked) activePlatforms.push("facebook");

      const response = await fetch("/api/pipeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic,
          tone: toneSelect.value,
          target_platforms: activePlatforms.length ? activePlatforms : ["linkedin", "facebook"]
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
      if (data.research && data.research.research_failed) {
        researchStatusBadge.textContent = data.research.not_configured ? "Not configured" : "Research failed";
        addLog(
          data.research.not_configured
            ? "TAVILY_API_KEY not configured — no live research was performed. The draft is not grounded in real research."
            : `Tavily research failed: ${data.research.error || "unknown error"}. The draft is not grounded in real research.`,
          "warning"
        );
      } else {
        researchStatusBadge.textContent = "Verified";
      }

      // Render AI Draft
      draftEditor.value = data.draft;
      updateTextStatsAndPreview();
      setFallbackWarning(!!data.is_fallback);

      setStepper(3); // Human Gate step
      if (data.is_fallback) {
        addLog(`Draft generation used a fallback template (AI unavailable). Review carefully before approving.`, "warning");
        showToast("⚠️ AI unavailable — placeholder draft generated.");
      } else {
        addLog(`Generated draft successfully (ID: ${currentPostId}). Awaiting human approval gate.`, "success");
        showToast("Draft ready for review!");
      }

    } catch (err) {
      addLog(`Pipeline generation failed: ${err.message}`, "error");
      showToast("Failed to generate draft. Check log.");
    } finally {
      generateBtn.disabled = false;
      genSpinner.classList.add("hidden");
    }
  });

  // Inserts (or toggles) a visible warning banner above the draft editor when
  // the draft is a generic fallback template rather than a real AI response —
  // this must never look like an ordinary draft to the reviewer.
  function setFallbackWarning(isFallback) {
    let banner = document.getElementById("fallbackWarningBanner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "fallbackWarningBanner";
      banner.style.cssText = "display:none;background:#7c2d12;color:#fff;padding:8px 12px;border-radius:6px;margin-bottom:8px;font-weight:600;";
      banner.textContent = "⚠️ AI generation unavailable — this is placeholder text, not a real draft for your topic. Do not approve as-is.";
      draftEditor.parentNode.insertBefore(banner, draftEditor);
    }
    banner.style.display = isFallback ? "block" : "none";
  }

  function renderResearch(research) {
    if (!research) return;
    if (research.research_failed) {
      researchContent.innerHTML = research.not_configured
        ? `<p style="color:#f59e0b;">⚠️ No live research — TAVILY_API_KEY is not configured. This draft is not grounded in real research.</p>`
        : `<p style="color:#f59e0b;">⚠️ Research unavailable (${escapeHtml(research.error || "unknown error")}). This draft is not grounded in real research.</p>`;
      return;
    }
    let html = "";
    if (research.answer) {
      html += `<div style="margin-bottom:8px;"><strong style="color:#38bdf8;">Key Takeaway:</strong> ${escapeHtml(research.answer)}</div>`;
    }
    if (research.results && research.results.length > 0) {
      research.results.forEach(item => {
        // Only allow http(s) links — blocks javascript: and other unsafe schemes.
        const safeUrl = item.url && /^https?:\/\//i.test(item.url) ? item.url : null;
        html += `
          <div class="research-result-item">
            <span class="research-title">${escapeHtml(item.title)}</span>
            <div>${escapeHtml(item.snippet)}</div>
            ${safeUrl ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener" class="research-link">${escapeHtml(safeUrl)}</a>` : ''}
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
        if (!res.ok || !data.revised_draft) {
          addLog(`Refinement error: ${data.detail || "unknown error"}`, "error");
          showToast("Refinement failed — your draft was not changed.");
          return;
        }
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
    const shouldFacebook = checkFacebook && checkFacebook.checked;

    const publishTasks = [];
    if (shouldLinkedin) publishTasks.push(publishToLinkedIn());
    if (shouldFacebook) publishTasks.push(publishToFacebook());

    if (publishTasks.length === 0) {
      showToast("Please select at least one channel to publish.");
      return;
    }

    const results = await Promise.all(publishTasks);
    const succeeded = results.filter(r => r && r.ok);
    const failed = results.filter(r => r && !r.ok);

    if (failed.length === 0 && succeeded.length > 0) {
      showToast(`Published to ${succeeded.length} channel(s)!`);
    } else if (succeeded.length > 0 && failed.length > 0) {
      showToast(`${succeeded.length} channel(s) succeeded, ${failed.length} failed — check the log.`);
    } else {
      showToast("Publishing failed on all selected channels — check the log.");
    }
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
    setFallbackWarning(false);
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
        linkedinStatusText.textContent = `Published: ${data.post_id}`;
        addLog(`[LINKEDIN SUCCESS] Post ID: ${data.post_id}`, "success");
        if (data.payload_sent) {
          addLog(`LinkedIn Payload: ${JSON.stringify(data.payload_sent)}`);
        }
        return { platform: "LinkedIn", ok: true };
      } else {
        linkedinStatusText.textContent = `Error: ${formatApiError(data.error)}`;
        addLog(`[LINKEDIN ERROR] ${JSON.stringify(data)}`, "error");
        return { platform: "LinkedIn", ok: false };
      }
    } catch (err) {
      linkedinStatusText.textContent = "Network Error";
      addLog(`LinkedIn publish exception: ${err.message}`, "error");
      return { platform: "LinkedIn", ok: false };
    } finally {
      publishLinkedInBtn.disabled = false;
    }
  }
  if (publishLinkedInBtn) publishLinkedInBtn.addEventListener("click", publishToLinkedIn);

  // Direct Publish: Facebook
  async function publishToFacebook() {
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
        facebookStatusText.textContent = `Published: ${data.post_id}`;
        addLog(`[FACEBOOK SUCCESS] Post ID: ${data.post_id}${data.url ? ` | URL: ${data.url}` : ""}`, "success");
        if (data.payload_sent) {
          addLog(`Facebook Payload: ${JSON.stringify(data.payload_sent)}`);
        }
        return { platform: "Facebook", ok: true };
      } else {
        facebookStatusText.textContent = `Error: ${formatApiError(data.error)}`;
        addLog(`[FACEBOOK ERROR] ${JSON.stringify(data)}`, "error");
        return { platform: "Facebook", ok: false };
      }
    } catch (err) {
      facebookStatusText.textContent = "Network Error";
      addLog(`Facebook publish exception: ${err.message}`, "error");
      return { platform: "Facebook", ok: false };
    } finally {
      publishFacebookBtn.disabled = false;
    }
  }
  if (publishFacebookBtn) publishFacebookBtn.addEventListener("click", publishToFacebook);

  // Platform Tabs Switcher
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const tabName = btn.getAttribute("data-tab");
      const targetId = tabName === "linkedin" ? "tabLinkedin" : 
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
      addLog("Profile details and API credentials updated across LinkedIn and Facebook.", "success");
      settingsModal.classList.add("hidden");
      loadConfig();
    } catch (err) {
      showToast("Failed to save credentials.");
    }
  });

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
