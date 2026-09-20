"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import type { ArticleTag } from "@/types/article";

export default function TagsManager({
  tags = [],
  onChange,
  availableTags = [],
}: {
  tags?: ArticleTag[];
  onChange: (tags: ArticleTag[]) => void;
  availableTags?: ArticleTag[];
}) {
  const [selectedTags, setSelectedTags] = useState<ArticleTag[]>(tags);
  const [newTagName, setNewTagName] = useState("");

  const handleRemoveTag = (tagId: string) => {
    const updated = selectedTags.filter((t) => t.id !== tagId);
    setSelectedTags(updated);
    onChange(updated);
  };

  const handleAddTag = (tag: ArticleTag) => {
    if (!selectedTags.find((t) => t.id === tag.id)) {
      const updated = [...selectedTags, tag];
      setSelectedTags(updated);
      onChange(updated);
    }
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      const newTag: ArticleTag = {
        id: `new-${Date.now()}`,
        name: newTagName,
        slug: newTagName.toLowerCase().replace(/\s+/g, "-"),
      };
      handleAddTag(newTag);
      setNewTagName("");
    }
  };

  const unselectedTags = availableTags.filter(
    (t) => !selectedTags.find((st) => st.id === t.id),
  );

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-ink-900 dark:text-parchment-50">
        Topics / Tags
      </legend>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-2 rounded-full bg-gold-100 px-3 py-1.5 text-sm font-medium text-gold-700 dark:bg-ink-800 dark:text-gold-400"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="rounded-full hover:bg-gold-200 dark:hover:bg-ink-700"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available tags dropdown */}
      {unselectedTags.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-ink-600 dark:text-parchment-400">
            Add Existing Topics
          </label>
          <div className="flex flex-wrap gap-2">
            {unselectedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleAddTag(tag)}
                className="rounded-full border border-parchment-300 bg-white px-3 py-1.5 text-sm text-ink-700 transition hover:bg-parchment-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-300 dark:hover:bg-ink-700"
              >
                <Plus size={14} className="mr-1 inline" />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create new tag */}
      <form onSubmit={handleCreateTag} className="space-y-2">
        <label className="text-xs font-medium text-ink-600 dark:text-parchment-400">
          Create New Topic
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="e.g., Study, Encouragement..."
            className="flex-1 rounded-lg border border-parchment-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
          />
          <button
            type="submit"
            className="rounded-lg bg-ink-900 px-3 py-2 text-sm font-semibold text-parchment-50 transition hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
          >
            Add
          </button>
        </div>
      </form>
    </fieldset>
  );
}
