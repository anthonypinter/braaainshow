# Braaainshow!?

Fill in a madlib, then read it on camera in one take. Lines appear one at a time, burned into
the video, and advance automatically. The video uploads to Supabase and the reader gets a link
to share.

Plain HTML/CSS/JS — no build step. Hosted on GitHub Pages; Supabase (free plan) stores the
madlibs and videos.

## Setup (about 10 minutes, once)

### 1. Create the Supabase project
1. Sign up at <https://supabase.com> and create a new project (free plan is fine).
2. Open **SQL Editor → New query**, paste all of `supabase/setup.sql`, and click **Run**.
   This creates:
   - a `recordings` table (the website can add rows but can't read them, so emails stay private)
   - a `get_recording` function the watch page uses (returns everything except email)
   - a public `videos` storage bucket, capped at 50 MB per file, upload-only for visitors
3. Go to **Project Settings → API** (or **API Keys**) and copy:
   - the **Project URL**
   - the **publishable key** (or the legacy **anon public** key)

### 2. Add your keys
Edit `js/config.js` and paste the two values in. The publishable/anon key is designed to be
public, so it's fine to commit it.

### 3. Publish on GitHub Pages
1. Push this folder to a GitHub repo (the files go at the repo root).
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*,
   Branch = `main`, folder = `/ (root)`. Save.
3. After a minute your site is live at `https://<username>.github.io/<repo>/`.

GitHub Pages serves over HTTPS, which browsers require for camera access.

## Seeing submissions
Supabase → **Table Editor → recordings** shows every name, email, madlib, and video path.
Videos are under **Storage → videos**. Each one is watchable at
`https://<your-site>/watch.html?id=<id>`.

## Editing madlibs
All madlibs live in `js/templates.js`. Each has `blanks` (what the user fills in) and `lines`.
Each line has `text` (what they read) and `how` (the reading direction shown under the video
while that line is up, e.g. "Whisper it"). Put `{key}` in a line's text to insert a blank.
Readers only ever see the current line — never the next one. Keep lines to about one sentence.
Each line stays on screen for 1.5 s + 0.35 s per word (2.5–9 s); change that in
`lineDurationMs()` in the same file.

## How it works
| File | What it does |
| --- | --- |
| `index.html`, `js/app.js` | The flow: pick → fill → instructions → record → upload → share |
| `js/recorder.js` | Camera → canvas (current line drawn on top) → `MediaRecorder`. The canvas is the preview *and* the recording, so what the reader sees is what's saved. |
| `js/db.js` | Supabase upload, insert, and lookup |
| `watch.html`, `js/watch.js` | The shareable video page |
| `js/share.js` | Copy link, native share sheet, Text/WhatsApp/Email/Facebook/X |

- **Phones** record portrait 720×1280; computers record landscape 1280×720.
- **Format:** MP4 (H.264) when the browser supports it, which covers Safari and current Chrome
  and plays everywhere. Firefox records WebM.
- **Size:** about 1.5 Mbps, roughly 11 MB a minute. The included madlibs run about 50 seconds
  (~10 MB), well under the 50 MB free-plan limit.
- **Screen sleep:** the page holds a screen wake lock while recording so the phone doesn't dim.
- If an upload fails, the video stays in memory and the user can tap **Try again**.

## Limits to know about
- **Free plan:** 1 GB of video storage total (roughly 100 videos at these sizes), and the
  project pauses after a week with no activity. Upgrade to Pro if either becomes a problem.
- **Anyone can upload.** That's how a no-login site works. The 50 MB cap and video-only file
  types stop the worst abuse; add Supabase Auth or a CAPTCHA later if you need more.
- **Link previews** (the card shown when a link is pasted into a chat) are the same for every
  video, since GitHub Pages can't generate per-video previews.
- **Test on real phones** before launch, especially an iPhone in Safari. Use the GitHub Pages
  URL, since the camera won't work over plain `http://` except on `localhost`.
