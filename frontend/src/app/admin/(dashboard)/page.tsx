import Link from "next/link";
import { apiFetchSafe } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  Globe2,
  FileEdit,
  Share2,
  CalendarClock,
  ArrowUpRight,
  PenSquare,
} from "lucide-react";

export const dynamic = "force-dynamic";

type StatsResponse = {
  total: number;
  published: number;
  drafts: number;
  scheduled: number;
  shares: number;
  proofreadingRequested: number;
  proofreadingInProgress: number;
  proofreadingApproved: number;
  recentCreated: {
    id: string;
    title: string;
    createdAt: string;
    status: string;
  }[];
  recentPublished: {
    id: string;
    title: string;
    createdAt: string;
    publishedAt: string | null;
    status: string;
  }[];
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="paper-lift min-w-0 rounded-2xl border border-parchment-300 bg-white p-4 sm:p-5 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gold-100 text-gold-700 dark:bg-ink-800 dark:text-gold-400">
        <Icon size={18} />
      </div>
      <p className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl dark:text-parchment-50">
        {value}
      </p>
      <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
        {label}
      </p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const stats = (await apiFetchSafe<StatsResponse>(
    "/api/admin/articles/stats",
  )) ?? {
    total: 0,
    published: 0,
    drafts: 0,
    scheduled: 0,
    shares: 0,
    proofreadingRequested: 0,
    proofreadingInProgress: 0,
    proofreadingApproved: 0,
    recentCreated: [],
    recentPublished: [],
  };

  return (
    <div className="perspective-container mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
            An overview of your writing and reach.
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 shadow-sm transition hover:bg-ink-800 sm:w-auto dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
        >
          <PenSquare size={16} />
          Create Article
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Total Articles" value={stats.total} icon={FileText} />
        <StatCard label="Published" value={stats.published} icon={Globe2} />
        <StatCard label="Drafts" value={stats.drafts} icon={FileEdit} />
        <Link href="/admin/scheduled" className="block">
          <StatCard
            label="Scheduled"
            value={stats.scheduled}
            icon={CalendarClock}
          />
        </Link>
        <StatCard label="Articles Shared" value={stats.shares} icon={Share2} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Proofreading requested"
          value={stats.proofreadingRequested}
          icon={PenSquare}
        />
        <StatCard
          label="In progress"
          value={stats.proofreadingInProgress}
          icon={FileEdit}
        />
        <StatCard
          label="Approved"
          value={stats.proofreadingApproved}
          icon={Globe2}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-parchment-300 bg-white p-4 sm:p-5 dark:border-ink-800 dark:bg-ink-900">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
            Recently created
          </h2>
          {stats.recentCreated.length === 0 ? (
            <EmptyRow />
          ) : (
            <ul className="divide-y divide-parchment-200 dark:divide-ink-800">
              {stats.recentCreated.map((a) => (
                <ArticleRow
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  date={a.createdAt}
                  status={a.status}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-parchment-300 bg-white p-4 sm:p-5 dark:border-ink-800 dark:bg-ink-900">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
            Recently published
          </h2>
          {stats.recentPublished.length === 0 ? (
            <EmptyRow />
          ) : (
            <ul className="divide-y divide-parchment-200 dark:divide-ink-800">
              {stats.recentPublished.map((a) => (
                <ArticleRow
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  date={a.publishedAt ?? a.createdAt}
                  status={a.status}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyRow() {
  return (
    <p className="py-6 text-center text-sm text-ink-400 dark:text-parchment-400">
      Nothing here yet.
    </p>
  );
}

function ArticleRow({
  id,
  title,
  date,
  status,
}: {
  id: string;
  title: string;
  date: string;
  status: string;
}) {
  return (
    <li className="flex min-w-0 items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-800 dark:text-parchment-100">
          {title}
        </p>
        <p className="text-xs text-ink-400 dark:text-parchment-400">
          {formatDate(date)} · {status === "PUBLISHED" ? "Published" : "Draft"}
        </p>
      </div>
      <Link
        href={`/admin/articles/${id}/edit`}
        className="flex shrink-0 items-center gap-1 text-xs font-medium text-gold-700 hover:underline dark:text-gold-400"
      >
        Open <ArrowUpRight size={13} />
      </Link>
    </li>
  );
}
