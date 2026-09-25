"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Loader2, Eye, Save, Send, Trash2 } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import AudioUploadField from "@/components/admin/AudioUploadField";
import PreviewModal from "@/components/admin/PreviewModal";
import DeleteDialog from "@/components/admin/DeleteDialog";
import VersionHistory from "@/components/admin/VersionHistory";
import TagsManager from "@/components/admin/TagsManager";
import SeriesForm from "@/components/admin/SeriesForm";
import SchedulePublishForm from "@/components/admin/SchedulePublishForm";
import ApprovedCommentsSection from "@/components/admin/ApprovedCommentsSection";
import { apiUrl } from "@/lib/api-client";
import {
  getProofreadingState,
  getProofreadingLabel,
  saveProofreadingState,
  type ProofreadingStatus,
} from "@/lib/proofreading";
import type { Profile } from "@/types/profile";
import type { ArticleTag, ArticleVersion } from "@/types/article";

const RichTextEditor = dynamic(
  () => import("@/components/editor/RichTextEditor"),
  {
    loading: () => (
      <div className="min-h-100 animate-pulse rounded-lg bg-parchment-200 dark:bg-ink-800" />
    ),
  },
);

type Status = "DRAFT" | "PUBLISHED";
type SaveState = "idle" | "saving" | "saved" | "unsaved" | "error";
const PUBLISH_SOUND_KEY = "publishing-studio:publish-sound-enabled";
const PUBLISH_VOICE_KEY = "publishing-studio:next-publish-voice";

function speakArticleAnnouncement(message: string) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(PUBLISH_SOUND_KEY) === "false") return;
  if (!("speechSynthesis" in window)) return;

  const nextVoice =
    window.localStorage.getItem(PUBLISH_VOICE_KEY) === "female"
      ? "female"
      : "male";
  window.localStorage.setItem(
    PUBLISH_VOICE_KEY,
    nextVoice === "male" ? "female" : "male",
  );

  window.speechSynthesis.cancel();
  const announcement = new SpeechSynthesisUtterance(message);
  announcement.rate = 0.95;
  announcement.pitch = nextVoice === "female" ? 1.1 : 0.85;
  announcement.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const voiceNames = {
    female: /female|woman|girl|samantha|karen|zira|victoria|susan|anna|sara/i,
    male: /male|man|boy|david|mark|daniel|george|alex|james/i,
  };
  const matchingVoice = voices.find((voice) =>
    voiceNames[nextVoice].test(voice.name),
  );
  if (matchingVoice) announcement.voice = matchingVoice;

  window.speechSynthesis.speak(announcement);
}

function announcePublishedArticle() {
  speakArticleAnnouncement("Article published");
}

function announceScheduledArticle() {
  speakArticleAnnouncement("Article scheduled to publish");
}

export default function ArticleEditorForm({
  initial,
  profile,
}: {
  initial: {
    id: string | null;
    title: string;
    content: string;
    excerpt: string | null;
    featuredImage: string | null;
    audioUrl?: string | null;
    status: Status;
    slug?: string;
    tags?: ArticleTag[];
    versions?: ArticleVersion[];
    seriesId?: string | null;
    scheduledPublishAt?: string | null;
    proofreadingStatus?: ProofreadingStatus;
    proofreadingNotes?: string | null;
  };
  profile?: Profile | null;
}) {
  const router = useRouter();
  const [id, setId] = useState(initial.id);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [proofreadingStatus, setProofreadingStatus] =
    useState<ProofreadingStatus>(
      initial.proofreadingStatus ?? getProofreadingState(initial.id).status,
    );
  const [proofreadingNotes, setProofreadingNotes] = useState(
    initial.proofreadingNotes ?? getProofreadingState(initial.id).notes,
  );
  const [featuredImage, setFeaturedImage] = useState<string | null>(
    initial.featuredImage,
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(
    initial.audioUrl ?? null,
  );
  const [status, setStatus] = useState<Status>(initial.status);
  const [tags, setTags] = useState<ArticleTag[]>(initial.tags ?? []);
  const [seriesId, setSeriesId] = useState<string | null>(
    initial.seriesId ?? null,
  );
  const [scheduledPublishAt, setScheduledPublishAt] = useState<string | null>(
    initial.scheduledPublishAt ?? null,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  function restoreVersion(version: ArticleVersion) {
    setTitle(version.title);
    setContent(version.content);
    toast.success("Version restored. Saving changes...");
  }

  const idRef = useRef(id);
  const dirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(true); // don't autosave on initial mount

  useEffect(() => {
    idRef.current = id;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    saveProofreadingState(id, {
      status: proofreadingStatus,
      notes: proofreadingNotes,
    });
  }, [id, proofreadingStatus, proofreadingNotes]);

  const persist = useCallback(
    async (overrideStatus?: Status, opts?: { silent?: boolean }) => {
      const currentId = idRef.current;
      const payload = {
        title: title.trim() || "Untitled article",
        content,
        featuredImage: featuredImage || "",
        audioUrl: audioUrl || "",
        tags: tags.map(({ name, slug }) => ({ name, slug })),
        scheduledPublishAt,
        status: overrideStatus ?? status,
        proofreadingStatus,
        proofreadingNotes,
      };

      try {
        if (!opts?.silent) setSaveState("saving");

        if (!currentId) {
          const res = await fetch(apiUrl("/api/admin/articles"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setId(data.article.id);
          idRef.current = data.article.id;
          if (overrideStatus) setStatus(overrideStatus);
          window.history.replaceState(
            null,
            "",
            `/admin/articles/${data.article.id}/edit`,
          );
        } else {
          const res = await fetch(apiUrl(`/api/admin/articles/${currentId}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          if (overrideStatus) setStatus(overrideStatus);
        }
        dirtyRef.current = false;
        setSaveState("saved");
        return true;
      } catch (err) {
        setSaveState("error");
        if (!opts?.silent) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Something went wrong while saving.",
          );
        }
        return false;
      }
    },
    [
      title,
      content,
      featuredImage,
      audioUrl,
      tags,
      scheduledPublishAt,
      status,
      proofreadingStatus,
      proofreadingNotes,
    ],
  );

  // Debounced autosave whenever article fields change.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    dirtyRef.current = true;
    setSaveState("unsaved");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (dirtyRef.current) persist(undefined, { silent: true });
    }, 60000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, featuredImage, audioUrl, tags, scheduledPublishAt]);

  async function handleSaveDraft() {
    setSavingDraft(true);
    const ok = await persist("DRAFT");
    setSavingDraft(false);
    if (ok) {
      if (scheduledPublishAt) {
        announceScheduledArticle();
        toast.success("Article scheduled to publish.");
      } else {
        toast.success(id ? "Changes saved." : "Article created successfully.");
      }
      router.refresh();
    }
  }

  async function handlePublish() {
    setPublishing(true);
    const shouldSchedule = Boolean(scheduledPublishAt);
    const ok = await persist(shouldSchedule ? "DRAFT" : "PUBLISHED");
    setPublishing(false);
    if (ok) {
      if (shouldSchedule) {
        announceScheduledArticle();
        toast.success("Article scheduled to publish.");
        router.push("/admin/scheduled");
      } else {
        announcePublishedArticle();
        toast.success("Article published successfully.");
        router.refresh();
      }
    }
  }

  async function handleDelete() {
    if (!id) {
      router.push("/admin/articles");
      return;
    }
    const res = await fetch(apiUrl(`/api/admin/articles/${id}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast.success("Article deleted successfully.");
      router.push("/admin/articles");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(
        data.error || "Something went wrong while deleting the article.",
      );
    }
    setDeleteOpen(false);
  }

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Couldn't save"
          : saveState === "unsaved"
            ? "Unsaved changes"
            : "";

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
          {id ? "Edit Article" : "Create Article"}
        </h1>
        <span
          className={
            "text-xs font-medium " +
            (saveState === "error"
              ? "text-red-600"
              : saveState === "unsaved"
                ? "text-gold-700 dark:text-gold-400"
                : "text-ink-400 dark:text-parchment-400")
          }
        >
          {saveLabel}
        </span>
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
            Article Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Walking by Faith When You Cannot See the Way"
            className="w-full rounded-xl border border-parchment-300 bg-white px-4 py-3 font-display text-xl text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-900 dark:text-parchment-50"
          />
        </div>

        <ImageUploadField
          value={featuredImage}
          onChange={setFeaturedImage}
          folder="articles"
        />

        <AudioUploadField value={audioUrl} onChange={setAudioUrl} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
            Article Content
          </label>
          <RichTextEditor title={title} value={content} onChange={setContent} />
        </div>

        <div className="rounded-2xl border border-parchment-300 bg-parchment-50 p-4 dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
                Proofreading
              </p>
              <p className="text-sm text-ink-500 dark:text-parchment-300">
                Keep a final editorial pass before publishing.
              </p>
            </div>
            <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-700 dark:bg-gold-400/15 dark:text-gold-300">
              {getProofreadingLabel(proofreadingStatus)}
            </span>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProofreadingStatus("requested")}
              className="rounded-full border border-parchment-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-parchment-100 dark:border-ink-700 dark:text-parchment-200 dark:hover:bg-ink-800"
            >
              Request proofreading
            </button>
            <button
              type="button"
              onClick={() => setProofreadingStatus("in_progress")}
              className="rounded-full border border-parchment-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-parchment-100 dark:border-ink-700 dark:text-parchment-200 dark:hover:bg-ink-800"
            >
              Mark in progress
            </button>
            <button
              type="button"
              onClick={() => setProofreadingStatus("approved")}
              className="rounded-full border border-parchment-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-parchment-100 dark:border-ink-700 dark:text-parchment-200 dark:hover:bg-ink-800"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => {
                setProofreadingStatus("not_started");
                setProofreadingNotes("");
              }}
              className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/20"
            >
              Reset
            </button>
          </div>

          <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-ink-500 dark:text-parchment-400">
            Proofreading notes
          </label>
          <textarea
            value={proofreadingNotes}
            onChange={(e) => setProofreadingNotes(e.target.value)}
            rows={4}
            placeholder="Add line edits, style notes, or final checks here..."
            className="w-full rounded-xl border border-parchment-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-950 dark:text-parchment-50"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <TagsManager tags={tags} onChange={setTags} availableTags={[]} />
          <SchedulePublishForm
            value={scheduledPublishAt}
            onChange={setScheduledPublishAt}
          />
        </div>

        {id && (
          <>
            <SeriesForm
              articleId={id}
              currentSeriesId={seriesId}
              onSeriesChange={setSeriesId}
            />
            <VersionHistory
              versions={initial.versions}
              onRestore={restoreVersion}
            />
          </>
        )}

        {id && status === "PUBLISHED" && (
          <ApprovedCommentsSection articleId={id} />
        )}

        {id && (
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline"
          >
            <Trash2 size={14} /> Delete this article
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-parchment-300 bg-parchment-50/95 px-3 py-2.5 backdrop-blur md:left-64 md:px-4 md:py-3 dark:border-ink-800 dark:bg-ink-950/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <span className="hidden text-xs text-ink-400 dark:text-parchment-400 sm:inline">
            Status: {status === "PUBLISHED" ? "Published" : "Draft"}
          </span>
          <div className="flex flex-1 justify-end gap-1.5 sm:flex-none sm:gap-2">
            <button
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-parchment-300 px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-parchment-100 sm:px-4 dark:border-ink-700 dark:text-parchment-200 dark:hover:bg-ink-800"
            >
              <Eye size={15} /> Preview
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="flex items-center gap-1.5 rounded-full border border-parchment-300 px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-parchment-100 disabled:opacity-60 sm:px-4 dark:border-ink-700 dark:text-parchment-200 dark:hover:bg-ink-800"
            >
              {savingDraft ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Save Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-1.5 rounded-full bg-ink-900 px-3.5 py-2.5 text-sm font-semibold text-parchment-50 shadow-sm hover:bg-ink-800 disabled:opacity-60 sm:px-5 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
            >
              {publishing ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              {status === "PUBLISHED" ? "Publish Changes" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={title}
        content={content}
        featuredImage={featuredImage}
        pastorName={profile?.pastorName}
        pastorImage={profile?.profileImage}
        watermark={profile}
      />
      <DeleteDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
