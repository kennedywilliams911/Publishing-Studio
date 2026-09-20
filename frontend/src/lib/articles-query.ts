import { apiFetchSafe } from "./api";
import type {
  ArticleWithShareCount,
  ProofreadingStatus,
} from "@/types/article";

export type ArticleSort = "newest" | "oldest" | "title";

type QueryResult = {
  items: ArticleWithShareCount[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Fetches a page of articles from the backend's admin API (authenticated —
 * the caller must be a Server Component so the session cookie is forwarded).
 */
export async function queryArticles({
  q,
  status,
  proofreadingStatus,
  sort = "newest",
  page = 1,
}: {
  q?: string;
  status?: "DRAFT" | "PUBLISHED";
  proofreadingStatus?: ProofreadingStatus | "";
  sort?: ArticleSort;
  page?: number;
}): Promise<QueryResult> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (proofreadingStatus) params.set("proofreadingStatus", proofreadingStatus);
  params.set("sort", sort);
  params.set("page", String(page));

  const data = await apiFetchSafe<QueryResult>(
    `/api/admin/articles?${params.toString()}`,
  );

  return (
    data ?? {
      items: [],
      total: 0,
      page: 1,
      pageSize: 9,
      totalPages: 1,
    }
  );
}
