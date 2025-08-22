export const personaWindow = {
  id: 'persona',
  title: 'Persona',
  layout: [
    {
      tag: 'div',
      class: 'row',
      children: [
        { tag: 'button', id: 'savePersona', text: 'Save' },
        { tag: 'button', id: 'cancelPersona', text: 'Cancel' }
      ]
    },
    { tag: 'textarea', id: 'persona', attrs: { placeholder: 'optional persona' } }
  ]
};

export function setupPersonaUI({ elements }) {
  const { persona, savePersona, cancelPersona } = elements;
  let personaText = '';
  try { personaText = localStorage.getItem('personaText') || ''; } catch {}
  persona.value = personaText;

  savePersona.addEventListener('click', () => {
    personaText = persona.value;
    try { localStorage.setItem('personaText', personaText); } catch {}
    const w = document.querySelector('.window[data-id="persona"]');
    if (w) w.style.display = 'none';
  });

  cancelPersona.addEventListener('click', () => {
    persona.value = personaText;
    const w = document.querySelector('.window[data-id="persona"]');
    if (w) w.style.display = 'none';
  });

  return {
    getPersona: () => personaText
  };
}
