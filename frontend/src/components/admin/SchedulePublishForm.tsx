"use client";

import { useState } from "react";
import { Calendar, Clock } from "lucide-react";

function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export default function SchedulePublishForm({
  value = null,
  onChange,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
}) {
  const [enabled, setEnabled] = useState(!!value);
  const [dateTime, setDateTime] = useState(toLocalInputValue(value));

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onChange(null);
    }
  };

  const handleChange = (newDateTime: string) => {
    setDateTime(newDateTime);
    onChange(newDateTime ? new Date(newDateTime).toISOString() : null);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-ink-900 dark:text-parchment-50">
        Schedule Publishing
      </legend>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-4 w-4 rounded border-parchment-300 text-gold-600 focus:ring-gold-500 dark:border-ink-600"
        />
        <span className="text-sm text-ink-700 dark:text-parchment-300">
          Schedule this article for later
        </span>
      </label>

      {enabled && (
        <div className="flex gap-3 rounded-lg bg-parchment-100 p-4 dark:bg-ink-800">
          <div className="flex-1 space-y-1">
            <label className="block text-xs font-medium text-ink-700 dark:text-parchment-200">
              Date & Time
            </label>
            <div className="relative flex items-center gap-2">
              <Calendar
                size={16}
                className="absolute left-3 text-ink-400 dark:text-parchment-600"
              />
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full rounded-lg border border-parchment-300 bg-white pl-9 pr-3 py-2 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-600 dark:bg-ink-700 dark:text-parchment-50"
              />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-500 dark:text-parchment-400">
        The article will be automatically published at the scheduled time.
      </p>
    </fieldset>
  );
}
