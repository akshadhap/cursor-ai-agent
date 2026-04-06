"use client";

import { useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import { stickyNotesAtom, type StickyNote } from "../store/atoms";
import { X } from "lucide-react";

type DraggableStickyNoteProps = {
  note: StickyNote;
  onChange: (note: StickyNote) => void;
  onDelete: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

const DraggableStickyNote = ({
  note,
  onChange,
  onDelete,
  containerRef,
}: DraggableStickyNoteProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const editorRef = useRef<HTMLDivElement | null>(null);
  const initializedFromNote = useRef(false);

  // keep track of last selection range inside the editor
  const lastRangeRef = useRef<Range | null>(null);

  // ---- initialize editor content ONCE from note.text ----
  useEffect(() => {
    if (editorRef.current && !initializedFromNote.current) {
      editorRef.current.innerHTML = note.text || "";
      initializedFromNote.current = true;
    }
  }, [note.id]);

  // ---- drag / resize logic ----
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      if (isDragging) {
        onChange({
          ...note,
          x: e.clientX - rect.left - dragOffset.current.x,
          y: e.clientY - rect.top - dragOffset.current.y,
        });
      }

      if (isResizing) {
        const newWidth = e.clientX - rect.left - note.x;
        const newHeight = e.clientY - rect.top - note.y;

        // 1. Minimum Size Fix: Increased limits to prevent shrinking too much
        onChange({
          ...note,
          width: Math.max(200, newWidth),
          height: Math.max(150, newHeight),
        });
      }
    };

    const handleMouseUp = () => {
      if (!isDragging && !isResizing) return;
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, note, onChange, containerRef]);

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - rect.left - note.x,
      y: e.clientY - rect.top - note.y,
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  // ---- selection helpers ----

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!editorRef.current) return;
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    lastRangeRef.current = range;
  };

  const restoreSelection = () => {
    const range = lastRangeRef.current;
    if (!range) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  // ---- rich text helpers ----

  const syncFromDom = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onChange({ ...note, text: html });
  };

  const exec = (command: string, value?: string) => {
    if (editorRef.current) {
      restoreSelection();
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    saveSelection();
    syncFromDom();
  };

  const handleCreateLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    exec("createLink", url);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    if (!color) return;
    exec("foreColor", color);
  };

  // font size: wrap selection in a span with style="font-size: Xpx"
  const applyFontSize = (size: string) => {
    if (!editorRef.current) return;

    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    
    // Note: This logic only works if text is selected.
    // If cursor is just blinking, it returns (standard browser limitation for manual DOM manipulation)
    if (range.collapsed) return; 
    
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    const span = document.createElement("span");
    span.style.fontSize = size;
    
    // Safely try to wrap contents. 
    // extractContents can fail on complex nested blocks (like lists), 
    // but works well for plain text selection.
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      saveSelection();
      syncFromDom();
    } catch (err) {
      console.warn("Could not apply font size to this selection", err);
    }
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    applyFontSize(val);
    
    // We don't want to keep the value in the select, otherwise clicking
    // the same size again won't trigger onChange.
    e.target.value = ""; 
  };

  const handleInput = () => {
    saveSelection();
    syncFromDom();
  };

  // 3. Link Click Handling
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveSelection();

    // Check if clicked element is a link
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    
    if (link && editorRef.current?.contains(link)) {
        // Allow opening the link. 
        // Note: contentEditable usually blocks this, so we do it manually.
        // You might want to require Ctrl+Click, but for sticky notes, direct click is often preferred.
        if (link.getAttribute("href")) {
            window.open(link.getAttribute("href")!, "_blank");
        }
    }
  };

  const preventLosingSelection = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div
      style={{
        position: "absolute",
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        zIndex: 20,
      }}
    >
      <div className="relative flex h-full flex-col rounded-2xl border border-yellow-200 bg-yellow-50/90 p-2 shadow-lg backdrop-blur-sm">
        {/* drag handle bar */}
        <div
          className="absolute inset-x-2 top-1 h-3 cursor-move rounded-full bg-yellow-200/70"
          onMouseDown={handleDragMouseDown}
        />

        {/* close button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-1 top-1 rounded-full p-0.5 text-[10px] text-yellow-900 hover:bg-yellow-200/80"
        >
          <X className="h-3 w-3" />
        </button>

        {/* toolbar */}
        <div className="mt-4 mb-2 flex flex-wrap items-center gap-1 rounded-full bg-yellow-100/80 px-2 py-1 text-[10px] shadow-sm">
          <button
            type="button"
            onMouseDown={preventLosingSelection}
            className="rounded-full border border-yellow-200 px-2 py-0.5 hover:bg-yellow-200/70"
            onClick={() => exec("undo")}
          >
            Undo
          </button>
          <button
            type="button"
            onMouseDown={preventLosingSelection}
            className="rounded-full border border-yellow-200 px-2 py-0.5 hover:bg-yellow-200/70"
            onClick={() => exec("redo")}
          >
            Redo
          </button>

          <span className="mx-1 h-4 w-px bg-yellow-800/20" />

          <button
            type="button"
            onMouseDown={preventLosingSelection}
            className="rounded-full border border-yellow-200 px-2 py-0.5 font-bold hover:bg-yellow-200/70"
            onClick={() => exec("bold")}
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={preventLosingSelection}
            className="rounded-full border border-yellow-200 px-2 py-0.5 hover:bg-yellow-200/70"
            onClick={() => exec("underline")}
          >
            <span className="underline">U</span>
          </button>

          <button
            type="button"
            onMouseDown={preventLosingSelection}
            className="rounded-full border border-yellow-200 px-2 py-0.5 hover:bg-yellow-200/70"
            onClick={() => exec("insertUnorderedList")}
          >
            • List
          </button>
          <button
            type="button"
            onMouseDown={preventLosingSelection}
            className="rounded-full border border-yellow-200 px-2 py-0.5 hover:bg-yellow-200/70"
            onClick={() => exec("insertOrderedList")}
          >
            1. List
          </button>

          <button
            type="button"
            onMouseDown={preventLosingSelection}
            className="rounded-full border border-yellow-200 px-2 py-0.5 hover:bg-yellow-200/70"
            onClick={handleCreateLink}
          >
            Link
          </button>

          {/* 4. Font Size Fix: Controlled value so repeated selection works */}
          <select
            className="rounded-full border border-yellow-200 px-1 py-0.5 text-[9px] hover:bg-yellow-200/70"
            value="" 
            onMouseDown={preventLosingSelection}
            onChange={handleFontSizeChange}
          >
            <option value="" disabled>Size</option>
            <option value="11px">11</option>
            <option value="13px">13</option>
            <option value="15px">15</option>
            <option value="17px">17</option>
            <option value="20px">20</option>
          </select>

          <label className="ml-1 inline-flex items-center gap-1 rounded-full border border-yellow-200 px-2 py-0.5 text-[9px] hover:bg-yellow-200/70">
            <span>Color</span>
            <input
              type="color"
              className="h-4 w-4 cursor-pointer rounded-full border border-yellow-300 bg-transparent p-0"
              onMouseDown={preventLosingSelection}
              onChange={handleColorChange}
            />
          </label>
        </div>

        {/* rich text body */}
        <div
          ref={editorRef}
          // 2. List & Link CSS Fixes:
          // Tailwind resets lists, so we must explicitly add list styles for children.
          // We also explicitly style anchor tags so they look clickable.
          className={`
            flex-1 rounded-xl bg-yellow-50/60 px-2 py-1 text-xs leading-snug outline-none 
            overflow-auto
            [&_ul]:list-disc [&_ul]:pl-5 
            [&_ol]:list-decimal [&_ol]:pl-5 
            [&_a]:underline [&_a]:text-blue-600 [&_a]:cursor-pointer
          `}
          contentEditable
          suppressContentEditableWarning
          onClick={handleContentClick} 
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onInput={handleInput}
        />

        {/* resize handle */}
        <div
          data-resize-handle="true"
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize rounded-sm border border-yellow-700 bg-yellow-200"
        />
      </div>
    </div>
  );
};

export const StickyNotesOverlay = ({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const [stickyNotes, setStickyNotes] = useAtom(stickyNotesAtom);

  return (
    <>
      {stickyNotes.map((note) => (
        <DraggableStickyNote
          key={note.id}
          note={note}
          containerRef={containerRef}
          onChange={(updated) =>
            setStickyNotes((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n)),
            )
          }
          onDelete={() =>
            setStickyNotes((prev) => prev.filter((n) => n.id !== note.id))
          }
        />
      ))}
    </>
  );
};