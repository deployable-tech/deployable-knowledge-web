/**
 * Deployable Knowledge SDK (browser-only, no Node)
 * - Binds fetch (fixes "Illegal invocation").
 * - Adds auth.beginUser() to prime the user session cookie via /begin.
 *
 * Typical usage:
 *   const API_BASE = `${location.protocol}//${location.hostname}:8000`; // match page host!
 *   const sdk = new DKClient({ baseUrl: API_BASE });
 *   await sdk.auth.beginUser();              // set user session cookie
 *   const { session_id } = await sdk.sessions.ensure(); // now works
 */

export class DKClient {
  /**
   * @param {Object} opts
   * @param {string} opts.baseUrl - e.g., "http://localhost:8000"
   * @param {string} [opts.csrf]  - CSRF token (optional)
   * @param {Function} [opts.fetch] - custom fetch impl (optional)
   */
  constructor({ baseUrl, csrf, fetch: fetchImpl } = {}) {
    if (!baseUrl) throw new Error("DKClient: baseUrl is required");
    this.base = baseUrl.replace(/\/+$/, "");
    this.csrf = csrf || null;

    // Bind fetch to its global owner (avoids "Illegal invocation")
    const root =
      (typeof window !== "undefined" && window) ||
      (typeof self !== "undefined" && self) ||
      globalThis;
    const f = fetchImpl || root.fetch;
    this._fetch = (...args) => f.apply(root, args);

    // ----- NEW: user-session helpers -----
    this.auth = {
      /**
       * Prime the USER session cookie by calling /begin without CORS.
       * Works even if CORS isn't configured yet.
       * Call this once before using API endpoints that rely on the user session.
       */
      beginUser: async () => {
        await this._beacon("/begin"); // set cookies via same-site navigation request
        await this._sleep(120);       // tiny settle time for cookie write
        return true;
      }
    };

    // ----- API wrappers -----
    this.sessions = {
      list:    () => this._json("GET", `/sessions`),
      get:     (sessionId) => this._json("GET", `/sessions/${encodeURIComponent(sessionId)}`),
      ensure:  () => this._json("GET", `/session`),       // returns { session_id }
      create:  () => this._json("POST", `/session`),      // returns { session_id }
      getUser: () => this._json("GET", `/user`)
    };

    this.documents = {
      list: () => this._json("GET", `/documents`)
    };

    this.segments = {
      list:   ({ source } = {}) => this._json("GET", `/segments${this._qs({ source })}`),
      get:    (segId) => this._json("GET", `/segments/${encodeURIComponent(segId)}`),
      remove: (segId) => this._json("DELETE", `/segments/${encodeURIComponent(segId)}`)
    };

    this.chat = {
      send: async (p) => {
        const body = this._form({
          message: p.message,
          session_id: p.sessionId,
          user_id: p.userId,
          service_id: p.serviceId,
          model_id: p.modelId,
          persona: p.persona ?? "",
          template_id: p.templateId ?? "rag_chat",
          top_k: p.topK ?? 8,
          inactive: p.inactive ? JSON.stringify(p.inactive) : undefined
        });
        return this._json("POST", `/chat`, { body, signal: p?.signal, form: true });
      },

      stream: async (p) => {
        const url = `/chat${this._qs({ stream: true })}`;
        const body = this._form({
          message: p.message,
          session_id: p.sessionId,
          user_id: p.userId,
          service_id: p.serviceId,
          model_id: p.modelId,
          persona: p.persona ?? "",
          template_id: p.templateId ?? "rag_chat",
          top_k: p.topK ?? 8,
          inactive: p.inactive ? JSON.stringify(p.inactive) : undefined
        });
        return this._postSSE(url, body, p);
      },

      streamAlways: async (p) => {
        const url = `/chat-stream`;
        const body = this._form({
          message: p.message,
          session_id: p.sessionId,
          user_id: p.userId,
          service_id: p.serviceId,
          model_id: p.modelId,
          persona: p.persona ?? "",
          template_id: p.templateId ?? "rag_chat",
          top_k: p.topK ?? 8,
          inactive: p.inactive ? JSON.stringify(p.inactive) : undefined
        });
        return this._postSSE(url, body, p);
      }
    };

    this.search = {
      run: ({ q, topK = 5, inactive } = {}) =>
        this._json("GET", `/search${this._qs({ q, top_k: topK, inactive: inactive ? JSON.stringify(inactive) : undefined })}`)
    };

    this.ingest = {
      upload: (files) => {
        const fd = new FormData();
        for (const f of Array.from(files)) fd.append("files", f);
        return this._json("POST", `/upload`, { body: fd, multipart: true });
      },
      remove: (source) => {
        const body = this._form({ source });
        return this._json("POST", `/remove`, { body, form: true });
      },
      ingestAll: () => this._json("POST", `/ingest`),
      clearDb:   () => this._json("POST", `/clear_db`)
    };

    this.llm = {
      listServices:   () => this._json("GET", `/api/llm/services`),
      createService:  (svc) => this._json("POST", `/api/llm/services`, { body: JSON.stringify(svc), json: true }),
      updateService:  (sid, patch) => this._json("PUT", `/api/llm/services/${encodeURIComponent(sid)}`, { body: JSON.stringify(patch), json: true }),
      deleteService:  (sid) => this._json("DELETE", `/api/llm/services/${encodeURIComponent(sid)}`),
      listModels:     (service_id) => this._json("GET", `/api/llm/models${this._qs({ service_id })}`),
      createModel:    (m) => this._json("POST", `/api/llm/models`, { body: JSON.stringify(m), json: true }),
      updateModel:    (mid, patch) => this._json("PUT", `/api/llm/models/${encodeURIComponent(mid)}`, { body: JSON.stringify(patch), json: true }),
      deleteModel:    (mid) => this._json("DELETE", `/api/llm/models/${encodeURIComponent(mid)}`),
      getSelection:   () => this._json("GET", `/api/llm/selection`),
      updateSelection:(sel) => {
        const clean = Object.fromEntries(Object.entries(sel).filter(([, v]) => v !== null && v !== undefined));
        return this._json("PUT", `/api/llm/selection`, { body: JSON.stringify(clean), json: true });
      }
    };

    this.settings = {
      get:   (userId) => this._json("GET", `/api/settings/${encodeURIComponent(userId)}`),
      patch: (userId, patch) => this._json("PATCH", `/api/settings/${encodeURIComponent(userId)}`, { body: JSON.stringify(patch), json: true })
    };

    this.templates = {
      list: () => this._json("GET", `/api/prompt-templates`),
      get:  (id) => this._json("GET", `/api/prompt-templates/${encodeURIComponent(id)}`),
      put:  (id, tpl) => this._json("PUT", `/api/prompt-templates/${encodeURIComponent(id)}`, { body: JSON.stringify(tpl), json: true })
    };
  }

  /* -------------------- internals -------------------- */

  _qs(obj = {}) {
    const pairs = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "");
    if (!pairs.length) return "";
    const s = pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
    return `?${s}`;
  }

  _form(obj = {}) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      sp.append(k, String(v));
    }
    return sp;
  }

  async _json(method, path, { body, json, form, multipart, signal } = {}) {
    const headers = {};
    if (this.csrf) headers["X-CSRFToken"] = this.csrf;
    if (json) headers["Content-Type"] = "application/json";
    else if (form) headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";

    const res = await this._fetch(this.base + path, {
      method,
      headers,
      body,
      signal,
      credentials: "include" // send/receive cookies
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new DKHttpError(res.status, res.statusText, text);
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text().catch(() => "");
      return text ? { ok: true, text } : { ok: true };
    }
    return res.json();
  }

  /**
   * POST with text/event-stream response; parse SSE manually.
   */
  async _postSSE(path, body, { onMeta, onToken, onDone, onError, signal } = {}) {
    const headers = { Accept: "text/event-stream" };
    if (this.csrf) headers["X-CSRFToken"] = this.csrf;
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";

    const res = await this._fetch(this.base + path, {
      method: "POST",
      headers,
      body,
      signal,
      credentials: "include"
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      const err = new DKHttpError(res.status || 0, res.statusText || "Stream error", text);
      onError?.(err);
      throw err;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalText = "";
    let finalMeta = undefined;
    let finalSources = undefined;
    let finalUsage = undefined;

    const flush = (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + (buffer[idx] === "\r" ? 4 : 2));
        const evt = this._parseSSE(raw);
        if (!evt) continue;

        const { event, data } = evt;
        if (event === "meta") {
          try { finalMeta = JSON.parse(data); } catch { finalMeta = data; }
          onMeta?.(finalMeta);
        } else if (event === "delta") {
          finalText += data;
          onToken?.(data);
        } else if (event === "done") {
          try {
            const obj = JSON.parse(data);
            finalSources = obj?.sources;
            finalUsage = obj?.usage;
          } catch {}
          onDone?.({ text: finalText, sources: finalSources, usage: finalUsage, meta: finalMeta });
        } else if (event === "error") {
          let errData = data;
          try { errData = JSON.parse(data); } catch {}
          const err = new Error(typeof errData === "string" ? errData : (errData?.error || "stream error"));
          onError?.(err);
        }
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        flush(decoder.decode(value, { stream: true }));
      }
      if (buffer) flush(buffer);
      return { text: finalText, sources: finalSources, usage: finalUsage, meta: finalMeta };
    } catch (e) {
      onError?.(e);
      throw e;
    }
  }

  _parseSSE(block) {
    const lines = block.split(/\r?\n/).filter(Boolean);
    let event = "message";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trim();
    }
    if (!lines.length) return null;
    return { event, data };
  }

  // --- utilities ---

  _beacon(path) {
    // Fire-and-forget GET that still processes Set-Cookie.
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve(true);
      img.src = this.base + path + (path.includes("?") ? "&" : "?") + "_ts=" + Date.now();
    });
  }

  _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
}


export class DKHttpError extends Error {
  constructor(status, statusText, bodyText) {
    super(`HTTP ${status} ${statusText}: ${bodyText?.slice(0, 200) || ""}`);
    this.name = "DKHttpError";
    this.status = status;
    this.statusText = statusText;
    this.bodyText = bodyText;
  }
}

/**
 * Utility helper: ensure there’s an active chat session id.
 * Returns { session_id }
 */
export async function ensureChatSessionId(sdk) {
  const { session_id } = await sdk.sessions.ensure();
  return session_id;
}