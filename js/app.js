import { TEMPLATES, WARMUP, MAIN_MADLIB, fillLine, fullTextNodes, segsToText, lineDurationMs, CUE_MS } from './templates.js';
import { MadlibRecorder, recordingSupported } from './recorder.js';
import { isConfigured, uploadVideo, saveRecording, MAX_BYTES } from './db.js';
import { renderShare } from './share.js';

const $ = (sel) => document.querySelector(sel);

// ------------------------------------------------------------------ state
const state = {
  template: null,
  words: {},
  name: '',
  email: '',
  id: null,
  lines: [], // array of segment arrays
  hows: [], // reading direction for each line (carried over within a section)
  cueAt: [], // true where a new section starts, so its direction pops up first
  warmupMs: 0, // time taken on the warm-up words (not shown during it)
  wordsMs: 0, // time taken on the real madlib words
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

// ------------------------------------------------------------------ 0. welcome
// OK! fades the welcome copy out (the heading stays put), then fades in Part 1.
$('#intro-ok').addEventListener('click', async () => {
  $('#intro-title').classList.remove('pulse'); // the heading only pulses on the very first screen
  await fadeOut($('#intro-welcome'));
  await fadeIn($('#intro-words'));
});

// Word prompts are asked one at a time: each Enter fades the prompt + box out and the next one in.
// The timer starts as the first prompt fades in and is never shown on screen.
// Used for the warm-up and then for the real test's madlib blanks.
const prompter = { labels: [], i: 0, answers: [], start: 0, busy: false, done: null };

async function askWords(labels, fromEl) {
  Object.assign(prompter, { labels, i: 0, answers: [], busy: false });
  await fadeOut(fromEl);
  setPrompt(0);
  prompter.start = performance.now();
  const finished = new Promise((resolve) => (prompter.done = resolve));
  await fadeIn($('#intro-warmup'));
  $('#warmup-input').focus();
  return finished; // → { answers, ms }
}

function setPrompt(i) {
  prompter.i = i;
  $('#warmup-prompt').textContent = prompter.labels[i];
  $('#warmup-count').textContent = `${i + 1} of ${prompter.labels.length}`;
  $('#warmup-input').value = '';
}

$('#warmup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#warmup-input');
  const answer = input.value.trim();
  if (!answer || prompter.busy) return;
  prompter.busy = true;
  prompter.answers[prompter.i] = answer;

  const form = $('#warmup-form');
  // fade with opacity only (never hide the input) so the phone keyboard stays open between prompts
  form.classList.add('faded');
  await new Promise((r) => setTimeout(r, FADE_MS));

  if (prompter.i + 1 < prompter.labels.length) {
    setPrompt(prompter.i + 1);
    form.classList.remove('faded');
    input.focus();
    prompter.busy = false;
  } else {
    const ms = performance.now() - prompter.start;
    input.blur();
    await fadeOut($('#intro-warmup'));
    form.classList.remove('faded');
    prompter.done({ answers: [...prompter.answers], ms });
  }
});

// Let's go! → warm-up words → "Great! That took you…"
$('#intro-go').addEventListener('click', async () => {
  const { ms } = await askWords(WARMUP, $('#intro-words'));
  state.warmupMs = ms;
  $('#warmup-time').textContent = `${(ms / 1000).toFixed(2)} seconds`;
  await fadeIn($('#intro-warmup-done'));
});

// I'm ready! → the real test: each madlib blank, one at a time → Part 2 intro
let mainWords = null;
$('#intro-ready').addEventListener('click', async () => {
  const { answers, ms } = await askWords(MAIN_MADLIB.blanks.map((b) => b.label), $('#intro-warmup-done'));
  state.wordsMs = ms;
  mainWords = Object.fromEntries(MAIN_MADLIB.blanks.map((b, i) => [b.key, answers[i]]));
  await fadeIn($('#intro-charisma'));
});

// Part 2: ask for camera + mic up front (with fix-it help if it fails), then name & email → recording.
$('#perm-btn').addEventListener('click', async () => {
  const btn = $('#perm-btn');
  const help = $('#perm-help');
  help.hidden = true;

  if (!recordingSupported()) {
    help.innerHTML = permissionHelp({ name: 'Unsupported' });
    help.hidden = false;
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Waiting for permission…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((t) => t.stop()); // just checking access; the recorder opens its own stream later
    startFill(MAIN_MADLIB, mainWords);
  } catch (err) {
    help.innerHTML = permissionHelp(err);
    help.hidden = false;
    btn.textContent = 'Try again';
  } finally {
    btn.disabled = false;
    if (btn.textContent === 'Waiting for permission…') btn.textContent = 'Enable camera & sound';
  }
});

function permissionHelp(err) {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const inApp = /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|musical_ly|LinkedInApp|Twitter/i.test(ua);

  if (inApp)
    return '<strong>This app’s built-in browser can’t use your camera.</strong> Open this page in ' +
      (ios ? 'Safari' : 'Chrome') + ' instead — tap the ⋯ or share menu and choose “Open in browser.”';
  if (!window.isSecureContext)
    return '<strong>The camera only works on a secure (https://) link.</strong> Open the site from its https:// address.';
  if (err?.name === 'Unsupported')
    return '<strong>This browser can’t record video.</strong> Try the latest Safari (iPhone) or Chrome (Android / computer).';
  if (err?.name === 'NotFoundError')
    return '<strong>No camera or microphone was found.</strong> Plug one in or switch to a phone, then tap Try again.';
  if (err?.name === 'NotReadableError')
    return '<strong>Your camera or mic is busy.</strong> Close other apps or tabs using it (FaceTime, Zoom, etc.), then tap Try again.';
  if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
    const steps = ios
      ? 'Tap <strong>aA</strong> in the address bar → <strong>Website Settings</strong> → set Camera and Microphone to <strong>Allow</strong>. ' +
        'If that’s not there, open the <strong>Settings</strong> app → <strong>Safari</strong> → Camera / Microphone → <strong>Allow</strong>.'
      : android
        ? 'Tap the icon to the left of the address bar → <strong>Permissions</strong> → allow Camera and Microphone.'
        : 'Click the camera or lock icon in the address bar and allow Camera and Microphone. ' +
          'On a Mac, also check <strong>System Settings → Privacy &amp; Security</strong> → Camera and Microphone for your browser.';
    return `<strong>Camera or microphone access was blocked.</strong> ${steps} Then tap Try again.`;
  }
  return `<strong>Couldn’t start the camera</strong> (${String(err?.message || err?.name || err).replace(/[<>&]/g, '')}). Tap Try again, or reload the page.`;
}

const FADE_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400;

async function fadeOut(el) {
  el.classList.add('faded');
  await new Promise((r) => setTimeout(r, FADE_MS));
  el.hidden = true;
}

async function fadeIn(el) {
  el.classList.add('faded');
  el.hidden = false;
  void el.offsetWidth; // let the browser paint it transparent before fading in
  el.classList.remove('faded');
  await new Promise((r) => setTimeout(r, FADE_MS));
}

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
  const ms = t.lines.reduce((sum, l) => sum + (l.how ? CUE_MS : 0) + lineDurationMs(segsToText(fillLine(l.text, sample))), 0);
  return Math.round(ms / 1000 / 5) * 5;
}

// ------------------------------------------------------------------ 2. fill
// With `words` (already asked one at a time), only the name & email are left to fill in.
function startFill(template, words = null) {
  state.template = template;
  state.words = words || {};
  // same big heading as the intro screens (copied so it splits onto two lines on narrow screens too)
  if (words) $('#fill-title').replaceChildren(...$('.intro-title').cloneNode(true).childNodes);
  else $('#fill-title').textContent = template.title;
  $('#fill-title').classList.toggle('intro-title', !!words);
  $('#fill-back').hidden = !!words;
  $('#fill-lead').textContent = words
    ? 'Almost there — tell us who you are.'
    : 'Don’t peek at the story — just fill in the blanks.';
  $('#blank-fields').innerHTML = words ? '' : template.blanks
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
  if (!words) $('#blank-fields input')?.focus();
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

  const words = Object.fromEntries(
    state.template.blanks.map((b) => [b.key, (state.words[b.key] ?? data[b.key]).trim()])
  );
  prepareRecording(data.__name.trim(), data.__email.trim(), words);
  show('ready');
});

function prepareRecording(name, email, words) {
  state.name = name;
  state.email = email;
  state.words = words;
  state.lines = state.template.lines.map((l) => fillLine(l.text, state.words));
  let how = '';
  state.hows = state.template.lines.map((l) => (how = l.how ?? how));
  state.cueAt = state.template.lines.map((l, i) => i === 0 || !!l.how);
  state.id = crypto.randomUUID();
  state.blob = null;
  state.videoPath = null;
  state.saved = false;
}

// Testing shortcuts: add ?dev to the URL for buttons that jump straight to the start of Part 2
// (sample words and a test name/email filled in), to the final screen, or to a sample watch page.
// Hidden from regular visitors.
if (new URLSearchParams(location.search).has('dev')) {
  const tools = Object.assign(document.createElement('div'), { className: 'dev-tools' });
  const devButton = (text, onClick) => {
    const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'dev-skip', textContent: text });
    btn.addEventListener('click', () => {
      onClick();
      tools.remove();
    });
    tools.append(btn);
  };
  devButton('Skip to Part 2', () => {
    mainWords = Object.fromEntries(MAIN_MADLIB.blanks.map((b) => [b.key, b.label.toLowerCase()]));
    $('[name="__name"]').value = 'Test';
    $('[name="__email"]').value = 'test@example.com';
    show('intro');
    $('#intro-title').classList.remove('pulse');
    document.querySelectorAll('.view-intro > .intro-step').forEach((el) => {
      el.hidden = el.id !== 'intro-charisma';
      el.classList.remove('faded');
    });
  });
  devButton('Skip to final screen', () => {
    state.template = MAIN_MADLIB;
    state.words = Object.fromEntries(MAIN_MADLIB.blanks.map((b) => [b.key, b.label.toLowerCase()]));
    state.name = 'Test';
    state.id = 'test'; // not a real recording, so its watch link shows "Video not found"
    showDone();
  });
  devButton('Go to watch page', () => location.assign('watch.html?dev'));
  document.body.append(tools);
}

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
    $('#cue').hidden = true;
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
      { lines: state.lines, cueAt: state.cueAt },
      (i, n, ms, phase) => {
        const inLine = i >= 0 && i < n;
        $('#line-count').textContent = inLine ? `Line ${i + 1} of ${n}` : '';
        // the reading direction pops up big before its line, then docks at the top while it's read.
        // only the current line is ever shown — never a preview of the next one.
        const cue = $('#cue');
        cue.hidden = !inLine;
        if (inLine) {
          $('#cue-how').textContent = state.hows[i];
          cue.classList.toggle('cue-big', phase === 'cue');
          if (phase === 'cue') {
            cue.classList.remove('pop');
            void cue.offsetWidth;
            cue.classList.add('pop');
          }
        }
        $('#next-line').textContent =
          i >= n ? 'Finishing up…'
          : phase === 'cue' ? 'Get into character — your line is coming…'
          : 'Read it out loud!';
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
  renderShare($('#done-share'), { url, title: state.template.title, name: state.name, social: false });
  renderFullText();
  show('done');
}

// The whole theme with this person's words filled in (highlighted), for the final screen.
function renderFullText() {
  const stanzas = state.template.fullText;
  $('#done-fulltext').hidden = !stanzas;
  if (!stanzas) return;
  $('#done-fulltext-body').replaceChildren(...fullTextNodes(stanzas, state.words));
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
