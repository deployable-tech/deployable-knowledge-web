/** Create a spinner element. */
export function createSpinner({ inline = false } = {}) {
  const el = document.createElement("div");
  el.className = inline ? "spinner-inline" : "spinner";
  return el;
}

export default { createSpinner };
