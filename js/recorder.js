// Camera → canvas (with the current line drawn on top) → MediaRecorder.
// The canvas is both the on-screen preview and the thing being recorded,
// so what the reader sees is exactly what ends up in the video.

import { CUE_MS, lineDurationMs, segsToText } from './templates.js';

// Order matters: H.264 MP4 plays on every phone, so try it first. A bare "video/mp4"
// can mean VP9-in-MP4 on some Chromium builds, which iPhones can't play — so WebM
// comes before it, and bare MP4 is the last resort (mainly older Safari).
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4;codecs=avc1',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

// Colors and font of the lyric box burned into the video, matching the site (css/style.css :root).
const CARD = 'rgba(255, 251, 238, 0.92)'; // --card, slightly see-through
const INK = '#0d0e10'; // --ink
const ACCENT = '#ff4526'; // --accent (brand red): the words they typed
const FONT = '"Montserrat Alternates", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function recordingSupported() {
  return !!(
    navigator.mediaDevices?.getUserMedia &&
    window.MediaRecorder &&
    HTMLCanvasElement.prototype.captureStream
  );
}

export function pickMimeType() {
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export class MadlibRecorder {
  constructor(canvas, video) {
    this.canvas = canvas;
    this.video = video;
    this.ctx = canvas.getContext('2d');
    this.overlay = null;
    this.raf = 0;
    this.stream = null;
  }

  /** Ask for camera + mic and start drawing the live preview. Must follow a tap. */
  async open({ portrait }) {
    const [W, H] = portrait ? [720, 1280] : [1280, 720];
    this.canvas.width = W;
    this.canvas.height = H;

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: W }, height: { ideal: H }, frameRate: { ideal: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.video.srcObject = this.stream;
    await this.video.play();

    const loop = () => {
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * Record one continuous take of each line (auto-advanced), with no title or end cards.
   * A line that starts a section (cueAt[i]) is preceded by a cue gap (no text on the video) so its
   * reading direction can be shown first; the section's other lines follow straight on.
   * onLine(index, total, ms, phase) fires as each phase starts: phase is 'cue' or 'line'
   * (index === total once the last line is done).
   */
  async perform({ lines, cueAt = [] }, onLine = () => {}) {
    // the canvas can't use a web font until it has loaded, and lines are measured once
    await document.fonts?.load(`700 40px ${FONT}`).catch(() => {});
    const canvasStream = this.canvas.captureStream(30);
    const mixed = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...this.stream.getAudioTracks(),
    ]);

    const mimeType = pickMimeType();
    const rec = new MediaRecorder(mixed, {
      ...(mimeType && { mimeType }),
      videoBitsPerSecond: 1_500_000, // ~11 MB/min, comfortably under Supabase's 50 MB free cap
      audioBitsPerSecond: 96_000,
    });
    const chunks = [];
    rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
    const stopped = new Promise((resolve, reject) => {
      rec.onstop = resolve;
      rec.onerror = (e) => reject(e.error || new Error('Recording failed'));
    });

    rec.start(1000);

    for (let i = 0; i < lines.length; i++) {
      if (cueAt[i] ?? true) {
        this.setOverlay(null);
        onLine(i, lines.length, CUE_MS, 'cue');
        await sleep(CUE_MS);
      }

      const ms = lineDurationMs(segsToText(lines[i]));
      this.setOverlay({ kind: 'line', segs: lines[i] });
      onLine(i, lines.length, ms, 'line');
      await sleep(ms);
    }

    this.setOverlay(null);
    onLine(lines.length, lines.length, 0);

    rec.stop();
    await stopped;
    canvasStream.getTracks().forEach((t) => t.stop());

    const type = rec.mimeType || mimeType || 'video/webm';
    return new Blob(chunks, { type });
  }

  close() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.overlay = null;
  }

  setOverlay(o) {
    this.overlay = o; // layout is measured lazily on the next frame and cached on the object
  }

  // ---------------------------------------------------------------- drawing

  draw() {
    const { ctx, canvas, video } = this;
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw && vh) {
      const s = Math.max(W / vw, H / vh); // cover: fill the frame, crop the overflow
      const dw = vw * s;
      const dh = vh * s;
      ctx.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }

    const o = this.overlay;
    if (!o) return;
    if (o.kind === 'line') this.drawLine(o);
  }

  drawLine(o) {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const base = Math.min(W, H);

    if (!o._layout) {
      const maxW = W - base * 0.16;
      let size = base * 0.075;
      let rows;
      for (;;) {
        ctx.font = `700 ${size}px ${FONT}`;
        rows = wrap(ctx, o.segs, maxW);
        if (rows.length <= 4 || size < base * 0.04) break;
        size *= 0.9;
      }
      o._layout = { size, rows };
    }

    const { size, rows } = o._layout;
    const lineH = size * 1.25;
    const padY = size * 0.6;
    const boxH = rows.length * lineH + padY * 2;
    const boxW = W - base * 0.08;
    const boxX = (W - boxW) / 2;
    const boxY = H - boxH - H * 0.07;

    ctx.fillStyle = CARD;
    roundRect(ctx, boxX, boxY, boxW, boxH, size * 0.4);
    ctx.fill();

    ctx.font = `700 ${size}px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    rows.forEach((row, i) => {
      let x = (W - row.width) / 2;
      const y = boxY + padY + lineH * i + lineH / 2;
      for (const tok of row.tokens) {
        ctx.fillStyle = tok.filled ? ACCENT : INK;
        ctx.fillText(tok.text, x, y);
        x += tok.w;
      }
    });
  }
}

// Break segments into words (keeping punctuation attached to its word so "pizza." never splits),
// then pack words into rows no wider than maxW.
function wrap(ctx, segs, maxW) {
  const words = [];
  let cur = null;
  for (const s of segs) {
    for (const part of s.text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        cur = null;
        continue;
      }
      if (!cur) words.push((cur = []));
      cur.push({ text: part, filled: s.filled, w: ctx.measureText(part).width });
    }
  }

  const space = ctx.measureText(' ').width;
  const rows = [];
  let row = { tokens: [], width: 0 };
  for (const word of words) {
    const ww = word.reduce((a, t) => a + t.w, 0);
    const needed = row.tokens.length ? space + ww : ww;
    if (row.tokens.length && row.width + needed > maxW) {
      rows.push(row);
      row = { tokens: [], width: 0 };
    }
    if (row.tokens.length) {
      row.tokens.push({ text: ' ', filled: false, w: space });
      row.width += space;
    }
    row.tokens.push(...word);
    row.width += ww;
  }
  if (row.tokens.length) rows.push(row);
  return rows;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
