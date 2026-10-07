'use client';

import { useState, type PointerEventHandler } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BlockType } from '@/content/portfolio';
import { HrefField, useBlockActions } from './EditableBlocks';
import { BLOCK_KINDS, createBlock, moveItem, newId, slugify, uniqueTabId } from './model';
import { useEditorStore } from './store';

interface PanelProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onClose: () => void;
}

/** The editor's side panel: blocks to add, tabs, page settings, shortcuts. */
export function Panel({ collapsed, onToggleCollapsed, onClose }: PanelProps) {
  const { status, error, undo, redo, canUndo, canRedo } = useEditorStore();

  const statusLabel = { saved: 'SAVED', saving: 'SAVING…', error: 'NOT SAVED' }[status];

  return (
    <aside className="editor-panel" data-collapsed={collapsed} aria-label="Page editor">
      <header className="editor-panel-head">
        <button
          type="button"
          className="editor-icon-button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand editor panel' : 'Collapse editor panel'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '»' : '«'}
        </button>
        {collapsed ? null : <h2 className="editor-panel-title">✎ EDITOR</h2>}
        <p
          className="editor-status"
          data-status={status}
          role="status"
          title={error ?? 'Changes save to src/content/portfolio.json'}
        >
          {collapsed ? (status === 'saved' ? '✓' : status === 'saving' ? '…' : '!') : statusLabel}
        </p>
      </header>

      {collapsed ? null : (
        <div className="editor-panel-scroll">
          <div className="editor-panel-actions">
            <button type="button" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
              ↶ Undo
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)">
              ↷ Redo
            </button>
            <button type="button" onClick={onClose} title="Leave edit mode and preview the page">
              ✓ Done
            </button>
          </div>

          {status === 'error' && error ? <p className="editor-error">{error}</p> : null}

          <Palette />
          <HeaderLinksSection />
          <TabsSection />
          <PageSection />
          <Shortcuts />
        </div>
      )}
    </aside>
  );
}

/* --- Blocks -------------------------------------------------------------- */

function Palette() {
  return (
    <section className="editor-section">
      <h3>Add blocks</h3>
      <p className="editor-hint">Drag onto the page, or click to add below the selected block.</p>
      <ul className="palette">
        {BLOCK_KINDS.map((kind) => (
          <PaletteChip key={kind.type} {...kind} />
        ))}
      </ul>
    </section>
  );
}

function PaletteChip({
  type,
  label,
  icon,
  hint,
}: {
  type: BlockType;
  label: string;
  icon: string;
  hint: string;
}) {
  const { selectedBlock } = useEditorStore();
  const actions = useBlockActions();
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: 'palette', blockType: type },
  });
  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        className="palette-chip"
        data-dragging={isDragging}
        title={hint}
        // Pointer drags only. From the keyboard, Enter adds the block, and ⌥↑/⌥↓
        // then move it, which is simpler than a keyboard drag out of the panel.
        onPointerDown={listeners?.onPointerDown as PointerEventHandler | undefined}
        onClick={() => actions.insertAfter(selectedBlock, type)}
      >
        <span className="palette-icon" aria-hidden="true">
          {icon}
        </span>
        {label}
      </button>
    </li>
  );
}

/* --- Tabs ---------------------------------------------------------------- */

function TabsSection() {
  const { doc, update, activeTab, setActiveTab, focusField } = useEditorStore();

  const addTab = () => {
    const block = createBlock('paragraph');
    update((d) => {
      d.tabs.push({ id: uniqueTabId(d, 'new'), label: 'NEW', blocks: [block] });
    });
    setActiveTab(doc.tabs.length);
    focusField(block.id, 'start');
  };

  return (
    <section className="editor-section">
      <h3>Tabs</h3>
      <SortableContext
        items={doc.tabs.map((t) => `tab:${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <ol className="editor-tabs">
          {doc.tabs.map((tab, i) => (
            <TabRow
              key={tab.id}
              index={i}
              id={tab.id}
              label={tab.label}
              active={i === activeTab}
              onlyTab={doc.tabs.length === 1}
              onSelect={() => setActiveTab(i)}
            />
          ))}
        </ol>
      </SortableContext>
      <button
        type="button"
        className="editor-add"
        onClick={addTab}
        disabled={doc.tabs.length >= 12}
      >
        ＋ Add tab
      </button>
    </section>
  );
}

function TabRow({
  index,
  id,
  label,
  active,
  onlyTab,
  onSelect,
}: {
  index: number;
  id: string;
  label: string;
  active: boolean;
  onlyTab: boolean;
  onSelect: () => void;
}) {
  const { update, activeTab, setActiveTab } = useEditorStore();
  const [confirming, setConfirming] = useState(false);
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `tab:${id}`, data: { kind: 'tab' } });

  const remove = () => {
    update((d) => void d.tabs.splice(index, 1));
    if (activeTab >= index && activeTab > 0) setActiveTab(activeTab - 1);
    setConfirming(false);
  };

  return (
    <li
      ref={setNodeRef}
      className="editor-tab"
      data-active={active}
      data-dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="erow-handle"
        aria-label={`Move tab ${label}. Space to pick up, arrow keys to move.`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <span className="editor-tab-num">{String(index + 1).padStart(2, '0')}</span>
      <input
        type="text"
        value={label}
        aria-label={`Tab ${index + 1} label`}
        onFocus={onSelect}
        onChange={(e) =>
          update((d) => {
            const tab = d.tabs[index];
            if (tab) tab.label = e.target.value.toUpperCase();
          }, `tablabel:${id}`)
        }
        // The hash follows the label (#bio for BIO), but only once you're done
        // typing, so the URL doesn't churn on every keystroke.
        onBlur={() => {
          if (!slugify(label) || slugify(label) === id) return;
          update((d) => {
            const tab = d.tabs[index];
            if (tab) tab.id = uniqueTabId(d, tab.label, tab);
          }, `tablabel:${id}`);
        }}
      />
      <button
        type="button"
        className="editor-icon-button"
        onClick={onSelect}
        aria-label={`Show tab ${label}`}
        title="Show this tab"
        aria-pressed={active}
      >
        ◉
      </button>
      {confirming ? (
        <span className="editor-confirm">
          <button type="button" data-danger onClick={remove}>
            Delete
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="editor-icon-button"
          data-danger
          disabled={onlyTab}
          onClick={() => setConfirming(true)}
          aria-label={`Delete tab ${label}`}
          title={onlyTab ? 'The page needs at least one tab' : 'Delete tab and its blocks'}
        >
          ✕
        </button>
      )}
      <p className="editor-tab-hash">#{id}</p>
    </li>
  );
}

/* --- Header links ---------------------------------------------------------- */

const MAX_HERO_LINKS = 6;

function HeaderLinksSection() {
  const { doc, update } = useEditorStore();
  const links = doc.hero.links;

  const edit = (index: number, change: { label?: string; href?: string }, key: string) =>
    update((d) => {
      const link = d.hero.links[index];
      if (link) Object.assign(link, change);
    }, key);

  return (
    <section className="editor-section">
      <h3>Header links</h3>
      <p className="editor-hint">
        Always visible under your name. Résumé first is a good idea: put the PDF in{' '}
        <code>public/</code> and link it as <code>/resume.pdf</code>.
      </p>
      <ol className="editor-links">
        {links.map((link, i) => (
          <li key={link.id} className="editor-link">
            <input
              type="text"
              value={link.label}
              aria-label={`Link ${i + 1} label`}
              placeholder="Label"
              onChange={(e) => edit(i, { label: e.target.value }, `herolabel:${link.id}`)}
            />
            <span className="editor-link-actions">
              <button
                type="button"
                className="editor-icon-button"
                disabled={i === 0}
                aria-label={`Move ${link.label || 'link'} left`}
                title="Move earlier"
                onClick={() => update((d) => moveItem(d.hero.links, i, i - 1))}
              >
                ↑
              </button>
              <button
                type="button"
                className="editor-icon-button"
                disabled={i === links.length - 1}
                aria-label={`Move ${link.label || 'link'} right`}
                title="Move later"
                onClick={() => update((d) => moveItem(d.hero.links, i, i + 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className="editor-icon-button"
                data-danger
                aria-label={`Remove ${link.label || 'link'}`}
                title="Remove link"
                onClick={() => update((d) => void d.hero.links.splice(i, 1))}
              >
                ✕
              </button>
            </span>
            <HrefField
              value={link.href}
              onChange={(href) => edit(i, { href }, `herohref:${link.id}`)}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="editor-add"
        disabled={links.length >= MAX_HERO_LINKS}
        onClick={() =>
          update(
            (d) => void d.hero.links.push({ id: newId('h'), label: 'Résumé', href: '/resume.pdf' }),
          )
        }
      >
        ＋ Add link
      </button>
    </section>
  );
}

/* --- Page settings --------------------------------------------------------- */

function PageSection() {
  const { doc, update } = useEditorStore();
  return (
    <section className="editor-section">
      <h3>Page</h3>
      <p className="editor-hint">
        Click the title, tagline or footer on the page to edit them. These set how the page appears
        in search results and link previews:
      </p>
      <label className="editor-field">
        <span>Browser &amp; search title</span>
        <input
          type="text"
          value={doc.meta.title}
          onChange={(e) => update((d) => void (d.meta.title = e.target.value), 'meta:title')}
        />
      </label>
      <label className="editor-field">
        <span>Description</span>
        <textarea
          rows={4}
          value={doc.meta.description}
          onChange={(e) =>
            update((d) => void (d.meta.description = e.target.value), 'meta:description')
          }
        />
        <small>{doc.meta.description.length} / ~160 characters shown in search results</small>
      </label>
    </section>
  );
}

/* --- Help ---------------------------------------------------------------- */

function Shortcuts() {
  const rows: [string, string][] = [
    ['Select text', 'Format: bold, italic, highlight, link'],
    ['⌘B · ⌘I · ⌘⇧H', 'Bold · italic · highlight'],
    ['⌘K', 'Link'],
    ['Enter', 'New block (new item in a list or tags)'],
    ['⌫ on empty', 'Remove it, back to the previous one'],
    ['⌥↑ · ⌥↓', 'Move the current block'],
    ['⌘Z · ⇧⌘Z', 'Undo · redo'],
  ];
  return (
    <section className="editor-section">
      <h3>Shortcuts</h3>
      <dl className="editor-shortcuts">
        {rows.map(([keys, what]) => (
          <div key={keys}>
            <dt>{keys}</dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
