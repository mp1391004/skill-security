/**
 * Lọc HTML do CMS soạn trước khi lưu. Nội dung này được render thẳng ra trang bán
 * nên chỉ cho phép đúng bộ thẻ của trình soạn thảo — chặn script, iframe, sự kiện on*,
 * và javascript: trong href/src.
 */
const ALLOWED: Record<string, string[]> = {
  p: [],
  br: [],
  b: [],
  strong: [],
  i: [],
  em: [],
  u: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  ul: [],
  ol: [],
  li: [],
  blockquote: [],
  div: [],
  span: [],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt'],
};

function safeUrl(value: string) {
  const v = value.trim();
  if (/^(https?:|mailto:|tel:|\/|data:image\/)/i.test(v)) return v;
  return '';
}

export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // Bỏ hẳn phần thân của các thẻ nguy hiểm, không chỉ bỏ thẻ.
  let html = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|form|svg)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|svg)\b[^>]*\/?>/gi, '');

  html = html.replace(/<(\/?)([a-zA-Z0-9]+)((?:\s[^>]*)?)\/?>/g, (_m, close: string, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    const allowedAttrs = ALLOWED[tag];
    if (!allowedAttrs) return '';
    if (close === '/') return `</${tag}>`;

    const kept: string[] = [];
    const attrRe = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(attrs))) {
      const name = m[1].toLowerCase();
      if (!allowedAttrs.includes(name)) continue;
      let value = m[3] ?? m[4] ?? '';
      if (name === 'href' || name === 'src') {
        value = safeUrl(value);
        if (!value) continue;
      }
      kept.push(`${name}="${value.replace(/"/g, '&quot;')}"`);
    }

    if (tag === 'a') {
      const href = kept.find((a) => a.startsWith('href='));
      // href không hợp lệ -> bỏ thẻ mở; thẻ </a> mồ côi được trình duyệt bỏ qua,
      // chữ bên trong vẫn giữ nguyên.
      if (!href) return '';
      return `<a ${href} target="_blank" rel="noopener noreferrer">`;
    }
    if (tag === 'img') {
      const src = kept.find((a) => a.startsWith('src='));
      if (!src) return '';
      const alt = kept.find((a) => a.startsWith('alt=')) ?? 'alt=""';
      return `<img ${src} ${alt}>`;
    }

    return kept.length ? `<${tag} ${kept.join(' ')}>` : `<${tag}>`;
  });

  return html.trim();
}

/** Bỏ hết thẻ — dùng để kiểm tra khung nội dung có thật sự trống không. */
export function htmlIsEmpty(html: string) {
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() && !/<img\b/i.test(html);
}
