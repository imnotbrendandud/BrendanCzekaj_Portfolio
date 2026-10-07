'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Site } from '@/content/site';
import { validateSite } from '@/content/validate';
import { scopedKeyboardCoordinates } from '@/components/editor/dnd';
import { FormatToolbar } from '@/components/editor/FormatToolbar';
import { moveItem } from '@/components/editor/model';
import { EditorProvider, useEditorStore, useUndoShortcuts } from '@/components/editor/store';
import { useStoredFlag } from '@/components/editor/useStoredFlag';
import { HrefField } from '@/components/editor/EditableBlocks';
import { SiteView } from '@/components/site/SiteView';
import { EditableSite, listFor } from './EditableSite';

/**
 * The main page's in-place editor. Development only: page.tsx renders it
 * (through DevSiteContent) under `npm run dev` alone, so none of it ships.
 *
 * Off, it shows the page exactly as visitors see it, plus an EDIT button. On,
 * every piece of copy is editable where it sits; roles, projects, bullets,
 * stack tags and profiles can be added, removed, duplicated and dragged into
 * order. Changes autosave to src/content/site.json.
 *
 * It shares its engine with the /gamedev editor: the same store (one undo
 * history, autosave, outside-change detection), text fields and formatting
 * toolbar.
 */
export function SiteEditor({ source }: { source: Site }) {
  return (
    <EditorProvider source={source} validate={validateSite} target="site">
      <SiteEditorRoot />
    </EditorProvider>
  );
}

function SiteEditorRoot() {
  const { doc, update } = useEditorStore<Site>();
  const [open, setOpen] = useStoredFlag('site-editor-open');
  useUndoShortcuts(open);

  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so clicks still click.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: scopedKeyboardCoordinates(
        (active, container) => container.data.current?.group === active.data.current?.group,
      ),
    }),
  );

  if (!open) {
    return (
      <>
        <SiteView site={doc} />
        <button type="button" className="sedit-toggle" onClick={() => setOpen(true)}>
          ✎ Edit
        </button>
      </>
    );
  }

  // Items only land among their own list: a bullet among its role's bullets,
  // a stack chip within its own row, a role among roles.
  const collision: CollisionDetection = (args) => {
    const group = args.active.data.current?.group as string | undefined;
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => c.data.current?.group === group),
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const group = active.data.current?.group as string | undefined;
    if (!group || !over || active.id === over.id) return;
    update((d) => {
      const list = listFor(d, group);
      if (!list) return;
      const ids = list.map((item) => item.id);
      moveItem(list, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragEnd={onDragEnd}>
      <EditableSite />
      <EditorBar onDone={() => setOpen(false)} />
      <FormatToolbar />
    </DndContext>
  );
}

/* ===========================================================================
   The bar: status, undo/redo, page settings, done
   =========================================================================== */

function EditorBar({ onDone }: { onDone: () => void }) {
  const { status, error, undo, redo, canUndo, canRedo } = useEditorStore<Site>();
  const [settings, setSettings] = useState(false);
  const label = { saved: 'Saved', saving: 'Saving…', error: 'Not saved' }[status];

  return (
    <div className="sedit-bar" role="toolbar" aria-label="Editor">
      <span className="sedit-title">✎ Editing</span>
      <span
        className="sedit-status"
        data-status={status}
        role="status"
        title={error ?? 'Changes save to src/content/site.json'}
      >
        {label}
      </span>
      <button type="button" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" aria-label="Undo">
        ↶
      </button>
      <button type="button" onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)" aria-label="Redo">
        ↷
      </button>
      <button
        type="button"
        aria-expanded={settings}
        aria-controls="sedit-settings"
        onClick={() => setSettings((s) => !s)}
      >
        ⚙ Page
      </button>
      <button
        type="button"
        className="sedit-done"
        onClick={onDone}
        title="Leave edit mode and preview"
      >
        ✓ Done
      </button>
      {settings ? <PageSettings onClose={() => setSettings(false)} /> : null}
      {status === 'error' && error ? <p className="sedit-error">{error}</p> : null}
    </div>
  );
}

/** What isn't text on the page: search title and description, photo, links. */
function PageSettings({ onClose }: { onClose: () => void }) {
  const { doc, update } = useEditorStore<Site>();
  const ref = useRef<HTMLDivElement>(null);

  // Close on Escape or a click outside.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointer = (event: PointerEvent) => {
      const bar = ref.current?.closest('.sedit-bar');
      if (bar && !bar.contains(event.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  const field = (
    label: string,
    value: string,
    set: (d: Parameters<Parameters<typeof update>[0]>[0], value: string) => void,
    key: string,
    options: { multiline?: boolean; hint?: string } = {},
  ) => (
    <label className="efield">
      <span>{label}</span>
      {options.multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => update((d) => set(d, e.target.value), key)}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => update((d) => set(d, e.target.value), key)}
        />
      )}
      {options.hint ? <small>{options.hint}</small> : null}
    </label>
  );

  return (
    <div ref={ref} id="sedit-settings" className="sedit-settings">
      <h2>Page settings</h2>
      {field('Search & browser title', doc.title, (d, v) => void (d.title = v), 'site:title')}
      {field(
        'Description',
        doc.description,
        (d, v) => void (d.description = v),
        'site:description',
        {
          multiline: true,
          hint: `${doc.description.length} / ~160 characters shown in search results`,
        },
      )}
      {field('Photo', doc.photo.src, (d, v) => void (d.photo.src = v), 'site:photo', {
        hint: 'A square image in public/, e.g. /brendan-czekaj.jpg. Empty for none.',
      })}
      {field(
        'Photo description',
        doc.photo.alt,
        (d, v) => void (d.photo.alt = v),
        'site:photoalt',
        {
          hint: 'Read out by screen readers.',
        },
      )}
      {field(
        'Game dev link label',
        doc.gamedev.label,
        (d, v) => void (d.gamedev.label = v),
        'site:gamedevlabel',
      )}
      <div className="efield">
        <span>Game dev link</span>
        <HrefField
          value={doc.gamedev.href}
          onChange={(v) => update((d) => void (d.gamedev.href = v), 'site:gamedevhref')}
        />
      </div>
    </div>
  );
}
