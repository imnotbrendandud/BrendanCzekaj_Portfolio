'use client';

import {
  createContext,
  useContext,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  Block,
  BlockType,
  ContactBlock,
  LinkBlock,
  ListBlock,
  TagsBlock,
} from '@/content/portfolio';
import { sanitizeHref } from '@/lib/inline';
import { RichField } from './RichField';
import { useEditorStore } from './store';
import {
  BLOCK_LABELS,
  PLACEHOLDERS,
  TEXT_TYPES,
  cloneBlock,
  contactLabelField,
  createBlock,
  fieldBefore,
  firstField,
  isTextType,
  locate,
  moveItem,
  newId,
  type DraftBlock,
} from './model';

/** Where a block dragged from the palette would land, for the drop line. */
export interface PaletteTarget {
  id: string;
  after: boolean;
}

export const PaletteTargetContext = createContext<PaletteTarget | null>(null);

/* ===========================================================================
   Block operations
   =========================================================================== */

export function useBlockActions() {
  const { doc, update, focusField, activeTab, setSelectedBlock } = useEditorStore();

  const insertAt = (tabIndex: number, index: number, type: BlockType) => {
    const block = createBlock(type);
    update((d) => d.tabs[tabIndex]?.blocks.splice(index, 0, block));
    setSelectedBlock(block.id);
    const field = firstField(block as Block);
    if (field) focusField(field, 'start');
    return block;
  };

  return {
    insertAt,

    /** After the given block, or at the end of the open tab. */
    insertAfter(blockId: string | null, type: BlockType) {
      const tabIndex = activeTab;
      const blocks = doc.tabs[tabIndex]?.blocks ?? [];
      const index = blockId ? blocks.findIndex((b) => b.id === blockId) : -1;
      return insertAt(tabIndex, index === -1 ? blocks.length : index + 1, type);
    },

    remove(blockId: string, focusPrevious = false) {
      const tab = doc.tabs.find((t) => t.blocks.some((b) => b.id === blockId));
      const index = tab?.blocks.findIndex((b) => b.id === blockId) ?? -1;
      update((d) => {
        const at = locate(d, blockId);
        at?.tab.blocks.splice(at.index, 1);
      });
      if (focusPrevious && tab) {
        const field = fieldBefore(tab.blocks, index - 1);
        if (field) focusField(field, 'end');
      }
    },

    duplicate(blockId: string) {
      update((d) => {
        const at = locate(d, blockId);
        if (at) at.tab.blocks.splice(at.index + 1, 0, cloneBlock(at.block as Block));
      });
    },

    move(blockId: string, delta: number) {
      update((d) => {
        const at = locate(d, blockId);
        if (at) moveItem(at.tab.blocks, at.index, at.index + delta);
      });
    },

    moveToTab(blockId: string, tabIndex: number) {
      update((d) => {
        const at = locate(d, blockId);
        const target = d.tabs[tabIndex];
        if (!at || !target || target === at.tab) return;
        at.tab.blocks.splice(at.index, 1);
        target.blocks.push(at.block);
      });
    },

    turnInto(blockId: string, type: (typeof TEXT_TYPES)[number]) {
      update((d) => {
        const at = locate(d, blockId);
        if (at && isTextType(at.block.type)) (at.block as { type: BlockType }).type = type;
      });
      focusField(blockId, 'end');
    },
  };
}

/** Edit one block in the draft; ignores it if the block has since gone. */
function useEditBlock<T extends DraftBlock['type']>(blockId: string, type: T) {
  const { update } = useEditorStore();
  return (mutate: (block: Extract<DraftBlock, { type: T }>) => void, key?: string) =>
    update((d) => {
      const block = locate(d, blockId)?.block;
      if (block?.type === type) mutate(block as Extract<DraftBlock, { type: T }>);
    }, key);
}

/* ===========================================================================
   The open tab
   =========================================================================== */

export function EditableTab({ tabIndex }: { tabIndex: number }) {
  const { doc } = useEditorStore();
  const tab = doc.tabs[tabIndex];
  if (!tab) return null;

  return (
    <SortableContext items={tab.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
      <div className="blocks blocks--editing">
        {tab.blocks.map((block, index) => (
          <EditableBlock key={block.id} block={block} index={index} count={tab.blocks.length} />
        ))}
        <EndZone tabId={tab.id} empty={tab.blocks.length === 0} />
      </div>
    </SortableContext>
  );
}

/** The drop target after the last block, with a quick way to keep writing. */
function EndZone({ tabId, empty }: { tabId: string; empty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `end:${tabId}`, data: { kind: 'end' } });
  const target = useContext(PaletteTargetContext);
  const actions = useBlockActions();
  return (
    <div
      ref={setNodeRef}
      className="blocks-end"
      data-over={isOver || target?.id === `end:${tabId}`}
    >
      {empty ? <p className="blocks-empty">Drag a block here from the panel.</p> : null}
      <button
        type="button"
        className="blocks-add"
        onClick={() => actions.insertAfter(null, 'paragraph')}
      >
        ＋ Paragraph
      </button>
    </div>
  );
}

/* ===========================================================================
   One block: handle, toolbar, body
   =========================================================================== */

function EditableBlock({ block, index, count }: { block: Block; index: number; count: number }) {
  const { doc, activeTab, selectedBlock, setSelectedBlock } = useEditorStore();
  const actions = useBlockActions();
  const target = useContext(PaletteTargetContext);
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, data: { kind: 'block' } });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  const label = BLOCK_LABELS[block.type];

  // ⌥↑ / ⌥↓ move the block from anywhere inside it.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    actions.move(block.id, event.key === 'ArrowUp' ? -1 : 1);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="eblock"
      data-type={block.type}
      data-selected={selectedBlock === block.id}
      data-dragging={isDragging}
      onFocusCapture={() => setSelectedBlock(block.id)}
      onKeyDown={onKeyDown}
    >
      {target?.id === block.id && !target.after ? <div className="drop-line" /> : null}

      <button
        ref={setActivatorNodeRef}
        type="button"
        className="eblock-handle"
        aria-label={`Move ${label} block. Space to pick up, arrow keys to move, Space to drop.`}
        title="Drag to move"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      <div className="eblock-tools" role="group" aria-label={`${label} block actions`}>
        {isTextType(block.type) ? (
          <select
            aria-label="Block type"
            value={block.type}
            onChange={(e) =>
              actions.turnInto(block.id, e.target.value as (typeof TEXT_TYPES)[number])
            }
          >
            {TEXT_TYPES.map((type) => (
              <option key={type} value={type}>
                {BLOCK_LABELS[type]}
              </option>
            ))}
          </select>
        ) : (
          <span className="eblock-type">{label}</span>
        )}
        {doc.tabs.length > 1 ? (
          <select
            aria-label="Move to another tab"
            value=""
            onChange={(e) => actions.moveToTab(block.id, Number(e.target.value))}
          >
            <option value="" disabled>
              Move to…
            </option>
            {doc.tabs.map((tab, i) =>
              i === activeTab ? null : (
                <option key={tab.id} value={i}>
                  {tab.label || 'Untitled'}
                </option>
              ),
            )}
          </select>
        ) : null}
        <ToolButton
          label="Move up (⌥↑)"
          disabled={index === 0}
          onClick={() => actions.move(block.id, -1)}
        >
          ↑
        </ToolButton>
        <ToolButton
          label="Move down (⌥↓)"
          disabled={index === count - 1}
          onClick={() => actions.move(block.id, 1)}
        >
          ↓
        </ToolButton>
        <ToolButton label="Duplicate" onClick={() => actions.duplicate(block.id)}>
          ⧉
        </ToolButton>
        <ToolButton label="Delete block" danger onClick={() => actions.remove(block.id)}>
          ✕
        </ToolButton>
      </div>

      <div className="eblock-body">
        <BlockBody block={block} />
      </div>

      {target?.id === block.id && target.after ? <div className="drop-line" /> : null}
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      data-danger={danger || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BlockBody({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
    case 'subheading':
    case 'meta':
    case 'paragraph':
      return <TextBody block={block} />;
    case 'list':
      return <ListBody block={block} />;
    case 'tags':
      return <TagsBody block={block} />;
    case 'link':
      return <LinkBody block={block} />;
    case 'contact':
      return <ContactBody block={block} />;
    case 'divider':
      return <hr className="block-divider" />;
  }
}

/* ===========================================================================
   Block bodies
   =========================================================================== */

function TextBody({
  block,
}: {
  block: Extract<Block, { text: string; type: (typeof TEXT_TYPES)[number] }>;
}) {
  const { update } = useEditorStore();
  const actions = useBlockActions();
  return (
    <RichField
      // Remount on "turn into" so the placeholder follows the type.
      key={block.type}
      fieldId={block.id}
      value={block.text}
      rich
      placeholder={PLACEHOLDERS[block.type]}
      label={BLOCK_LABELS[block.type]}
      className={`block-${block.type}`}
      onChange={(text) =>
        update((d) => {
          const b = locate(d, block.id)?.block;
          if (b && isTextType(b.type)) (b as { text: string }).text = text;
        }, `text:${block.id}`)
      }
      onEnter={() => actions.insertAfter(block.id, 'paragraph')}
      onBackspaceEmpty={() => actions.remove(block.id, true)}
    />
  );
}

function ListBody({ block }: { block: ListBlock }) {
  const edit = useEditBlock(block.id, 'list');
  const { focusField } = useEditorStore();
  const actions = useBlockActions();

  const addAfter = (index: number) => {
    const item = { id: newId('i'), text: '' };
    edit((b) => b.items.splice(index + 1, 0, item));
    focusField(item.id, 'start');
  };

  const removeAt = (index: number) => {
    if (block.items.length === 1) return actions.remove(block.id, true);
    edit((b) => b.items.splice(index, 1));
    focusField(block.items[Math.max(0, index - 1)]!.id, 'end');
  };

  return (
    <>
      <SortableContext items={block.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="block-list">
          {block.items.map((item, index) => (
            <SortableRow key={item.id} id={item.id} kind="item" parent={block.id} as="li">
              <RichField
                fieldId={item.id}
                value={item.text}
                rich
                placeholder={PLACEHOLDERS.item}
                label={`List item ${index + 1}`}
                onChange={(text) =>
                  edit((b) => {
                    const it = b.items.find((x) => x.id === item.id);
                    if (it) it.text = text;
                  }, `text:${item.id}`)
                }
                onEnter={() => addAfter(index)}
                onBackspaceEmpty={() => removeAt(index)}
              />
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
      <button type="button" className="eblock-add" onClick={() => addAfter(block.items.length - 1)}>
        ＋ Item
      </button>
    </>
  );
}

function TagsBody({ block }: { block: TagsBlock }) {
  const edit = useEditBlock(block.id, 'tags');
  const { focusField } = useEditorStore();
  const actions = useBlockActions();

  const addAfter = (index: number) => {
    const tag = { id: newId('t'), text: '' };
    edit((b) => b.tags.splice(index + 1, 0, tag));
    focusField(tag.id, 'start');
  };

  const removeAt = (index: number, refocus: boolean) => {
    if (block.tags.length === 1) return actions.remove(block.id, refocus);
    edit((b) => b.tags.splice(index, 1));
    if (refocus) focusField(block.tags[Math.max(0, index - 1)]!.id, 'end');
  };

  return (
    <SortableContext items={block.tags.map((t) => t.id)} strategy={rectSortingStrategy}>
      <ul className="tags">
        {block.tags.map((tag, index) => (
          <SortableRow
            key={tag.id}
            id={tag.id}
            kind="tag"
            parent={block.id}
            as="li"
            className="tag etag"
          >
            <RichField
              fieldId={tag.id}
              value={tag.text}
              placeholder={PLACEHOLDERS.tag}
              label={`Tag ${index + 1}`}
              className="tag-field"
              onChange={(text) =>
                edit((b) => {
                  const t = b.tags.find((x) => x.id === tag.id);
                  if (t) t.text = text;
                }, `text:${tag.id}`)
              }
              onEnter={() => addAfter(index)}
              onBackspaceEmpty={() => removeAt(index, true)}
            />
            <button
              type="button"
              className="etag-remove"
              aria-label={`Remove tag ${tag.text || index + 1}`}
              title="Remove tag"
              onClick={() => removeAt(index, false)}
            >
              ×
            </button>
          </SortableRow>
        ))}
        <li className="etag-add">
          <button
            type="button"
            aria-label="Add tag"
            title="Add tag"
            onClick={() => addAfter(block.tags.length - 1)}
          >
            ＋
          </button>
        </li>
      </ul>
    </SortableContext>
  );
}

function LinkBody({ block }: { block: LinkBlock }) {
  const edit = useEditBlock(block.id, 'link');
  const actions = useBlockActions();
  return (
    <>
      <div className="block-link">
        <span className="project-link">
          <RichField
            fieldId={block.id}
            value={block.text}
            placeholder={PLACEHOLDERS.link}
            label="Link text"
            className="inline-field"
            onChange={(text) => edit((b) => void (b.text = text), `text:${block.id}`)}
            onEnter={() => actions.insertAfter(block.id, 'paragraph')}
          />{' '}
          →
        </span>
      </div>
      <HrefField
        value={block.href}
        onChange={(href) => edit((b) => void (b.href = href), `href:${block.id}`)}
      />
    </>
  );
}

function ContactBody({ block }: { block: ContactBlock }) {
  const edit = useEditBlock(block.id, 'contact');
  const actions = useBlockActions();
  return (
    <>
      <div className="block-contact">
        <RichField
          fieldId={contactLabelField(block.id)}
          value={block.label}
          placeholder={PLACEHOLDERS.contactLabel}
          label="Contact label"
          className="contact-label inline-field"
          onChange={(label) => edit((b) => void (b.label = label), `label:${block.id}`)}
        />
        <RichField
          fieldId={block.id}
          value={block.text}
          placeholder={PLACEHOLDERS.contactText}
          label="Contact display text"
          className="contact-text inline-field"
          onChange={(text) => edit((b) => void (b.text = text), `text:${block.id}`)}
          onEnter={() => actions.insertAfter(block.id, 'contact')}
        />
      </div>
      <HrefField
        value={block.href}
        onChange={(href) => edit((b) => void (b.href = href), `href:${block.id}`)}
      />
    </>
  );
}

/** The address behind a link. Unsafe schemes (javascript: …) are refused, not saved. */
export function HrefField({
  value,
  onChange,
}: {
  value: string;
  onChange: (href: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Follow undo/redo without clobbering an in-progress invalid entry.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  const invalid = sanitizeHref(draft) === null;
  return (
    <label className="href-field" data-invalid={invalid || undefined}>
      <span>URL</span>
      <input
        type="text"
        value={draft}
        spellCheck={false}
        placeholder="https://…  ·  mailto:…  ·  tel:…"
        aria-invalid={invalid}
        onChange={(e) => {
          setDraft(e.target.value);
          if (sanitizeHref(e.target.value) !== null) {
            setSynced(e.target.value);
            onChange(e.target.value);
          }
        }}
      />
      {invalid ? <em>Only http, https, mailto and tel links</em> : null}
    </label>
  );
}

/* ===========================================================================
   Sortable rows inside a block (list items, tags)
   =========================================================================== */

function SortableRow({
  id,
  kind,
  parent,
  as: Tag,
  className,
  children,
}: {
  id: string;
  kind: 'item' | 'tag';
  parent: string;
  as: 'li';
  className?: string;
  children: ReactNode;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { kind, parent } });
  return (
    <Tag
      ref={setNodeRef}
      className={`erow ${className ?? ''}`}
      data-dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="erow-handle"
        aria-label={`Move ${kind === 'tag' ? 'tag' : 'item'}. Space to pick up, arrow keys to move.`}
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⋮
      </button>
      {children}
    </Tag>
  );
}
