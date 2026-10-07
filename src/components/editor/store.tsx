'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Editor as TiptapEditor } from '@tiptap/core';
import type { Portfolio } from '@/content/portfolio';
import type { Draft } from './model';

/*
 * Editor state: the document, one undo history for everything (typing,
 * formatting, adding, moving, deleting), autosave, and focus hand-off between
 * fields.
 *
 * Shared by both page editors. Each one passes its own document, the
 * validator for it, and which content file it saves to: `portfolio` for the
 * pixel page at /gamedev, `site` for the main page.
 */

/** Which content file a document saves to. Mirrors the save route's targets. */
export type ContentTarget = 'portfolio' | 'site';

/** Keystrokes in the same field this close together undo as one step. */
const COALESCE_MS = 1000;
const HISTORY_LIMIT = 200;
const SAVE_DELAY_MS = 500;
/** A file change matching one of our writes this recent is our own echo, not an outside edit. */
const ECHO_WINDOW_MS = 10_000;

// The history itself doesn't care what the document is.
interface History {
  past: unknown[];
  present: unknown;
  future: unknown[];
  lastKey: string | null;
  lastAt: number;
}

type Action = { type: 'change'; doc: unknown; key?: string } | { type: 'undo' } | { type: 'redo' };

function reducer(state: History, action: Action): History {
  switch (action.type) {
    case 'change': {
      const now = Date.now();
      // Typing in one field merges into the step already on top of the stack.
      const coalesce =
        action.key !== undefined &&
        action.key === state.lastKey &&
        now - state.lastAt < COALESCE_MS;
      return {
        past: coalesce ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: action.doc,
        future: [],
        lastKey: action.key ?? null,
        lastAt: now,
      };
    }
    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        lastKey: null,
        lastAt: 0,
      };
    }
    case 'redo': {
      const next = state.future[0];
      if (!next) return state;
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
        lastKey: null,
        lastAt: 0,
      };
    }
  }
}

export type SaveStatus = 'saved' | 'saving' | 'error';

interface EditorStore<T> {
  doc: T;
  /** Apply a change to a copy of the document. `key` groups rapid edits into one undo step. */
  update: (mutate: (draft: Draft<T>) => void, key?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  status: SaveStatus;
  error: string | null;

  /** /gamedev only: the open tab. */
  activeTab: number;
  setActiveTab: (index: number) => void;
  /** /gamedev only: the block last focused, where palette clicks insert after. */
  selectedBlock: string | null;
  setSelectedBlock: (id: string | null) => void;

  /** Focus a field now if it exists, or as soon as it mounts. */
  focusField: (fieldId: string, at?: 'start' | 'end') => void;
  registerField: (fieldId: string, focus: (at: 'start' | 'end') => void) => () => void;

  /** The formatted-text editor that has focus, for the formatting toolbar. */
  richEditor: TiptapEditor | null;
  setRichEditor: (editor: TiptapEditor | null) => void;
  /** Bumped by ⌘K to open the link field in the toolbar. */
  linkRequest: number;
  requestLink: () => void;
}

const EditorContext = createContext<EditorStore<unknown> | null>(null);

/**
 * The editor store, typed as the document the caller knows it's under. The
 * default is the /gamedev document, which most editor components work on.
 */
export function useEditorStore<T = Portfolio>(): EditorStore<T> {
  const store = useContext(EditorContext);
  if (!store) throw new Error('useEditorStore outside EditorProvider');
  return store as unknown as EditorStore<T>;
}

interface EditorProviderProps<T> {
  source: T;
  /** Checks and normalises a document; the same function the page loads with. */
  validate: (input: unknown) => T;
  target: ContentTarget;
  children: ReactNode;
}

export function EditorProvider<T>({ source, validate, target, children }: EditorProviderProps<T>) {
  const canonical = useCallback((doc: unknown) => JSON.stringify(validate(doc)), [validate]);
  const [history, dispatch] = useReducer(reducer, {
    past: [],
    present: source,
    future: [],
    lastKey: null,
    lastAt: 0,
  });
  const doc = history.present as T;
  const docRef = useRef(doc);
  docRef.current = doc;

  const update = useCallback((mutate: (draft: Draft<T>) => void, key?: string) => {
    // Works on the latest document through the ref, so a callback captured
    // inside a TipTap extension never applies its change to a stale copy, and
    // two updates in one event both land.
    const draft = structuredClone(docRef.current) as Draft<T>;
    mutate(draft);
    docRef.current = draft as T;
    dispatch({ type: 'change', doc: draft, key });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  /* --- Autosave --------------------------------------------------------- */

  const [status, setStatus] = useState<SaveStatus>('saved');
  const [error, setError] = useState<string | null>(null);
  /**
   * Versions this editor wrote recently, with when. Each save rewrites the
   * content file, hot reload hands the new file back in as `source`, and by
   * then you may have typed more, so an echo of our own write must be ignored
   * or it would roll those keystrokes back.
   *
   * Only *recent* writes count. Anything else that arrives is a real outside
   * change (you edited the JSON by hand, or ran `git checkout` to throw edits
   * away), even if it matches a version from earlier in the session, and it
   * must win; otherwise the next keystroke would write the stale state back.
   */
  const recentWrites = useRef(new Map<string, number>());
  /** What's on disk, as far as this editor knows. Nothing is saved while the doc matches it. */
  const lastWritten = useRef(JSON.stringify(source));

  useEffect(() => {
    let json: string;
    try {
      json = canonical(doc);
    } catch (e) {
      // Shouldn't happen from the UI, but never write a file the site can't load.
      setStatus('error');
      setError((e as Error).message);
      return;
    }
    if (json === lastWritten.current) return;
    setStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/content/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, content: JSON.parse(json) }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Save failed (${response.status}).`);
        }
        const now = Date.now();
        recentWrites.current.set(json, now);
        for (const [version, at] of recentWrites.current) {
          if (now - at > ECHO_WINDOW_MS) recentWrites.current.delete(version);
        }
        lastWritten.current = json;
        setError(null);
        setStatus('saved');
      } catch (e) {
        setError((e as Error).message);
        setStatus('error');
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [doc, canonical, target]);

  // The file changed under us: you edited the JSON by hand, reverted it,
  // or switched branches. Adopt it as a new step, which undo can still reverse.
  useEffect(() => {
    const json = JSON.stringify(source);
    const writtenAt = recentWrites.current.get(json);
    if (writtenAt !== undefined && Date.now() - writtenAt < ECHO_WINDOW_MS) return;
    lastWritten.current = json;
    if (json !== canonical(docRef.current)) dispatch({ type: 'change', doc: source });
  }, [source, canonical]);

  // Don't let a closing tab swallow an unsaved edit.
  useEffect(() => {
    if (status !== 'saving') return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  /* --- Focus hand-off --------------------------------------------------- */

  const fields = useRef(new Map<string, (at: 'start' | 'end') => void>());
  const pendingFocus = useRef<{ id: string; at: 'start' | 'end' } | null>(null);

  const focusField = useCallback((id: string, at: 'start' | 'end' = 'end') => {
    // A field that already exists gets focus right now. Deferring even a
    // frame lets fast typing land in the field being left: Enter in a title
    // then typing straight away would put the company name in the title.
    const existing = fields.current.get(id);
    if (existing) {
      pendingFocus.current = null;
      existing(at);
      return;
    }
    // Not mounted yet (a block or item just created): focus it as soon as it
    // registers, or on the next frame if it already has by then.
    pendingFocus.current = { id, at };
    requestAnimationFrame(() => {
      const focus = fields.current.get(id);
      if (focus && pendingFocus.current?.id === id) {
        pendingFocus.current = null;
        focus(at);
      }
    });
  }, []);

  const registerField = useCallback((id: string, focus: (at: 'start' | 'end') => void) => {
    fields.current.set(id, focus);
    if (pendingFocus.current?.id === id) {
      const { at } = pendingFocus.current;
      pendingFocus.current = null;
      requestAnimationFrame(() => focus(at));
    }
    return () => {
      if (fields.current.get(id) === focus) fields.current.delete(id);
    };
  }, []);

  /* --- The rest --------------------------------------------------------- */

  const [activeTab, setActiveTab] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [richEditor, setRichEditor] = useState<TiptapEditor | null>(null);
  const [linkRequest, setLinkRequest] = useState(0);
  const requestLink = useCallback(() => setLinkRequest((n) => n + 1), []);

  // Only the /gamedev document has tabs; clamp so deleting the open one is safe.
  const tabCount = (doc as { tabs?: readonly unknown[] }).tabs?.length ?? 1;

  const store = useMemo<EditorStore<T>>(
    () => ({
      doc,
      update,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      status,
      error,
      activeTab: Math.min(activeTab, tabCount - 1),
      setActiveTab,
      selectedBlock,
      setSelectedBlock,
      focusField,
      registerField,
      richEditor,
      setRichEditor,
      linkRequest,
      requestLink,
    }),
    [
      doc,
      update,
      undo,
      redo,
      history.past.length,
      history.future.length,
      status,
      error,
      activeTab,
      tabCount,
      selectedBlock,
      focusField,
      registerField,
      richEditor,
      linkRequest,
      requestLink,
    ],
  );

  return (
    <EditorContext.Provider value={store as EditorStore<unknown>}>
      {children}
    </EditorContext.Provider>
  );
}

/**
 * ⌘Z / ⇧⌘Z (and Ctrl+Y) drive the editor's one history, for typing and
 * structure alike. Plain inputs (URLs, labels) keep the browser's own undo
 * while you're typing in them.
 */
export function useUndoShortcuts(enabled: boolean) {
  const { undo, redo } = useEditorStore<unknown>();
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select')) return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled, undo, redo]);
}
