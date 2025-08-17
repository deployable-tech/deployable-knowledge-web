/**
 * Deployable Knowledge SDK
 * Minimal, dependency-free client for the app API.
 *
 * Usage:
 *   const sdk = new DKClient({ baseUrl: "http://localhost:8000" });
 *   const { session_id } = await sdk.getOrCreateSession();
 *   const res = await sdk.chat.send({ sessionId: session_id, message: "Hello" });
 */

export class DKClient {
  /**
   * @param {Object} opts
   * @param {string} opts.baseUrl - e.g., "http://localhost:8000"
   * @param {string} [opts.csrf]   - CSRF token (optional)
   * @param {Function} [opts.fetch] - custom fetch impl (optional)
   */
  constructor({ baseUrl, csrf, fetch: fetchImpl } = {}) {
    if (!baseUrl) throw new Error("DKClient: baseUrl is required");
    this.base = baseUrl.replace(/\/+$/, "");
    this.csrf = csrf || null;
    this._fetch = fetchImpl || fetch;

    // Namespaces
    this.sessions = {
      list:    () => this._json("GET", `/sessions`),
      get:     (sessionId) => this._json("GET", `/sessions/${encodeURIComponent(sessionId)}`),
      ensure:  () => this._json("GET", `/session`),       // returns { session_id }
      create:  () => this._json("POST", `/session`),      // returns { session_id }
      getUser: () => this._json("GET", `/user`)           // returns { user }
    };

    this.documents = {
      list: () => this._json("GET", `/documents`)         // [{title,id,segments}]
    };

    this.segments = {
      list:   ({ source } = {}) => this._json("GET", `/segments${this._qs({ source })}`),
      get:    (segId) => this._json("GET", `/segments/${encodeURIComponent(segId)}`),
      remove: (segId) => this._json("DELETE", `/segments/${encodeURIComponent(segId)}`)
    };

    this.chat = {
      /**
       * Non-streaming chat turn (returns HTML in .response)
       * @param {Object} p
       * @param {string} p.sessionId
       * @param {string} p.message
       * @param {string} [p.persona=""]
       * @param {string} [p.templateId="rag_chat"]
       * @param {number} [p.topK=8]
       * @param {string[]|null} [p.inactive]
       * @param {AbortSignal} [p.signal]
       */
      send: async (p) => {
        const body = this._form({
          message: p.message,
          session_id: p.sessionId,
          persona: p.persona ?? "",
          template_id: p.templateId ?? "rag_chat",
          top_k: p.topK ?? 8,
          inactive: p.inactive ? JSON.stringify(p.inactive) : undefined
        });
        return this._json("POST", `/chat`, { body, signal: p?.signal, form: true });
      },

      /**
       * Streaming chat via SSE (POST + text/event-stream). Parses events & tokens.
       * @param {Object} p
       * @param {string} p.sessionId
       * @param {string} p.message
       * @param {string} [p.persona=""]
       * @param {string} [p.templateId="rag_chat"]
       * @param {number} [p.topK=8]
       * @param {string[]} [p.inactive]
       * @param {(meta:object)=>void} [p.onMeta]
       * @param {(token:string)=>void} [p.onToken]
       * @param {(final:{text:string,sources?:any,usage?:any})=>void} [p.onDone]
       * @param {(err:any)=>void} [p.onError]
       * @param {AbortSignal} [p.signal]
       * @returns {Promise<{text:string,sources?:any,usage?:any,meta?:any}>}
       */
      stream: async (p) => {
        const url = `/chat${this._qs({ stream: true })}`;
        const body = this._form({
          message: p.message,
          session_id: p.sessionId,
          persona: p.persona ?? "",
          template_id: p.templateId ?? "rag_chat",
          top_k: p.topK ?? 8,
          inactive: p.inactive ? JSON.stringify(p.inactive) : undefined
        });
        return this._postSSE(url, body, p);
      },

      /**
       * Same as stream() but calls /chat-stream (always streaming).
       * @param {Parameters<DKClient['chat']['stream']>[0]} p
       */
      streamAlways: async (p) => {
        const url = `/chat-stream`;
        const body = this._form({
          message: p.message,
          session_id: p.sessionId,
          persona: p.persona ?? "",
          template_id: p.templateId ?? "rag_chat",
          top_k: p.topK ?? 8,
          inactive: p.inactive ? JSON.stringify(p.inactive) : undefined
        });
        return this._postSSE(url, body, p);
      }
    };

    this.search = {
      /**
       * @param {Object} p
       * @param {string} p.q
       * @param {number} [p.topK=5]
       * @param {string[]} [p.inactive]
       */
      run: ({ q, topK = 5, inactive } = {}) =>
        this._json("GET", `/search${this._qs({ q, top_k: topK, inactive: inactive ? JSON.stringify(inactive) : undefined })}`)
    };

    this.ingest = {
      /**
       * Upload & embed now.
       * @param {File[]|FileList} files
       */
      upload: (files) => {
        const fd = new FormData();
        for (const f of Array.from(files)) fd.append("files", f);
        return this._json("POST", `/upload`, { body: fd, multipart: true });
      },
      /**
       * Remove a document & its vectors.
       * @param {string} source (filename)
       */
      remove: (source) => {
        const body = this._form({ source });
        return this._json("POST", `/remove`, { body, form: true });
      },
      /**
       * Parse PDFs to txt then background-embed directory.
       */
      ingestAll: () => this._json("POST", `/ingest`),
      /**
       * Clear entire vector collection.
       */
      clearDb: () => this._json("POST", `/clear_db`)
    };

    // /api/llm/*
    this.llm = {
      // Services
      listServices:   () => this._json("GET", `/api/llm/services`),
      createService:  (svc) => this._json("POST", `/api/llm/services`, { body: JSON.stringify(svc), json: true }),
      updateService:  (sid, patch) => this._json("PUT", `/api/llm/services/${encodeURIComponent(sid)}`, { body: JSON.stringify(patch), json: true }),
      deleteService:  (sid) => this._json("DELETE", `/api/llm/services/${encodeURIComponent(sid)}`),

      // Models
      listModels:     (service_id) => this._json("GET", `/api/llm/models${this._qs({ service_id })}`),
      createModel:    (m) => this._json("POST", `/api/llm/models`, { body: JSON.stringify(m), json: true }),
      updateModel:    (mid, patch) => this._json("PUT", `/api/llm/models/${encodeURIComponent(mid)}`, { body: JSON.stringify(patch), json: true }),
      deleteModel:    (mid) => this._json("DELETE", `/api/llm/models/${encodeURIComponent(mid)}`),

      // Per-user selection
      getSelection:   () => this._json("GET", `/api/llm/selection`),
      updateSelection:(sel) => this._json("PUT", `/api/llm/selection`, { body: JSON.stringify(sel), json: true })
    };

    // /api settings + prompt templates
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

  /* -------------------- internal helpers -------------------- */

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
    // multipart -> let browser set content-type boundary

    const res = await this._fetch(this.base + path, {
      method,
      headers,
      body,
      signal,
      credentials: "include"
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new DKHttpError(res.status, res.statusText, text);
    }
    // Some endpoints might return empty body
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text().catch(() => "");
      return text ? { ok: true, text } : { ok: true };
    }
    return res.json();
  }

  /**
   * POST with text/event-stream response; parse SSE manually.
   * Supports callbacks and returns a final object on completion.
   * @private
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
      // Split on double-newline (event separators). Support both \n\n and \r\n\r\n
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
          const token = data;
          finalText += token;
          onToken?.(token);
        } else if (event === "done") {
          try {
            const obj = JSON.parse(data);
            finalSources = obj?.sources;
            finalUsage = obj?.usage;
          } catch {
            // ignore
          }
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
      // leftover
      if (buffer) flush(buffer);
      return { text: finalText, sources: finalSources, usage: finalUsage, meta: finalMeta };
    } catch (e) {
      onError?.(e);
      throw e;
    }
  }

  _parseSSE(block) {
    // block is like:
    // event: delta\n
    // data: token chunk...\n
    // id: 123\n
    // <blank line>
    const lines = block.split(/\r?\n/).filter(Boolean);
    let event = "message";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += (data ? "\n" : "") + line.slice(5).trim();
      }
    }
    if (!lines.length) return null;
    return { event, data };
  }
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

/* -------------------- Optional convenience wrapper -------------------- */

/**
 * Ensures existence of a chat session and returns its id.
 * Uses existing cookie-based session if present.
 * @param {DKClient} sdk
 */
export async function ensureChatSessionId(sdk) {
  const { session_id } = await sdk.sessions.ensure();
  return session_id;
}

/* -------------------- Example usage (remove or keep) --------------------

import { DKClient, ensureChatSessionId } from "./sdk.js";

const sdk = new DKClient({ baseUrl: "http://127.0.0.1:8000" });

(async () => {
  const sessionId = await ensureChatSessionId(sdk);

  // Non-stream chat
  const out = await sdk.chat.send({ sessionId, message: "Hello world" });
  console.log("HTML response:", out.response);

  // Stream chat
  await sdk.chat.stream({
    sessionId,
    message: "Stream this please.",
    onMeta: (m) => console.log("meta:", m),
    onToken: (t) => { /* append to UI */ },
    onDone: (r) => console.log("final:", r.text),
    onError: (e) => console.error("stream error:", e)
  });

  // Search
  const search = await sdk.search.run({ q: "router setup", topK: 8, inactive: ["DocA.pdf"] });
  console.log(search.results);

  // Upload files
  // const inp = document.querySelector('input[type="file"]');
  // const up = await sdk.ingest.upload(inp.files);

  // LLM config
  // const services = await sdk.llm.listServices();
  // await sdk.llm.createService({ name:"openai", type:"openai", base_url:"...", api_key:"..." });

  // Settings & templates
  // const s = await sdk.settings.get("user");
  // await sdk.templates.put("rag_chat", { id:"rag_chat", name:"RAG Chat", user_format:"{message}", system:"You are helpful." });
})();

-------------------------------------------------------------------------- */
