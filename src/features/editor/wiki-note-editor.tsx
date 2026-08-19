"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { RangeSetBuilder, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import {
  STORY_DOCUMENT_DRAG_TYPE,
  findWikiLinks,
  insertAt,
  wikiLinkFor,
} from "~/lib/wiki-links";

type LinkTarget = { id: string; title: string };

function wikiLinkExtension(
  targets: LinkTarget[],
  onOpen: (documentId: string) => void,
  onDropDocument: (documentId: string, position: number) => void,
): Extension {
  const targetByTitle = new Map(
    targets.map((target) => [target.title.toLocaleLowerCase(), target]),
  );
  const buildDecorations = (text: string) => {
    const builder = new RangeSetBuilder<Decoration>();
    for (const link of findWikiLinks(text)) {
      const exists = targetByTitle.has(link.title.toLocaleLowerCase());
      builder.add(
        link.from,
        link.to,
        Decoration.mark({
          class: exists ? "cm-wiki-link" : "cm-wiki-link cm-wiki-link-broken",
          attributes: {
            title: exists
              ? "Ctrl/Cmd-click to open note"
              : "This note does not exist",
          },
        }),
      );
    }
    return builder.finish();
  };
  const decorations = StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state.doc.toString()),
    update: (value, transaction) =>
      transaction.docChanged
        ? buildDecorations(transaction.newDoc.toString())
        : value,
    provide: (field) => EditorView.decorations.from(field),
  });
  return [
    decorations,
    EditorView.domEventHandlers({
      mousedown(event, view) {
        if (!event.ctrlKey && !event.metaKey) return false;
        const position = view.posAtCoords({
          x: event.clientX,
          y: event.clientY,
        });
        if (position == null) return false;
        const link = findWikiLinks(view.state.doc.toString()).find(
          (item) => position >= item.from && position <= item.to,
        );
        if (!link) return false;
        const target = targetByTitle.get(link.title.toLocaleLowerCase());
        if (!target) return false;
        event.preventDefault();
        onOpen(target.id);
        return true;
      },
      drop(event, view) {
        const documentId = event.dataTransfer?.getData(
          STORY_DOCUMENT_DRAG_TYPE,
        );
        if (!documentId) return false;
        const position =
          view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
          view.state.selection.main.head;
        event.preventDefault();
        onDropDocument(documentId, position);
        return true;
      },
    }),
    EditorView.lineWrapping,
  ];
}

export function WikiNoteEditor({
  value,
  documents,
  readOnly,
  onChange,
  onOpenDocument,
}: {
  value: string;
  documents: LinkTarget[];
  readOnly: boolean;
  onChange: (value: string) => void;
  onOpenDocument: (documentId: string) => void;
}) {
  const documentById = useMemo(
    () => new Map(documents.map((document) => [document.id, document])),
    [documents],
  );
  const extensions = useMemo(
    () => [
      wikiLinkExtension(documents, onOpenDocument, (documentId, position) => {
        const target = documentById.get(documentId);
        if (!target) return;
        onChange(insertAt(value, wikiLinkFor(target.title), position));
      }),
    ],
    [documentById, documents, onChange, onOpenDocument, value],
  );
  return (
    <CodeMirror
      aria-label="Document content"
      className="wiki-note-editor"
      value={value}
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        autocompletion: false,
        bracketMatching: false,
      }}
      extensions={extensions}
      onChange={onChange}
    />
  );
}
