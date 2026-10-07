'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { BlockType, Portfolio } from '@/content/portfolio';
import { SiteContent } from '@/components/content/SiteContent';
import {
  EditableTab,
  PaletteTargetContext,
  useBlockActions,
  type PaletteTarget,
} from './EditableBlocks';
import { FormatToolbar } from './FormatToolbar';
import { BLOCK_KINDS, locate, moveItem } from './model';
import { Panel } from './Panel';
import { RichField } from './RichField';
import { EditorProvider, useEditorStore } from './store';

/**
 * The in-place block editor. Development only: page.tsx loads this with a
 * dynamic import behind a NODE_ENV check, so none of it ships.
 *
 * Off, it renders the page exactly as the live site does, plus an EDIT button.
 * On, every piece of copy is editable, blocks can be dragged in from the side
 * panel and rearranged, and each change autosaves to portfolio.json.
 */
export function Editor({ source }: { source: Portfolio }) {
  return (
    <EditorProvider source={source}>
      <EditorRoot />
    </EditorProvider>
  );
}

/** What's being dragged, from each draggable's `data`. */
type DragData =
  | { kind: 'palette'; blockType: BlockType }
  | { kind: 'block' }
  | { kind: 'end' }
  | { kind: 'tag' | 'item'; parent: string }
  | { kind: 'tab' };

const OPEN_KEY = 'portfolio-editor-open';
const COLLAPSED_KEY = 'portfolio-editor-collapsed';

function EditorRoot() {
  const store = useEditorStore();
  const { doc, update, activeTab, setActiveTab, undo, redo } = store;
  const actions = useBlockActions();

  const [open, setOpen] = useStoredFlag(OPEN_KEY);
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSED_KEY);
  const [dragging, setDragging] = useState<DragData | null>(null);
  const [paletteTarget, setPaletteTarget] = useState<PaletteTarget | null>(null);

  // Let the page make room for the panel (see globals.css).
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.editor = open ? (collapsed ? 'collapsed' : 'open') : '';
    return () => void delete root.dataset.editor;
  }, [open, collapsed]);

  // One undo history for the whole page. Plain inputs (tab labels, URLs) keep
  // the browser's own undo while you're typing in them.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea')) return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, undo, redo]);

  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so clicks still click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!open) {
    return (
      <>
        <SiteContent content={doc} activeTab={activeTab} onActiveTabChange={setActiveTab} />
        <button type="button" className="edit-toggle" onClick={() => setOpen(true)}>
          ✎ EDIT
        </button>
      </>
    );
  }

  /* --- Drag and drop ------------------------------------------------------ */

  // Each kind of drag only sees the targets it can land on: blocks among
  // blocks, a tag within its own row, a tab among tabs.
  const collision: CollisionDetection = (args) => {
    const active = args.active.data.current as DragData | undefined;
    const containers = args.droppableContainers.filter((container) => {
      const data = container.data.current as DragData | undefined;
      if (!active || !data) return false;
      switch (active.kind) {
        case 'palette':
        case 'block':
          return data.kind === 'block' || data.kind === 'end';
        case 'tag':
        case 'item':
          return data.kind === active.kind && data.parent === active.parent;
        case 'tab':
          return data.kind === 'tab';
        default:
          return false;
      }
    });
    const scoped = { ...args, droppableContainers: containers };
    if (active?.kind === 'palette') {
      const hits = pointerWithin(scoped);
      if (hits.length > 0) return hits;
    }
    return closestCenter(scoped);
  };

  /** Above or below the block under the pointer, for a palette drop. */
  const targetFor = (event: DragMoveEvent | DragEndEvent): PaletteTarget | null => {
    const { over, active } = event;
    if (!over) return null;
    if ((over.data.current as DragData | undefined)?.kind === 'end') {
      return { id: String(over.id), after: true };
    }
    const rect = active.rect.current.translated;
    const middle = rect ? rect.top + rect.height / 2 : 0;
    return { id: String(over.id), after: middle > over.rect.top + over.rect.height / 2 };
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setDragging((active.data.current as DragData | undefined) ?? null);
  };

  const onDragMove = (event: DragMoveEvent) => {
    if ((event.active.data.current as DragData | undefined)?.kind === 'palette') {
      setPaletteTarget(targetFor(event));
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const data = active.data.current as DragData | undefined;
    const target = targetFor(event);
    setDragging(null);
    setPaletteTarget(null);
    if (!data || !over) return;

    const blocks = doc.tabs[activeTab]?.blocks ?? [];
    const overEnd = (over.data.current as DragData | undefined)?.kind === 'end';

    switch (data.kind) {
      case 'palette': {
        const index = overEnd ? blocks.length : blocks.findIndex((b) => b.id === over.id);
        if (index === -1) return;
        actions.insertAt(activeTab, index + (!overEnd && target?.after ? 1 : 0), data.blockType);
        return;
      }
      case 'block': {
        const from = blocks.findIndex((b) => b.id === active.id);
        const to = overEnd ? blocks.length - 1 : blocks.findIndex((b) => b.id === over.id);
        update((d) => moveItem(d.tabs[activeTab]!.blocks, from, to));
        return;
      }
      case 'tag':
      case 'item': {
        update((d) => {
          const block = locate(d, data.parent)?.block;
          const list =
            block?.type === 'tags' ? block.tags : block?.type === 'list' ? block.items : null;
          if (!list) return;
          const ids = list.map((x) => x.id);
          moveItem(
            list as { id: string }[],
            ids.indexOf(String(active.id)),
            ids.indexOf(String(over.id)),
          );
        });
        return;
      }
      case 'tab': {
        const ids = doc.tabs.map((t) => `tab:${t.id}`);
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        const openId = doc.tabs[activeTab]?.id;
        update((d) => moveItem(d.tabs, from, to));
        // Keep the same tab open as it moves.
        const order = doc.tabs.map((t) => t.id);
        moveItem(order, from, to);
        setActiveTab(Math.max(0, order.indexOf(openId ?? '')));
        return;
      }
    }
  };

  const onDragCancel = () => {
    setDragging(null);
    setPaletteTarget(null);
  };

  const { hero, footer } = doc;
  const kind =
    dragging?.kind === 'palette' ? BLOCK_KINDS.find((k) => k.type === dragging.blockType) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <PaletteTargetContext.Provider value={paletteTarget}>
        <Panel
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(!collapsed)}
          onClose={() => setOpen(false)}
        />

        <SiteContent
          content={doc}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          slots={{
            name: (
              <RichField
                fieldId="hero:name"
                value={hero.name}
                placeholder="NAME"
                label="Site title"
                onChange={(name) => update((d) => void (d.hero.name = name), 'hero:name')}
                onEnter={() => store.focusField('hero:tagline', 'start')}
              />
            ),
            tagline: (
              <RichField
                fieldId="hero:tagline"
                value={hero.tagline}
                placeholder="TAGLINE"
                label="Tagline"
                onChange={(tagline) =>
                  update((d) => void (d.hero.tagline = tagline), 'hero:tagline')
                }
              />
            ),
            footer: (
              <RichField
                fieldId="footer:note"
                value={footer.note}
                placeholder="Footer note"
                label="Footer note"
                onChange={(note) => update((d) => void (d.footer.note = note), 'footer:note')}
              />
            ),
            // Only the open tab is editable; the others stay read-only, and
            // still size the window like on the live site.
            tab: (i) => (i === activeTab ? <EditableTab tabIndex={i} /> : null),
          }}
        />

        <FormatToolbar />

        <DragOverlay dropAnimation={null}>
          {kind ? (
            <div className="palette-chip palette-chip--overlay">
              <span className="palette-icon">{kind.icon}</span>
              {kind.label}
            </div>
          ) : null}
        </DragOverlay>
      </PaletteTargetContext.Provider>
    </DndContext>
  );
}

/** A boolean remembered in localStorage. A convenience only, so failures are ignored. */
function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(false);
  useEffect(() => {
    try {
      setValue(localStorage.getItem(key) === '1');
    } catch {}
  }, [key]);
  const set = (next: boolean) => {
    setValue(next);
    try {
      localStorage.setItem(key, next ? '1' : '0');
    } catch {}
  };
  return [value, set];
}
