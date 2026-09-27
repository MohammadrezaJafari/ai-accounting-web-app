import DOMPurify from 'dompurify';
import { Marked } from 'marked';

const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );

/** Fenced code gets a header with its language and a copy button (handled by the chat view). */
const markdown = new Marked({
  gfm: true,
  breaks: true,
  async: false,
  renderer: {
    code({ text, lang }) {
      const language = escapeHtml((lang ?? '').split(/\s/)[0] || 'code');
      return (
        `<div class="code-block"><div class="code-head"><span>${language}</span>` +
        `<button type="button" class="copy-code">کپی</button></div>` +
        `<pre><code>${escapeHtml(text)}</code></pre></div>`
      );
    },
  },
});

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** Model output → sanitized HTML. */
export const renderMarkdown = (source: string): string =>
  DOMPurify.sanitize(markdown.parse(source, { async: false }));
