"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import ImageExtension from "@tiptap/extension-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Heading2,
  Heading3,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Mic,
  MicOff,
  Languages,
  FileDown,
  FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-client";
import { useVoiceDictation } from "@/hooks/useVoiceDictation";

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-600 transition-colors hover:bg-parchment-200 dark:text-parchment-300 dark:hover:bg-ink-800",
        active &&
          "bg-gold-100 text-gold-700 dark:bg-ink-800 dark:text-gold-400",
      )}
    >
      {children}
    </button>
  );
}

const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Deutsch" },
  { code: "ig", label: "Igbo" },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yorùbá" },
] as const;

const normalizeArticleText = (text: string) => {
  let normalized = text.replace(/\r\n?/g, "\n");

  normalized = normalized.replace(/\s+([,.;:!?])/g, "$1");
  normalized = normalized.replace(/([,.;:!?])([A-Za-z0-9])/g, "$1 $2");

  let result = "";
  let inDoubleQuote = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === '"') {
      const prev = normalized[index - 1] ?? "";
      const next = normalized[index + 1] ?? "";

      if (!inDoubleQuote && (!prev || /\s|\(|\[|\{/.test(prev))) {
        result += "“";
        inDoubleQuote = true;
        continue;
      }

      if (inDoubleQuote && (!next || /\s|\)|\]|\}|,|\.|;|:|!|\?/.test(next))) {
        result += "”";
        inDoubleQuote = false;
        continue;
      }

      result += "”";
      inDoubleQuote = false;
      continue;
    }

    if (char === "'") {
      result += "’";
      continue;
    }

    result += char;
  }

  normalized = result;
  normalized = normalized.replace(/[ \t]+\n/g, "\n");
  normalized = normalized.replace(/\n{3,}/g, "\n\n");

  return normalized.trim();
};

export default function RichTextEditor({
  title = "Untitled Article",
  value,
  onChange,
  placeholder = "Begin writing your message…",
}: {
  title?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const [showTranslationMenu, setShowTranslationMenu] = useState(false);
  const [spellMenu, setSpellMenu] = useState<{
    x: number;
    y: number;
    word: string;
    suggestions: string[];
    loading: boolean;
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const wordRangeRef = useRef<Range | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      ImageExtension.configure({
        HTMLAttributes: { class: "article-image" },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] font-serif-body leading-relaxed",
        lang: "en",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const handleCheckSpelling = useCallback(() => {
    if (!editor) return;

    editor.commands.focus();
    toast.info(
      "Spellcheck is enabled. Right-click a highlighted word to see correction options.",
    );
  }, [editor]);

  const getWordAtPoint = useCallback((clientX: number, clientY: number) => {
    const range = document.caretRangeFromPoint(clientX, clientY);

    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
      return null;
    }

    const textNode = range.startContainer;
    const text = textNode.textContent ?? "";
    const offset = range.startOffset;

    let start = offset;
    while (start > 0 && /[A-Za-z]/.test(text[start - 1])) {
      start -= 1;
    }

    let end = offset;
    while (end < text.length && /[A-Za-z]/.test(text[end])) {
      end += 1;
    }

    const word = text.slice(start, end);

    if (word.length < 2 || !/[A-Za-z]/.test(word)) {
      return null;
    }

    const wordRange = document.createRange();
    wordRange.setStart(textNode, start);
    wordRange.setEnd(textNode, end);

    return { word, range: wordRange };
  }, []);

  const fetchSuggestions = useCallback(async (word: string) => {
    try {
      const response = await fetch(
        `https://api.datamuse.com/sug?s=${encodeURIComponent(word)}&max=5`,
      );

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as Array<{ word?: string }>;

      return data
        .map((item) => item.word)
        .filter(
          (item, index, list) =>
            Boolean(item) &&
            item!.toLowerCase() !== word.toLowerCase() &&
            list.findIndex(
              (entry) => entry?.toLowerCase() === item!.toLowerCase(),
            ) === index,
        )
        .slice(0, 5) as string[];
    } catch {
      return [];
    }
  }, []);

  const applySuggestion = useCallback(
    (suggestion: string) => {
      if (!wordRangeRef.current) {
        return;
      }

      const selection = window.getSelection();

      if (!selection) {
        return;
      }

      selection.removeAllRanges();
      selection.addRange(wordRangeRef.current);
      document.execCommand("insertText", false, suggestion);
      wordRangeRef.current = null;
      setSpellMenu(null);

      if (editor) {
        editor.commands.focus();
      }
    },
    [editor],
  );

  const handleEditorContextMenu = useCallback(
    async (event: React.MouseEvent<HTMLDivElement>) => {
      if (!editor) {
        return;
      }

      const match = getWordAtPoint(event.clientX, event.clientY);

      if (!match) {
        setSpellMenu(null);
        return;
      }

      event.preventDefault();
      wordRangeRef.current = match.range;
      setSpellMenu({
        x: event.clientX,
        y: event.clientY,
        word: match.word,
        suggestions: [],
        loading: true,
      });

      const suggestions = await fetchSuggestions(match.word);

      setSpellMenu((current) => {
        if (!current || current.word !== match.word) {
          return current;
        }

        return {
          ...current,
          suggestions,
          loading: false,
        };
      });
    },
    [editor, fetchSuggestions, getWordAtPoint],
  );

  // Keep the editor in sync if the value is replaced externally
  // (e.g. loading a draft).
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Voice dictation: each finalized phrase from the browser's speech
  // recognition is inserted at the current cursor position.
  const handleDictationResult = useCallback(
    (text: string) => {
      if (!editor) return;

      const trimmed = normalizeArticleText(text);
      if (!trimmed) return;

      const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

      editor
        .chain()
        .focus()
        .insertContent(formatted + " ")
        .run();
    },
    [editor],
  );

  const {
    mode: dictationMode,
    isSupported: dictationSupported,
    isListening,
    isTranscribing,
    interimText,
    error: dictationError,
    start: startDictation,
    stop: stopDictation,
  } = useVoiceDictation(handleDictationResult);

  useEffect(() => {
    if (dictationError) {
      toast.error(dictationError);
    }
  }, [dictationError]);

  if (!editor) return null;

  const formatTextAsEditorHtml = (text: string) => {
    const cleanedText = normalizeArticleText(text);

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const lines = cleanedText.split("\n");
    const html: string[] = [];
    let listType: "ul" | "ol" | null = null;

    const closeList = () => {
      if (listType) html.push(`</${listType}>`);
      listType = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);

      if (!trimmed) {
        closeList();
        continue;
      }

      if (unordered || ordered) {
        const nextListType = unordered ? "ul" : "ol";
        if (listType !== nextListType) {
          closeList();
          html.push(`<${nextListType}>`);
          listType = nextListType;
        }

        html.push(`<li>${escapeHtml((unordered ?? ordered)?.[1] ?? "")}</li>`);
        continue;
      }

      closeList();
      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        const level = Math.min(heading[1].length + 1, 3);
        html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      } else {
        html.push(`<p>${escapeHtml(trimmed)}</p>`);
      }
    }

    closeList();

    return html.join("");
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;

    const url = window.prompt("Link URL", previousUrl || "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const sanitizeTranslatedHtml = (value: string) => {
    if (!value) return "";

    return value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<\/div>\s*<div[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const handleTranslateSelection = async (targetLanguage: string) => {
    const text = editor.getText().trim();

    if (!text) {
      toast.error("Add some article content before translating.");

      setShowTranslationMenu(false);
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/translate/text"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          text,
          title: title || "Article",
          articleTitle: title || "Article",
          targetLanguage,
          language: targetLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Translation failed");
      }

      const translatedText =
        data?.translatedText ??
        data?.data?.translatedText ??
        data?.translation?.translatedText ??
        data?.text ??
        "";

      if (!translatedText) {
        throw new Error("Translation response was empty.");
      }

      const safeTranslatedText = sanitizeTranslatedHtml(translatedText);

      editor
        .chain()
        .focus()
        .insertContent(
          `\n\n<p><strong>Translation (${targetLanguage})</strong></p><p>${safeTranslatedText}</p>\n\n`,
        )
        .run();

      toast.success("Translation inserted into the article.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Translation failed. Try again.",
      );
    } finally {
      setShowTranslationMenu(false);
    }
  };

  const exportWordDocument = () => {
    const escapeHtml = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeTitle = escapeHtml(title.trim() || "Untitled Article");
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{font-family:Arial,sans-serif;color:#222;line-height:1.6;margin:40px}h1{font-size:26pt;margin-bottom:8px}h2,h3{margin-top:20px}p{margin:10px 0}blockquote{border-left:4px solid #999;margin:16px 0;padding-left:16px;color:#555}img{max-width:100%;height:auto}ul,ol{margin:10px 0 10px 24px}.metadata{color:#666;font-size:10pt;border-bottom:1px solid #ccc;padding-bottom:12px;margin-bottom:24px}</style></head><body><h1>${safeTitle}</h1><p class="metadata">Prepared on ${new Date().toLocaleDateString()}</p><div>${editor.getHTML()}</div></body></html>`;
    const blob = new Blob([htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title.trim() || "untitled-article")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.doc`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Word document downloaded.");
  };

  const importDocument = async (file: File) => {
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let text: string;

      if (extension === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        });
        text = result.value;
      } else if (extension === "pdf") {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const document = await pdfjs.getDocument({
          data: await file.arrayBuffer(),
          disableWorker: true,
        } as Parameters<typeof pdfjs.getDocument>[0]).promise;
        const pages: string[] = [];

        for (
          let pageNumber = 1;
          pageNumber <= document.numPages;
          pageNumber += 1
        ) {
          const page = await document.getPage(pageNumber);
          const textContent = await page.getTextContent();
          pages.push(
            textContent.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" "),
          );
        }

        text = pages.join("\n\n");
        document.cleanup();
      } else if (
        extension === "txt" ||
        extension === "md" ||
        extension === "markdown"
      ) {
        text = await file.text();
      } else {
        toast.error("Choose a Microsoft Word (.docx) or PDF (.pdf) file.");
        return;
      }

      editor.commands.setContent(formatTextAsEditorHtml(text), {
        emitUpdate: true,
      });
      toast.success("Document imported into the article.");
    } catch {
      toast.error("Could not read that document.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-parchment-300 bg-white shadow-sm dark:border-ink-700 dark:bg-ink-900">
      <div className="flex flex-nowrap items-center gap-0.5 overflow-x-auto border-b border-parchment-200 bg-parchment-50 px-2 py-1.5 dark:border-ink-800 dark:bg-ink-950">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={17} />
        </ToolbarButton>

        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={17} />
        </ToolbarButton>

        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={17} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-parchment-300 dark:bg-ink-700" />

        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={17} />
        </ToolbarButton>

        <ToolbarButton
          label="Subheading"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 size={17} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-parchment-300 dark:bg-ink-700" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={17} />
        </ToolbarButton>

        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={17} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-parchment-300 dark:bg-ink-700" />

        <ToolbarButton
          label="Align left"
          active={editor.isActive({
            textAlign: "left",
          })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={17} />
        </ToolbarButton>

        <ToolbarButton
          label="Align center"
          active={editor.isActive({
            textAlign: "center",
          })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={17} />
        </ToolbarButton>

        <ToolbarButton
          label="Align right"
          active={editor.isActive({
            textAlign: "right",
          })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={17} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-parchment-300 dark:bg-ink-700" />

        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <LinkIcon size={17} />
        </ToolbarButton>

        <ToolbarButton
          label="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={17} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-parchment-300 dark:bg-ink-700" />

        <ToolbarButton
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={17} />
        </ToolbarButton>

        <ToolbarButton
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={17} />
        </ToolbarButton>

        <div className="flex shrink-0 items-center">
          {dictationSupported && (
            <>
              <div className="mx-1 h-5 w-px bg-parchment-300 dark:bg-ink-700" />

              <ToolbarButton
                label={
                  isListening
                    ? "Stop voice dictation"
                    : dictationMode === "cloud"
                      ? "Start voice dictation (cloud)"
                      : "Start voice dictation"
                }
                active={isListening}
                onClick={() =>
                  isListening ? stopDictation() : startDictation()
                }
              >
                {isListening ? (
                  <Mic size={17} className="text-red-500" />
                ) : (
                  <MicOff size={17} />
                )}
              </ToolbarButton>
            </>
          )}

          <div className="relative flex items-center">
            <div className="mx-1 h-5 w-px bg-parchment-300 dark:bg-ink-700" />

            <ToolbarButton
              label="Translate article"
              onClick={() => setShowTranslationMenu((current) => !current)}
            >
              <Languages size={17} />
            </ToolbarButton>
          </div>

          <ToolbarButton
            label="Format and download as Word document"
            onClick={exportWordDocument}
          >
            <FileDown size={17} />
          </ToolbarButton>

          <ToolbarButton
            label="Import Word or PDF document"
            onClick={() => importInputRef.current?.click()}
          >
            <FileUp size={17} />
          </ToolbarButton>

          <input
            ref={importInputRef}
            type="file"
            accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importDocument(file);
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-parchment-200 bg-parchment-50 px-4 py-2 text-xs text-ink-600 dark:border-ink-800 dark:bg-ink-950 dark:text-parchment-300">
        <span>
          Spellcheck is enabled. Right-click a highlighted word to see
          correction options.
        </span>

        <button
          type="button"
          onClick={handleCheckSpelling}
          className="rounded-md border border-parchment-300 bg-white px-2.5 py-1 font-medium text-ink-700 transition hover:bg-parchment-100 dark:border-ink-700 dark:bg-ink-900 dark:text-parchment-200 dark:hover:bg-ink-800"
        >
          Check spelling
        </button>
      </div>

      {showTranslationMenu && (
        <div className="absolute right-2 top-12 z-30 w-44 rounded-xl border border-parchment-300 bg-white p-2 shadow-lg dark:border-ink-700 dark:bg-ink-900">
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => handleTranslateSelection(language.code)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink-700 transition hover:bg-parchment-100 dark:text-parchment-200 dark:hover:bg-ink-800"
            >
              <span>{language.label}</span>

              <span className="text-[10px] uppercase tracking-wide text-ink-400 dark:text-parchment-500">
                {language.code}
              </span>
            </button>
          ))}
        </div>
      )}

      {isListening && (
        <div className="flex items-center gap-2 border-b border-parchment-200 bg-red-50 px-4 py-1.5 text-xs text-ink-500 dark:border-ink-800 dark:bg-red-950/20 dark:text-parchment-400">
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />

          <span className="shrink-0 font-medium text-red-600 dark:text-red-400">
            {dictationMode === "cloud" && isTranscribing
              ? "Transcribing…"
              : "Listening…"}
          </span>

          {interimText && (
            <span className="truncate italic">{interimText}</span>
          )}
        </div>
      )}

      <div
        className="px-5 py-4 sm:px-8 sm:py-6"
        onContextMenu={handleEditorContextMenu}
        onPaste={(event) => {
          const pastedText = event.clipboardData?.getData("text/plain")?.trim();

          if (!pastedText) return;

          event.preventDefault();
          editor.commands.focus();
          editor.commands.insertContent(formatTextAsEditorHtml(pastedText));
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {spellMenu && (
        <div
          className="fixed z-50 min-w-56 rounded-xl border border-parchment-300 bg-white p-2 shadow-xl dark:border-ink-700 dark:bg-ink-900"
          style={{
            left: spellMenu.x + 12,
            top: spellMenu.y + 10,
          }}
        >
          <div className="mb-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500 dark:text-parchment-400">
            Correct word
          </div>

          <div className="mb-2 rounded-lg bg-parchment-100 px-2 py-1 text-sm text-ink-700 dark:bg-ink-800 dark:text-parchment-200">
            {spellMenu.word}
          </div>

          {spellMenu.loading ? (
            <div className="px-2 py-1 text-sm text-ink-500 dark:text-parchment-400">
              Loading suggestions…
            </div>
          ) : spellMenu.suggestions.length > 0 ? (
            <div className="space-y-1">
              {spellMenu.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-ink-700 transition hover:bg-parchment-100 dark:text-parchment-200 dark:hover:bg-ink-800"
                >
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-1 text-sm text-ink-500 dark:text-parchment-400">
              No suggestions found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
