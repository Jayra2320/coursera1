/* util.js — tiny helpers shared by the whole app. No dependencies. */

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round = (n, dp) => {
  const m = Math.pow(10, dp || 0);
  return Math.round(n * m) / m;
};
const sum = (arr, fn) => arr.reduce((t, x) => t + (fn ? fn(x) : x), 0);

const uid = (prefix) => (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9);

const isoDate = (d) => {
  const dt = d ? new Date(d) : new Date();
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const todayISO = () => isoDate();
const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
const dayName = (iso, long) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { weekday: long ? 'long' : 'short' });
const prettyDate = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });

/* Deterministic RNG so a plan can be regenerated identically from a seed. */
function rng(seed) {
  let s = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = (arr, rand) => arr[Math.floor((rand ? rand() : Math.random()) * arr.length)];

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Very small markdown subset for assistant replies: **bold**, *italic*, `code`,
   bullet lists, numbered lists, paragraphs. Input is escaped first. */
function mdToHtml(src) {
  const lines = escapeHtml(src).split('\n');
  let out = '';
  let list = null;
  const inline = (t) => t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  const closeList = () => { if (list) { out += `</${list}>`; list = null; } };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (bullet) {
      if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; }
      out += `<li>${inline(bullet[1])}</li>`;
    } else if (numbered) {
      if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; }
      out += `<li>${inline(numbered[1])}</li>`;
    } else if (heading) {
      closeList();
      out += `<h3>${inline(heading[1])}</h3>`;
    } else if (!line.trim()) {
      closeList();
    } else {
      closeList();
      out += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return out;
}

/* grams -> a human quantity, e.g. 1.2 kg, 450 g, 300 ml */
function fmtQty(grams, unit) {
  const u = unit === 'ml' ? 'ml' : 'g';
  if (grams >= 1000) return round(grams / 1000, grams % 1000 === 0 ? 0 : 2) + (u === 'ml' ? ' L' : ' kg');
  return Math.round(grams) + ' ' + u;
}

const fmtKcal = (n) => Math.round(n).toLocaleString('en-AU');
const fmtG = (n) => Math.round(n) + 'g';
const money = (n) => '$' + n.toFixed(2);

/* True when the app is running as a published Claude Artifact rather than from
   a local file. The two differ in what the page is allowed to do. */
const HOSTED = typeof window !== 'undefined' && !!(window.claude && typeof window.claude.use === 'function');

/* Save a file. Locally that is an anchor click; on a hosted page anchor
   downloads are inert, so the viewer is offered the file through the host and
   can decline. */
async function download(filename, text, type) {
  if (HOSTED) {
    try {
      const downloads = await window.claude.use('downloads');
      if (downloads) {
        try {
          await downloads.save({ filename, data: text });
        } catch (err) {
          /* CSV is not always enabled — plain text always is. */
          if (err && err.code === 'extension_not_enabled' && /\.csv$/.test(filename)) {
            await downloads.save({ filename: filename.replace(/\.csv$/, '.txt'), data: text });
          } else if (err && err.code === 'declined') {
            return false;
          } else {
            throw err;
          }
        }
        return true;
      }
    } catch (err) {
      toast(err && err.message ? 'Could not save: ' + err.message : 'Could not save that file.');
      return false;
    }
  }

  const blob = new Blob([text], { type: type || 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function toast(msg) {
  const wrap = $('#toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms || 200);
  };
}

/* An SVG progress ring used on the dashboard. */
function ringSvg(pct, label, sub, size) {
  const s = size || 116;
  const r = s / 2 - 9;
  const c = 2 * Math.PI * r;
  const p = clamp(pct, 0, 1.35);
  const dash = Math.min(p, 1) * c;
  const over = p > 1;
  return `<svg class="ring" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" role="img" aria-label="${escapeHtml(label)} ${Math.round(p * 100)}%">
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="var(--panel-2)" stroke-width="9"/>
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none"
      stroke="${over ? 'var(--warn)' : 'var(--accent)'}" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${dash} ${c}" transform="rotate(-90 ${s / 2} ${s / 2})"/>
    <text x="50%" y="47%" text-anchor="middle" font-size="21" font-weight="650" fill="var(--ink)">${escapeHtml(label)}</text>
    <text x="50%" y="63%" text-anchor="middle" font-size="11" fill="var(--ink-3)">${escapeHtml(sub || '')}</text>
  </svg>`;
}
