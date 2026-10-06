import { getRecording, videoUrl, isConfigured } from './db.js';
import { renderShare } from './share.js';
import { SITE_NAME } from './config.js';

const $ = (s) => document.querySelector(s);
const id = new URLSearchParams(location.search).get('id');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(msg) {
  $('#loading').hidden = true;
  if (msg) $('#missing-msg').textContent = msg;
  $('#missing').hidden = false;
}

(async () => {
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

  document.title = `${rec.name} reads “${rec.title}” — ${SITE_NAME}`;
  $('#w-title').textContent = rec.title;
  $('#w-byline').textContent = `Read by ${rec.name}`;

  const player = $('#player');
  player.src = videoUrl(rec.video_path);
  player.addEventListener('error', () => {
    if (rec.video_path.endsWith('.webm'))
      $('#w-byline').textContent += ' · (If it won’t play, try Chrome or update your browser.)';
  });

  const lines = Array.isArray(rec.lines) ? rec.lines : [];
  $('#w-lines').replaceChildren(
    ...lines.map((l) => Object.assign(document.createElement('li'), { textContent: l }))
  );

  renderShare($('#w-share'), { url: location.href, title: rec.title, name: rec.name });

  $('#loading').hidden = true;
  $('#watch').hidden = false;
})();
