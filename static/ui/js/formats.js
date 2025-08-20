// ./formats.js
import { el } from './dom.js';

/*
DATES Formating
*/

export function toDate(v) { if (v instanceof Date) return v; if (typeof v === 'number') return new Date(v); const d = new Date(v); return isNaN(+d) ? new Date(NaN) : d; }
export function pad(n, w = 2) { const s = String(n); return s.length >= w ? s : '0'.repeat(w - s.length) + s; }

// Accepts 'YYYY', 'MM', 'DD', 'HH', 'mm', 'ss'
// Also auto-fixes the common "HH:MM:SS" minutes-capitalized pattern.
export function formatDate(d, fmt = 'YYYY-MM-DD HH:mm:ss') {
  if (!d || isNaN(+d)) return '';
  let f = String(fmt);
  // fix minutes if user typed HH:MM:SS
  f = f.replace(/(H{1,2}):MM:(S{1,2})/g, '$1:mm:$2');
  // token placeholders (support upper or lower where it makes sense)
  f = f
    .replace(/YYYY/g, '__YYYY__')
    .replace(/DD/g,   '__DD__')
    .replace(/HH/g,   '__HH__')
    .replace(/mm/g,   '__mm__')
    .replace(/ss/g,   '__ss__')
    .replace(/SS/g,   '__ss__') // allow uppercase seconds
    .replace(/MM/g,   '__MM__'); // month after minutes fix
  const Y = d.getFullYear(), M = pad(d.getMonth() + 1), D = pad(d.getDate()), H = pad(d.getHours()), m = pad(d.getMinutes()), s = pad(d.getSeconds());
  return f.replace(/__YYYY__/g, Y).replace(/__MM__/g, M).replace(/__DD__/g, D).replace(/__HH__/g, H).replace(/__mm__/g, m).replace(/__ss__/g, s);
}

export function labelize(key) {
  return String(key).replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase());
}

/* -------------------- read-only values (unchanged) -------------------- */

export function renderValue(val, cfg) {
  const t = (cfg?.type || 'text').toLowerCase();

  if (t === 'bool' || t === 'boolean') {
    const on = !!val;
    return el('span', { class: `pill ${on ? 'pill--yes' : 'pill--no'}` }, on ? 'Yes' : 'No');
    }

  if (t === 'json') {
    const pretty = cfg?.format === 'json_as_text';
    const text = safeJSON(val, pretty ? 2 : 0);
    return pretty ? el('pre', { class: 'mono block' }, text) : el('code', { class: 'mono inline' }, text);
  }

  if (t === 'date' || t === 'datetime') {
    const dt = toDate(val);
    const fmt = cfg?.format || 'YYYY-MM-DD HH:mm:ss';
    return el('span', {}, formatDate(dt, fmt));
  }

  if (t === 'text') {
    const f = (cfg?.format || '').toLowerCase();
    if (f === 'url' && typeof val === 'string' && /^https?:\/\//i.test(val)) {
      return el('a', { href: val, target: '_blank', rel: 'noopener noreferrer' }, val);
    }
    return el('span', {}, safeText(val));
  }

  return el('span', {}, safeText(String(val)));
}

function safeJSON(v, spaces = 0) { try { return JSON.stringify(v, null, spaces); } catch { return String(v); } }

export function safeText(v) { if (v == null) return ''; return typeof v === 'string' ? v : JSON.stringify(v); }
