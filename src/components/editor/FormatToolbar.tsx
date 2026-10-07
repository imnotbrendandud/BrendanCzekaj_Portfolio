'use client';

import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { sanitizeHref } from '@/lib/inline';
import { useEditorStore } from './store';

/**
 * Floats above selected text in a formatted field: bold, italic, highlight,
 * link, and clear. Every button also has a keyboard shortcut.
 */
export function FormatToolbar() {
  const { richEditor: editor, linkRequest } = useEditorStore();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [linking, setLinking] = useState(false);
  const [href, setHref] = useState('');
  const [linkError, setLinkError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Follow the selection and the active marks.
  useEffect(() => {
    if (!editor) return;
    const refresh = () => rerender();
    const onBlur = () => {
      // Moving focus into the link field shouldn't close the toolbar.
      requestAnimationFrame(() => {
        if (!toolbarRef.current?.contains(document.activeElement)) setLinking(false);
        rerender();
      });
    };
    editor.on('selectionUpdate', refresh);
    editor.on('transaction', refresh);
    editor.on('blur', onBlur);
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('transaction', refresh);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  // ⌘K: open the link field for the current selection or link.
  useEffect(() => {
    if (!linkRequest || !editor) return;
    if (editor.state.selection.empty && !editor.isActive('link')) return;
    openLink();
    // openLink only reads the editor; linkRequest is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkRequest]);

  useEffect(() => {
    if (linking) inputRef.current?.focus();
  }, [linking]);

  if (!editor || editor.isDestroyed) return null;
  const { from, to, empty } = editor.state.selection;
  const visible = linking || (editor.isFocused && !empty);
  if (!visible) return null;

  // Centre over the selection, just above it.
  const start = editor.view.coordsAtPos(from);
  const end = editor.view.coordsAtPos(to);
  const left = (start.left + end.right) / 2;
  const top = Math.min(start.top, end.top) - 10;

  function openLink() {
    if (!editor) return;
    setHref((editor.getAttributes('link').href as string | undefined) ?? '');
    setLinkError(false);
    setLinking(true);
  }

  const applyLink = (event: FormEvent) => {
    event.preventDefault();
    const chain = editor.chain().focus().extendMarkRange('link');
    const target = href.trim();
    if (!target) {
      chain.unsetLink().run();
    } else if (sanitizeHref(target) === null) {
      setLinkError(true);
      return;
    } else {
      chain.setLink({ href: target }).run();
    }
    setLinking(false);
  };

  const buttons = [
    {
      label: 'B',
      title: 'Bold (⌘B)',
      mark: 'bold',
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'I',
      title: 'Italic (⌘I)',
      mark: 'italic',
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'HI',
      title: 'Highlight (⌘⇧H)',
      mark: 'highlight',
      run: () => editor.chain().focus().toggleHighlight().run(),
    },
    { label: '🔗', title: 'Link (⌘K)', mark: 'link', run: openLink },
    {
      label: '⌫',
      title: 'Clear formatting',
      mark: null,
      run: () => editor.chain().focus().unsetAllMarks().run(),
    },
  ] as const;

  return (
    <div
      ref={toolbarRef}
      className="format-toolbar"
      role="toolbar"
      aria-label="Text formatting"
      style={{ left, top }}
      // Keep the text selection: clicking a button mustn't blur the field.
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
      }}
    >
      {linking ? (
        <form className="format-link" onSubmit={applyLink}>
          <input
            ref={inputRef}
            type="text"
            value={href}
            placeholder="https://… (empty removes)"
            aria-label="Link address"
            aria-invalid={linkError}
            onChange={(e) => {
              setHref(e.target.value);
              setLinkError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setLinking(false);
                editor.commands.focus();
              }
            }}
          />
          <button type="submit">OK</button>
        </form>
      ) : (
        buttons.map((button) => (
          <button
            key={button.title}
            type="button"
            title={button.title}
            aria-label={button.title}
            aria-pressed={button.mark ? editor.isActive(button.mark) : undefined}
            data-mark={button.mark ?? undefined}
            onClick={button.run}
          >
            {button.label}
          </button>
        ))
      )}
    </div>
  );
}
