import { TEMPLATES, fillLine, segsToText, lineDurationMs } from './templates.js';
import { MadlibRecorder, recordingSupported } from './recorder.js';
import { isConfigured, uploadVideo, saveRecording, MAX_BYTES } from './db.js';
import { renderShare } from './share.js';
import { SITE_NAME } from './config.js';

const $ = (sel) => document.querySelector(sel);

// ------------------------------------------------------------------ state
const state = {
  template: null,
  words: {},
  name: '',
  email: '',
  id: null,
  lines: [], // array of segment arrays
  hows: [], // reading direction for each line
  blob: null,
  videoPath: null,
  saved: false,
  busy: false, // recording or uploading — warn before leaving
};

const recorder = new MadlibRecorder($('#canvas'), $('#camera'));
let wakeLock = null;

// ------------------------------------------------------------------ views
function show(view) {
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.dataset.view !== view));
  document.body.classList.toggle('recording-mode', view === 'record');
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (!go) return;
  if (go.dataset.go === 'pick') resetAll();
  show(go.dataset.go);
});

window.addEventListener('beforeunload', (e) => {
  if (state.busy) {
    e.preventDefault();
    e.returnValue = '';
  }
});

if (!isConfigured) $('#config-warning').hidden = false;

// ------------------------------------------------------------------ 1. pick
$('#template-list').innerHTML = TEMPLATES.map(
  (t) => `
  <button type="button" class="template-card" data-id="${t.id}">
    <span class="template-title">${t.title}</span>
    <span class="template-blurb">${t.blurb}</span>
    <span class="template-meta">${t.blanks.length} blanks · about ${estimateSeconds(t)} sec</span>
  </button>`
).join('');

$('#template-list').addEventListener('click', (e) => {
  const card = e.target.closest('.template-card');
  if (!card) return;
  startFill(TEMPLATES.find((t) => t.id === card.dataset.id));
});

function estimateSeconds(t) {
  const sample = Object.fromEntries(t.blanks.map((b) => [b.key, 'word']));
  const ms = t.lines.reduce((sum, l) => sum + lineDurationMs(segsToText(fillLine(l.text, sample))), 4300);
  return Math.round(ms / 1000 / 5) * 5;
}

// ------------------------------------------------------------------ 2. fill
function startFill(template) {
  state.template = template;
  $('#fill-title').textContent = template.title;
  $('#blank-fields').innerHTML = template.blanks
    .map(
      (b, i) => `
    <label class="field">
      <span>${i + 1}. ${b.label}</span>
      <input name="${b.key}" type="text" maxlength="40" autocomplete="off" autocapitalize="off" spellcheck="false" required>
    </label>`
    )
    .join('');
  $('#fill-error').hidden = true;
  show('fill');
  $('#blank-fields input')?.focus();
}

$('#fill-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const missing = [...form.querySelectorAll('input[required]')].find((i) => !i.value.trim());
  const emailInput = form.querySelector('[name="__email"]');

  let msg = '';
  if (missing) msg = 'Fill in every blank (and your name and email) to continue.';
  else if (!emailInput.checkValidity()) msg = 'That email doesn’t look right.';
  if (msg) {
    $('#fill-error').textContent = msg;
    $('#fill-error').hidden = false;
    (missing || emailInput).focus();
    return;
  }

  state.name = data.__name.trim();
  state.email = data.__email.trim();
  state.words = Object.fromEntries(state.template.blanks.map((b) => [b.key, data[b.key].trim()]));
  state.lines = state.template.lines.map((l) => fillLine(l.text, state.words));
  state.hows = state.template.lines.map((l) => l.how);
  state.id = crypto.randomUUID();
  state.blob = null;
  state.videoPath = null;
  state.saved = false;
  show('ready');
});

// ------------------------------------------------------------------ 3. camera
$('#camera-btn').addEventListener('click', async () => {
  const errBox = $('#camera-error');
  errBox.hidden = true;

  if (!recordingSupported()) {
    errBox.textContent =
      'This browser can’t record video. Try the latest Safari (iPhone) or Chrome (Android / computer).';
    errBox.hidden = false;
    return;
  }

  const btn = $('#camera-btn');
  btn.disabled = true;
  btn.textContent = 'Starting camera…';
  try {
    // phones & tablets (or any narrow upright screen) → portrait video; computers → landscape
    const portrait =
      matchMedia('(pointer: coarse)').matches ||
      matchMedia('(orientation: portrait) and (max-width: 820px)').matches;
    show('record');
    await recorder.open({ portrait });
    const { width, height } = $('#canvas');
    $('#stage').style.setProperty('--ar', `${width} / ${height}`);
    $('#start-btn').hidden = false;
    $('#start-btn').disabled = false;
    $('#next-line').textContent = 'Get in frame, then tap start.';
    $('#line-count').textContent = '';
  } catch (err) {
    recorder.close();
    show('ready');
    errBox.textContent = cameraErrorMessage(err);
    errBox.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Turn on camera';
  }
});

function cameraErrorMessage(err) {
  if (err?.name === 'NotAllowedError')
    return 'Camera or microphone access was blocked. Allow access in your browser’s site settings, then try again.';
  if (err?.name === 'NotFoundError') return 'No camera or microphone was found on this device.';
  if (err?.name === 'NotReadableError') return 'Your camera is being used by another app. Close it and try again.';
  return `Couldn’t start the camera (${err?.message || err}).`;
}

// ------------------------------------------------------------------ 4. record
$('#start-btn').addEventListener('click', async () => {
  const startBtn = $('#start-btn');
  startBtn.disabled = true;
  startBtn.hidden = true;
  state.busy = true;

  await requestWakeLock();
  await countdown(3);

  $('#rec-badge').hidden = false;
  const bar = $('#line-timer-bar');

  try {
    state.blob = await recorder.perform(
      { title: state.template.title, name: state.name, lines: state.lines, siteName: SITE_NAME },
      (i, n, ms) => {
        $('#line-count').textContent = i >= 0 && i < n ? `Line ${i + 1} of ${n}` : '';
        // only the current line's reading direction — never a preview of the next line
        $('#next-line').innerHTML =
          i < 0
            ? 'Get ready — first line coming up…'
            : i < n
              ? `<span class="next-label">Read it</span> <span class="how">${escapeHtml(state.hows[i])}</span>`
              : 'Finishing up…';
        // restart the per-line progress bar
        bar.style.transition = 'none';
        bar.style.width = '0%';
        void bar.offsetWidth;
        bar.style.transition = `width ${ms}ms linear`;
        bar.style.width = '100%';
      }
    );
  } catch (err) {
    state.busy = false;
    releaseWakeLock();
    recorder.close();
    show('upload');
    showUploadError(`The recording failed (${err?.message || err}). Refresh the page to try again.`, false);
    return;
  }

  $('#rec-badge').hidden = true;
  releaseWakeLock();
  recorder.close();
  await saveEverything();
});

async function countdown(from) {
  const el = $('#countdown');
  el.hidden = false;
  $('#next-line').textContent = 'Get ready…';
  for (let n = from; n > 0; n--) {
    el.textContent = n;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    await new Promise((r) => setTimeout(r, 1000));
  }
  el.hidden = true;
}

// ------------------------------------------------------------------ 5. upload + save
async function saveEverything() {
  show('upload');
  $('#upload-error').hidden = true;
  $('#retry-btn').hidden = true;
  $('#upload-title').textContent = 'Uploading your video…';
  $('#upload-msg').hidden = false;
  document.querySelector('[data-view="upload"] .spinner').hidden = false;

  if (!state.blob || state.blob.size === 0) {
    showUploadError('The recording came out empty. Refresh the page to try again.', false);
    return;
  }
  if (state.blob.size > MAX_BYTES) {
    showUploadError('This video is over the 50 MB upload limit.', false);
    return;
  }

  try {
    if (!state.videoPath) state.videoPath = await uploadVideo(state.id, state.blob);
    if (!state.saved) {
      await saveRecording({
        id: state.id,
        template_id: state.template.id,
        title: state.template.title,
        name: state.name,
        email: state.email,
        words: state.words,
        lines: state.lines.map(segsToText),
        video_path: state.videoPath,
      });
      state.saved = true;
    }
  } catch (err) {
    console.error(err);
    showUploadError(`Upload didn’t finish (${err?.message || 'network error'}). Your video is still here — check your connection and try again.`, true);
    return;
  }

  state.busy = false;
  showDone();
}

function showUploadError(msg, canRetry) {
  document.querySelector('[data-view="upload"] .spinner').hidden = true;
  $('#upload-title').textContent = 'Something went wrong';
  $('#upload-msg').hidden = true;
  $('#upload-error').textContent = msg;
  $('#upload-error').hidden = false;
  $('#retry-btn').hidden = !canRetry;
  if (!canRetry) state.busy = false;
}

$('#retry-btn').addEventListener('click', saveEverything);

// ------------------------------------------------------------------ 6. done
function showDone() {
  const url = new URL(`watch.html?id=${state.id}`, location.href).href;
  $('#watch-link').href = url;
  renderShare($('#done-share'), { url, title: state.template.title, name: state.name });
  show('done');
}

// ------------------------------------------------------------------ helpers
function resetAll() {
  if (state.busy) return;
  recorder.close();
  $('#fill-form').reset();
}

async function requestWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    wakeLock = null; // not supported or denied — recording still works
  }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
