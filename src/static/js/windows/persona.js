// applications/windows/persona.js
export function initPersonaWindow({ spawnWindow, initialPersona = "", onChange }) {
  if (typeof spawnWindow !== "function") throw new Error("spawnWindow missing");

  spawnWindow({
    id: "win_persona",
    title: "Persona Editor",
    col: "right",
    window_type: "window_generic",
    Elements: [
      { type: "text_area", id: "persona_text", label: "Persona", placeholder: "You are a helpful assistant." }
    ]
  });

  const el = document.getElementById("persona_text");
  if (el && initialPersona) el.value = initialPersona;
  el?.addEventListener("input", (e) => {
    onChange?.(e.target.value);
  });
}
