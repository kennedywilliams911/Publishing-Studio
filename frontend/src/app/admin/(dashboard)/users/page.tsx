import { getCurrentSession } from "@/lib/auth";
import { apiFetchSafe } from "@/lib/api";
import UserManagementTable from "@/components/admin/UserManagementTable";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

type User = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  subscriptions: { status: string; trialEndsAt: string | null }[];
};

export default async function UsersPage() {
  const session = await getCurrentSession();
  if (session?.role !== "SUPER_ADMIN")
    return (
      <p className="text-sm text-red-700">
        You do not have permission to view this page.
      </p>
    );
  const data = await apiFetchSafe<{
    users: User[];
    total: number;
    summary: { active: number; trials: number; suspended: number };
  }>("/api/super-admin/users");
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
        Users
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
        Manage registered administrators and their subscriptions.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Registered", data?.total ?? 0],
          ["Active plans", data?.summary.active ?? 0],
          ["Trials", data?.summary.trials ?? 0],
          ["Suspended", data?.summary.suspended ?? 0],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-parchment-300 bg-white p-4 dark:border-ink-800 dark:bg-ink-900"
          >
            <p className="text-xs text-ink-500 dark:text-parchment-400">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink-900 dark:text-parchment-50">
              {value}
            </p>
          </div>
        ))}
      </div>
      <UserManagementTable users={data?.users ?? []} />
    </div>
  );
}
