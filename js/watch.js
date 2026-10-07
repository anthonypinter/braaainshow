import { getRecording, videoUrl, isConfigured } from './db.js';
import { renderShare } from './share.js';
import { MAIN_MADLIB, TEMPLATES, fullTextNodes } from './templates.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const id = params.get('id');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(msg) {
  $('#loading').hidden = true;
  if (msg) $('#missing-msg').textContent = msg;
  $('#missing').hidden = false;
}

(async () => {
  // Testing shortcut: watch.html?dev shows the page with sample words and no video (see app.js).
  if (params.has('dev') && !id) {
    const words = Object.fromEntries(MAIN_MADLIB.blanks.map((b) => [b.key, b.label.toLowerCase()]));
    return showRecording({ name: 'Test', title: MAIN_MADLIB.title, template_id: MAIN_MADLIB.id, words });
  }
  if (!isConfigured) return notFound('This site isn’t connected to Supabase yet (see js/config.js).');
  if (!id || !UUID.test(id)) return notFound();

  let rec;
  try {
    rec = await getRecording(id);
  } catch (err) {
    console.error(err);
    return notFound('Couldn’t load the video. Check your connection and refresh.');
  }
  if (!rec) return notFound();
  showRecording(rec);
})();

function showRecording(rec) {
  const player = $('#player');
  if (rec.video_path) player.src = videoUrl(rec.video_path);
  player.addEventListener('error', () => {
    if (!rec.video_path.endsWith('.webm')) return;
    $('#w-byline').textContent = 'If it won’t play, try Chrome or update your browser.';
    $('#w-byline').hidden = false;
  });

  // the full madlib with their words filled in, when we have it; otherwise the recorded lines
  const template = [MAIN_MADLIB, ...TEMPLATES].find((t) => t.id === rec.template_id);
  if (template?.fullText && rec.words) {
    $('#w-script').classList.add('fulltext');
    $('#w-script-title').textContent = 'Read your Braaainshow!? theme song';
    $('#w-lines').hidden = true;
    $('#w-fulltext').hidden = false;
    $('#w-fulltext').replaceChildren(...fullTextNodes(template.fullText, rec.words));
  } else {
    const lines = Array.isArray(rec.lines) ? rec.lines : [];
    $('#w-lines').replaceChildren(
      ...lines.map((l) => Object.assign(document.createElement('li'), { textContent: l }))
    );
  }

  renderShare($('#w-share'), { url: location.href, title: rec.title, name: rec.name, social: false });

  $('#loading').hidden = true;
  $('#watch').hidden = false;
}
