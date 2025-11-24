"use client";

import { type RefObject, useEffect, useState } from "react";
import type { CursorPosition, SelectionState } from "../types/documents.ts";

interface UseSelectionSyncResult {
  selection: SelectionState;
  cursorPosition: CursorPosition;
  editorHasFocus: boolean;
}

/**
 * Custom hook to synchronize text selection and cursor position between the editor and preview
 */
export default function useSelectionSync(
  textareaRef: RefObject<HTMLTextAreaElement>,
  previewRef: RefObject<HTMLDivElement>,
): UseSelectionSyncResult {
  const [selection, setSelection] = useState<SelectionState>({
    start: 0,
    end: 0,
    active: false,
    text: "",
  });

  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    line: 1,
    column: 1,
    charIndex: 0,
  });

  const [editorHasFocus, setEditorHasFocus] = useState(false);

  const handleEditorSelection = () => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value.substring(start, end);

    setSelection({
      start,
      end,
      active: start !== end,
      text,
    });

    const textUpToCursor = textareaRef.current.value.substring(0, end);
    const lines = textUpToCursor.split("\n");
    const lineNumber = lines.length;
    const columnNumber = lines[lines.length - 1].length + 1;

    setCursorPosition({
      line: lineNumber,
      column: columnNumber,
      charIndex: end,
    });
  };

  const handleEditorFocus = () => setEditorHasFocus(true);
  const handleEditorBlur = () => setEditorHasFocus(false);

  const highlightPreviewSelection = () => {
    if (!previewRef.current || !selection.active) return;

    const existingHighlights = previewRef.current.querySelectorAll(
      ".preview-highlight",
    );
    existingHighlights.forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;

      const fragment = document.createDocumentFragment();
      while (el.firstChild) {
        fragment.appendChild(el.firstChild);
      }
      parent.replaceChild(fragment, el);
    });

    if (!selection.text) return;

    const previewContent = previewRef.current;
    const searchText = selection.text;

    if (searchText.trim() === "") return;

    const walker = document.createTreeWalker(
      previewContent,
      NodeFilter.SHOW_TEXT,
    );

    const textNodes: Text[] = [];
    let currentNode: Node | null;

    while ((currentNode = walker.nextNode())) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        textNodes.push(currentNode as Text);
      }
    }

    textNodes.forEach((node) => {
      const nodeText = node.textContent || "";
      const index = nodeText.indexOf(searchText);

      if (index > -1) {
        const highlightSpan = document.createElement("span");
        highlightSpan.className = "preview-highlight";

        const before = nodeText.substring(0, index);
        const matched = nodeText.substring(index, index + searchText.length);
        const after = nodeText.substring(index + searchText.length);

        const beforeNode = document.createTextNode(before);
        const matchedNode = document.createTextNode(matched);
        const afterNode = document.createTextNode(after);

        highlightSpan.appendChild(matchedNode);

        const parent = node.parentNode;
        if (parent) {
          parent.insertBefore(beforeNode, node);
          parent.insertBefore(highlightSpan, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);
        }
      }
    });
  };

  const updateCursorIndicator = () => {
    if (!previewRef.current || !editorHasFocus) return;

    const existingCursors = document.querySelectorAll(".preview-cursor");
    existingCursors.forEach((el) => el.remove());

    if (previewRef.current && textareaRef.current) {
      const cursorPos =
        textareaRef.current.value.substring(0, cursorPosition.charIndex)
          .length;
      const relativePos = textareaRef.current.value.length > 0
        ? cursorPos / textareaRef.current.value.length
        : 0;

      const cursorIndicator = document.createElement("div");
      cursorIndicator.className = "preview-cursor";
      cursorIndicator.style.position = "absolute";
      cursorIndicator.style.left = "0";
      cursorIndicator.style.width = "2px";
      cursorIndicator.style.backgroundColor = "#3b82f6";
      cursorIndicator.style.animation = "cursor-blink 1s infinite";

      previewRef.current.appendChild(cursorIndicator);

      setTimeout(() => {
        const previewDom = previewRef.current?.querySelector(".markdown-body");
        if (!previewDom) return;

        const allElements = Array.from(previewDom.querySelectorAll("*"));
        const totalElements = allElements.length;
        const targetIndex = Math.floor(totalElements * relativePos);
        const targetElement =
          allElements[Math.min(targetIndex, Math.max(totalElements - 1, 0))];

        if (targetElement && previewRef.current) {
          const rect = targetElement.getBoundingClientRect();
          const previewRect = previewRef.current.getBoundingClientRect();

          cursorIndicator.style.top = `${rect.top - previewRect.top}px`;
          cursorIndicator.style.height = `${rect.height}px`;
        }
      }, 0);
    }
  };

  useEffect(() => {
    if (!textareaRef.current) return undefined;

    textareaRef.current.addEventListener("select", handleEditorSelection);
    textareaRef.current.addEventListener("click", handleEditorSelection);
    textareaRef.current.addEventListener("keyup", handleEditorSelection);
    textareaRef.current.addEventListener("focus", handleEditorFocus);
    textareaRef.current.addEventListener("blur", handleEditorBlur);

    handleEditorSelection();

    return () => {
      if (!textareaRef.current) return;
      textareaRef.current.removeEventListener("select", handleEditorSelection);
      textareaRef.current.removeEventListener("click", handleEditorSelection);
      textareaRef.current.removeEventListener("keyup", handleEditorSelection);
      textareaRef.current.removeEventListener("focus", handleEditorFocus);
      textareaRef.current.removeEventListener("blur", handleEditorBlur);
    };
  }, [textareaRef]);

  useEffect(() => {
    highlightPreviewSelection();
  }, [selection, previewRef]);

  useEffect(() => {
    updateCursorIndicator();
  }, [cursorPosition, editorHasFocus, previewRef]);

  return {
    selection,
    cursorPosition,
    editorHasFocus,
  };
}
