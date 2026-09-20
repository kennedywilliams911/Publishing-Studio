export type ProofreadingStatus =
  | "not_started"
  | "requested"
  | "in_progress"
  | "approved";

export type ProofreadingState = {
  status: ProofreadingStatus;
  notes: string;
  updatedAt: string | null;
};

const STORAGE_KEY = "publishing-studio:proofreading";

export const DEFAULT_PROOFREADING_STATE: ProofreadingState = {
  status: "not_started",
  notes: "",
  updatedAt: null,
};

export function getProofreadingState(
  articleId?: string | null,
): ProofreadingState {
  if (!articleId || typeof window === "undefined") {
    return DEFAULT_PROOFREADING_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROOFREADING_STATE;

    const parsed = JSON.parse(raw) as Record<
      string,
      Partial<ProofreadingState>
    >;
    const state = parsed[articleId];
    if (!state) return DEFAULT_PROOFREADING_STATE;

    return {
      ...DEFAULT_PROOFREADING_STATE,
      ...state,
      updatedAt: state.updatedAt ?? null,
    };
  } catch {
    return DEFAULT_PROOFREADING_STATE;
  }
}

export function saveProofreadingState(
  articleId: string | null,
  nextState: Partial<ProofreadingState>,
) {
  if (!articleId || typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const current = raw
      ? (JSON.parse(raw) as Record<string, ProofreadingState>)
      : {};

    const merged: ProofreadingState = {
      ...DEFAULT_PROOFREADING_STATE,
      ...current[articleId],
      ...nextState,
      updatedAt: new Date().toISOString(),
    };

    current[articleId] = merged;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore local storage write failures so the app keeps working even when
    // storage is unavailable or the browser blocks it.
  }
}

export function clearProofreadingState(articleId: string | null) {
  if (!articleId || typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const current = JSON.parse(raw) as Record<string, ProofreadingState>;
    delete current[articleId];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore local storage cleanup failures.
  }
}

export function getProofreadingLabel(status: ProofreadingStatus) {
  switch (status) {
    case "requested":
      return "Proofreading requested";
    case "in_progress":
      return "In proofreading";
    case "approved":
      return "Proofread approved";
    default:
      return "Not in proofreading";
  }
}
