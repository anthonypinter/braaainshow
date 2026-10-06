// Share panel used on both the "done" screen (link only, social: false) and the watch page.

export function renderShare(container, { url, title, name, social = true }) {
  const text = name
    ? `Watch ${name} read “${title}” — a madlib, one take, no retakes 😂`
    : `Watch this madlib: “${title}” 😂`;
  const enc = encodeURIComponent;

  container.innerHTML = `
    <div class="link-row">
      <input class="link-input" type="text" readonly value="${escapeAttr(url)}" aria-label="Link to video">
      <button type="button" class="btn btn-secondary copy-btn">Copy</button>
    </div>
    ${navigator.share ? '<button type="button" class="btn btn-primary btn-block native-share">Share with comrades</button>' : ''}
    ${social ? `<div class="share-grid">
      <a class="share-chip" href="sms:?&body=${enc(`${text} ${url}`)}">Text</a>
      <a class="share-chip" href="https://wa.me/?text=${enc(`${text} ${url}`)}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="share-chip" href="mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${url}`)}">Email</a>
      <a class="share-chip" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}" target="_blank" rel="noopener">Facebook</a>
      <a class="share-chip" href="https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}" target="_blank" rel="noopener">X</a>
    </div>` : ''}
  `;

  const input = container.querySelector('.link-input');
  const copyBtn = container.querySelector('.copy-btn');
  input.addEventListener('focus', () => input.select());
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      input.select();
      document.execCommand('copy');
    }
    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1800);
  });

  container.querySelector('.native-share')?.addEventListener('click', () => {
    navigator.share({ title, text, url }).catch(() => {});
  });
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
