/**
 * Inline formatting for body copy.
 *
 * Formatted text is stored as a strict HTML subset: <strong>, <em>, <mark> and
 * <a href>, plus the entities &amp; &lt; &gt; &quot; and &#39;. Anything else
 * that looks like a tag is kept as literal text, so a stray "<" can never turn
 * into markup.
 *
 * The same parser renders copy on the site (into React elements, never
 * innerHTML) and normalises it before the editor saves, so what's in
 * portfolio.json is always in the canonical form `serializeInline` writes.
 */

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'strong' | 'em' | 'mark'; children: InlineNode[] }
  | { type: 'a'; href: string; children: InlineNode[] };

type Element = Exclude<InlineNode, { type: 'text' }>;

const TAG_ALIASES: Record<string, 'strong' | 'em' | 'mark' | 'a'> = {
  strong: 'strong',
  b: 'strong',
  em: 'em',
  i: 'em',
  mark: 'mark',
  a: 'a',
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  nbsp: ' ',
};

const TOKEN = /<(\/?)([a-z]+)\b([^<>]*)>|&(amp|lt|gt|quot|#39|nbsp);|[^<&]+|[<&]/gi;

export function parseInline(source: string): InlineNode[] {
  const root: Element = { type: 'strong', children: [] };
  const stack: Element[] = [root];
  const top = () => stack[stack.length - 1]!;

  const pushText = (text: string) => {
    const siblings = top().children;
    const last = siblings[siblings.length - 1];
    if (last?.type === 'text') last.text += text;
    else siblings.push({ type: 'text', text });
  };

  for (const match of source.matchAll(TOKEN)) {
    const [whole, closing, rawTag, attrs, entity] = match;
    if (entity) {
      pushText(ENTITIES[entity.toLowerCase()]!);
      continue;
    }
    const tag = rawTag ? TAG_ALIASES[rawTag.toLowerCase()] : undefined;
    if (!rawTag || !tag) {
      // Plain text, or something tag-shaped we don't support: keep it literal.
      pushText(whole);
      continue;
    }
    if (closing) {
      // Close the nearest matching element; an unmatched close is dropped.
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i]!.type === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    let element: Element;
    if (tag === 'a') {
      const href = sanitizeHref(
        decodeEntities(/\bhref\s*=\s*"([^"]*)"/i.exec(attrs ?? '')?.[1] ?? ''),
      );
      element = { type: 'a', href: href ?? '', children: [] };
    } else {
      element = { type: tag, children: [] };
    }
    top().children.push(element);
    stack.push(element);
  }

  return clean(root.children);
}

/** Drops empty elements and links whose href didn't survive sanitising. */
function clean(nodes: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      if (node.text) out.push(node);
      continue;
    }
    const children = clean(node.children);
    if (children.length === 0) continue;
    if (node.type === 'a' && !node.href) out.push(...children);
    else out.push({ ...node, children } as Element);
  }
  return out;
}

export function serializeInline(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return escapeText(node.text);
      const inner = serializeInline(node.children);
      if (node.type === 'a') return `<a href="${escapeAttr(node.href)}">${inner}</a>`;
      return `<${node.type}>${inner}</${node.type}>`;
    })
    .join('');
}

/** Canonical, safe form of a formatted string. */
export function normalizeInline(source: string): string {
  return serializeInline(parseInline(source));
}

/** The text with all formatting removed. */
export function inlineToPlain(source: string): string {
  const walk = (nodes: InlineNode[]): string =>
    nodes.map((n) => (n.type === 'text' ? n.text : walk(n.children))).join('');
  return walk(parseInline(source));
}

const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * A link target that's safe to render, or null. Relative paths, fragments and
 * the http(s)/mailto/tel schemes pass; `javascript:` and friends don't.
 * Placeholders like "TODO" are relative paths, so they pass too.
 */
export function sanitizeHref(href: string): string | null {
  const trimmed = href.trim();
  // Strip the characters browsers ignore when reading a scheme, so
  // "java\nscript:" can't sneak past the check.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed.replace(/[\u0000- ]/g, ''));
  if (scheme && !SAFE_SCHEMES.has(scheme[1]!.toLowerCase() + ':')) return null;
  return trimmed;
}

export function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return escapeText(text).replace(/"/g, '&quot;');
}

function decodeEntities(text: string): string {
  return text.replace(
    /&(amp|lt|gt|quot|#39|nbsp);/gi,
    (_, e: string) => ENTITIES[e.toLowerCase()]!,
  );
}
