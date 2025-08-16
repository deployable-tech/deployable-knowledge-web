// Basic bootstrap for Deployable Knowledge
import { applyThemeSettings } from '/static/ui/js/theme.js';

applyThemeSettings();

window.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('app');
  if (el) {
    el.textContent = 'Deployable Knowledge is running.';
  }
});
