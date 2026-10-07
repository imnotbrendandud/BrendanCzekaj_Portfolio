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
import { validatePortfolio } from '@/content/validate';
import type { DraftDoc } from './model';

/*
 * Editor state: the document, one undo history for everything (typing,
 * formatting, adding, moving, deleting), autosave, and focus hand-off between
 * fields.
 */

/** Keystrokes in the same field this close together undo as one step. */
const COALESCE_MS = 1000;
const HISTORY_LIMIT = 200;
const SAVE_DELAY_MS = 500;
/** A file change matching one of our writes this recent is our own echo, not an outside edit. */
const ECHO_WINDOW_MS = 10_000;

interface History {
  past: Portfolio[];
  present: Portfolio;
  future: Portfolio[];
  lastKey: string | null;
  lastAt: number;
}

type Action =
  | { type: 'change'; doc: Portfolio; key?: string }
  | { type: 'undo' }
  | { type: 'redo' };

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

interface EditorStore {
  doc: Portfolio;
  /** Apply a change to a copy of the document. `key` groups rapid edits into one undo step. */
  update: (mutate: (draft: DraftDoc) => void, key?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  status: SaveStatus;
  error: string | null;

  activeTab: number;
  setActiveTab: (index: number) => void;
  /** The block last focused, where palette clicks insert after. */
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

const EditorContext = createContext<EditorStore | null>(null);

export function useEditorStore(): EditorStore {
  const store = useContext(EditorContext);
  if (!store) throw new Error('useEditorStore outside EditorProvider');
  return store;
}

const canonical = (doc: Portfolio) => JSON.stringify(validatePortfolio(doc));

export function EditorProvider({ source, children }: { source: Portfolio; children: ReactNode }) {
  const [history, dispatch] = useReducer(reducer, {
    past: [],
    present: source,
    future: [],
    lastKey: null,
    lastAt: 0,
  });
  const doc = history.present;
  const docRef = useRef(doc);
  docRef.current = doc;

  const update = useCallback((mutate: (draft: DraftDoc) => void, key?: string) => {
    // Works on the latest document through the ref, so a callback captured
    // inside a TipTap extension never applies its change to a stale copy, and
    // two updates in one event both land.
    const draft = structuredClone(docRef.current) as DraftDoc;
    mutate(draft);
    docRef.current = draft as Portfolio;
    dispatch({ type: 'change', doc: draft as Portfolio, key });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  /* --- Autosave --------------------------------------------------------- */

  const [status, setStatus] = useState<SaveStatus>('saved');
  const [error, setError] = useState<string | null>(null);
  /**
   * Versions this editor wrote recently, with when. Each save rewrites
   * portfolio.json, hot reload hands the new file back in as `source`, and by
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
          body: JSON.stringify({ content: JSON.parse(json) }),
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
  }, [doc]);

  // The file changed under us: you edited portfolio.json by hand, reverted it,
  // or switched branches. Adopt it as a new step, which undo can still reverse.
  useEffect(() => {
    const json = JSON.stringify(source);
    const writtenAt = recentWrites.current.get(json);
    if (writtenAt !== undefined && Date.now() - writtenAt < ECHO_WINDOW_MS) return;
    lastWritten.current = json;
    if (json !== canonical(docRef.current)) dispatch({ type: 'change', doc: source });
  }, [source]);

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
    pendingFocus.current = { id, at };
    // Wait a frame: the field may only now be rendering (a new block) or be
    // about to be re-rendered (after a delete).
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

  const store = useMemo<EditorStore>(
    () => ({
      doc,
      update,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      status,
      error,
      activeTab: Math.min(activeTab, doc.tabs.length - 1),
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
      selectedBlock,
      focusField,
      registerField,
      richEditor,
      linkRequest,
      requestLink,
    ],
  );

  return <EditorContext.Provider value={store}>{children}</EditorContext.Provider>;
}
