import type { Block, BlockType, Portfolio, Tab } from '@/content/portfolio';

/** A deeply mutable copy of a content type, for editing a cloned document. */
export type Draft<T> = T extends readonly (infer U)[]
  ? Draft<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Draft<T[K]> }
    : T;

export type DraftDoc = Draft<Portfolio>;
export type DraftTab = Draft<Tab>;
export type DraftBlock = Draft<Block>;

/** Short random ids, prefixed by kind so they're readable in the JSON. */
export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Palette entries, in the order the side panel shows them. */
export const BLOCK_KINDS: readonly {
  type: BlockType;
  label: string;
  icon: string;
  hint: string;
}[] = [
  { type: 'heading', label: 'Heading', icon: 'H1', hint: 'Pixel-font title' },
  {
    type: 'subheading',
    label: 'Subheading',
    icon: 'H2',
    hint: 'Bold line, e.g. a role or project',
  },
  { type: 'paragraph', label: 'Paragraph', icon: '¶', hint: 'Body copy' },
  { type: 'meta', label: 'Meta line', icon: '··', hint: 'Small muted line, e.g. dates' },
  { type: 'list', label: 'Bullet list', icon: '•', hint: 'One point per line' },
  { type: 'tags', label: 'Tags', icon: '#', hint: 'Row of labels, e.g. a tech stack' },
  { type: 'link', label: 'Link', icon: '→', hint: 'Call to action, e.g. GitHub →' },
  { type: 'contact', label: 'Contact row', icon: '@', hint: 'Label plus link' },
  { type: 'divider', label: 'Divider', icon: '—', hint: 'Line between sections' },
];

export const BLOCK_LABELS = Object.fromEntries(BLOCK_KINDS.map((k) => [k.type, k.label])) as Record<
  BlockType,
  string
>;

/** Text block types can be converted into one another without losing anything. */
export const TEXT_TYPES = ['heading', 'subheading', 'paragraph', 'meta'] as const;
export type TextType = (typeof TEXT_TYPES)[number];

export function isTextType(type: BlockType): type is TextType {
  return (TEXT_TYPES as readonly string[]).includes(type);
}

export const PLACEHOLDERS = {
  heading: 'Heading',
  subheading: 'Subheading',
  paragraph: 'Write something…',
  meta: 'Dates, place…',
  item: 'List item',
  tag: 'TAG',
  link: 'Link text',
  contactLabel: 'LABEL',
  contactText: 'Display text',
} as const;

export function createBlock(type: BlockType): DraftBlock {
  const id = newId('b');
  switch (type) {
    case 'heading':
    case 'subheading':
    case 'meta':
    case 'paragraph':
      return { id, type, text: '' };
    case 'list':
      return { id, type, items: [{ id: newId('i'), text: '' }] };
    case 'tags':
      return { id, type, tags: [{ id: newId('t'), text: '' }] };
    case 'link':
      return { id, type, text: '', href: '' };
    case 'contact':
      return { id, type, label: '', text: '', href: '' };
    case 'divider':
      return { id, type };
  }
}

/** A deep copy with fresh ids throughout. */
export function cloneBlock(block: Block): DraftBlock {
  const copy = structuredClone(block) as DraftBlock;
  copy.id = newId('b');
  if (copy.type === 'list') copy.items.forEach((item) => (item.id = newId('i')));
  if (copy.type === 'tags') copy.tags.forEach((tag) => (tag.id = newId('t')));
  return copy;
}

/*
 * Field ids name each editable field so focus can be moved between them, e.g.
 * to the new paragraph after pressing Enter. Block, item and tag ids are unique
 * across the document, so they double as field ids.
 */

export function contactLabelField(blockId: string) {
  return `${blockId}:label`;
}

export function firstField(block: Block): string | null {
  switch (block.type) {
    case 'list':
      return block.items[0]?.id ?? null;
    case 'tags':
      return block.tags[0]?.id ?? null;
    case 'contact':
      return contactLabelField(block.id);
    case 'divider':
      return null;
    default:
      return block.id;
  }
}

export function lastField(block: Block): string | null {
  switch (block.type) {
    case 'list':
      return block.items[block.items.length - 1]?.id ?? null;
    case 'tags':
      return block.tags[block.tags.length - 1]?.id ?? null;
    case 'divider':
      return null;
    default:
      return block.id;
  }
}

/** Where a block lives in the draft. */
export function locate(doc: DraftDoc, blockId: string) {
  for (const tab of doc.tabs) {
    const index = tab.blocks.findIndex((b) => b.id === blockId);
    if (index !== -1) return { tab, index, block: tab.blocks[index]! };
  }
  return null;
}

/** The last focusable field at or before `index` in a tab, skipping dividers. */
export function fieldBefore(blocks: readonly Block[], index: number): string | null {
  for (let i = index; i >= 0; i -= 1) {
    const field = lastField(blocks[i]!);
    if (field) return field;
  }
  return null;
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** A tab id derived from `label` that no other tab uses. */
export function uniqueTabId(doc: DraftDoc, label: string, except?: DraftTab): string {
  const base = slugify(label) || 'tab';
  const taken = new Set(doc.tabs.filter((t) => t !== except).map((t) => t.id));
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  return id;
}

export function moveItem<T>(list: T[], from: number, to: number): void {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item!);
}
