'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Extension, type Editor as TiptapEditor, type JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extensions';
import { Selection } from '@tiptap/pm/state';
import { normalizeInline, sanitizeHref } from '@/lib/inline';
import { useEditorStore } from './store';

interface RichFieldProps {
  /** Names the field for focus hand-off (see model.ts). */
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * Formatted text (bold, italic, highlight, links), stored as the HTML subset
   * in lib/inline.ts. Off for labels and tags, which are plain text.
   */
  rich?: boolean;
  placeholder: string;
  label: string;
  className?: string;
  /** Enter. Fields are single-line, so this is where "new block" happens. */
  onEnter?: () => void;
  /** Backspace in an already-empty field: remove it. */
  onBackspaceEmpty?: () => void;
}

/** One line of editable copy. */
export function RichField({
  fieldId,
  value,
  onChange,
  rich = false,
  placeholder,
  label,
  className,
  onEnter,
  onBackspaceEmpty,
}: RichFieldProps) {
  const { registerField, setRichEditor, requestLink } = useEditorStore();

  // TipTap captures extensions once, so callbacks are read through a ref.
  const callbacks = useRef({ onChange, onEnter, onBackspaceEmpty });
  callbacks.current = { onChange, onEnter, onBackspaceEmpty };
  /** The last value this field reported, to tell our own echo from an undo. */
  const emitted = useRef(value);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        SingleLine,
        Paragraph,
        Text,
        Placeholder.configure({ placeholder }),
        ...(rich
          ? [
              Bold,
              Italic,
              Highlight,
              Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
                isAllowedUri: (url) => sanitizeHref(url) !== null,
              }),
            ]
          : []),
        Extension.create({
          name: 'fieldKeys',
          addKeyboardShortcuts() {
            return {
              Enter: () => {
                callbacks.current.onEnter?.();
                return true;
              },
              'Shift-Enter': () => true,
              Backspace: ({ editor }) => {
                if (!editor.isEmpty || !callbacks.current.onBackspaceEmpty) return false;
                callbacks.current.onBackspaceEmpty();
                return true;
              },
              'Mod-k': () => {
                if (rich) requestLink();
                return true;
              },
            };
          },
        }),
      ],
      content: toContent(value, rich),
      editorProps: {
        attributes: {
          'aria-label': label,
          class: 'rich-field-input',
          spellcheck: 'true',
        },
      },
      onUpdate: ({ editor }) => {
        const next = read(editor, rich);
        if (next === emitted.current) return;
        emitted.current = next;
        callbacks.current.onChange(next);
      },
      onFocus: ({ editor }) => setRichEditor(rich ? editor : null),
    },
    [],
  );

  // An undo, redo or outside change replaced the value: show it.
  useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    const hadFocus = editor.isFocused;
    editor.commands.setContent(toContent(value, rich), { emitUpdate: false });
    if (hadFocus) editor.commands.focus('end');
  }, [editor, value, rich]);

  useEffect(() => {
    if (!editor) return;
    return registerField(fieldId, (at) => focusNow(editor, at));
  }, [editor, fieldId, registerField]);

  return <EditorContent editor={editor} className={`rich-field ${className ?? ''}`} />;
}

/** Every field holds exactly one paragraph: Enter can't split it. */
const SingleLine = Document.extend({ content: 'paragraph' });

function toContent(value: string, rich: boolean): string | JSONContent {
  if (rich) return `<p>${value}</p>`;
  // Plain text goes in as a node, never as HTML, so "<" stays a character.
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: value ? [{ type: 'text', text: value }] : [] }],
  };
}

function read(editor: TiptapEditor, rich: boolean): string {
  if (!rich) return editor.getText();
  const html = editor.getHTML().replace(/^<p>|<\/p>$/g, '');
  return normalizeInline(html);
}

/**
 * Put the caret at the start or end and take focus, synchronously. TipTap's
 * own focus() command waits an animation frame (a mobile workaround), and
 * anything typed in that frame lands in the field being left: press Enter in
 * a company name, type straight away, and the bullet text would end up in
 * the company. ProseMirror's view focuses immediately.
 */
function focusNow(editor: TiptapEditor, at: 'start' | 'end') {
  const { state, view } = editor;
  const selection = at === 'start' ? Selection.atStart(state.doc) : Selection.atEnd(state.doc);
  view.dispatch(state.tr.setSelection(selection));
  view.focus();
}
