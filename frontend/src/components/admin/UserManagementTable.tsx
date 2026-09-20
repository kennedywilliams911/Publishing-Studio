"use client";

import { useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api-client";

type User = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  subscriptions: { status: string; trialEndsAt: string | null }[];
};

export default function UserManagementTable({
  users: initialUsers,
}: {
  users: User[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [busy, setBusy] = useState<string | null>(null);
  async function update(id: string, field: "status" | "role", value: string) {
    setBusy(id);
    try {
      const response = await fetch(
        apiUrl(`/api/super-admin/users/${id}/${field}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ [field]: value }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update user.");
      setUsers((current) =>
        current.map((user) =>
          user.id === id ? { ...user, ...data.user } : user,
        ),
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Could not update user.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-parchment-300 bg-white dark:border-ink-800 dark:bg-ink-900">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-parchment-200 text-xs uppercase text-ink-500 dark:border-ink-800 dark:text-parchment-400">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Account</th>
            <th className="px-4 py-3">Subscription</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const subscription = user.subscriptions[0];
            return (
              <tr
                key={user.id}
                className="border-b border-parchment-100 last:border-0 dark:border-ink-800"
              >
                <td className="px-4 py-4">
                  <p className="font-medium text-ink-900 dark:text-parchment-50">
                    {user.name}
                  </p>
                  <p className="text-xs text-ink-500">{user.email}</p>
                </td>
                <td className="px-4 py-4">{user.role}</td>
                <td className="px-4 py-4">{user.status}</td>
                <td className="px-4 py-4">
                  {subscription?.status ?? "INACTIVE"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <Link
                      href={`/publisher/${user.id}`}
                      target="_blank"
                      className="rounded-full border border-gold-400 px-3 py-1.5 text-xs font-semibold text-gold-700 dark:text-gold-400"
                    >
                      View page
                    </Link>
                    <button
                      disabled={busy === user.id}
                      onClick={() =>
                        update(
                          user.id,
                          "status",
                          user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                        )
                      }
                      className="rounded-full border border-parchment-300 px-3 py-1.5 text-xs font-semibold dark:border-ink-700"
                    >
                      {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                    </button>
                    <button
                      disabled={busy === user.id}
                      onClick={() =>
                        update(
                          user.id,
                          "role",
                          user.role === "ADMIN" ? "SUPER_ADMIN" : "ADMIN",
                        )
                      }
                      className="rounded-full border border-parchment-300 px-3 py-1.5 text-xs font-semibold dark:border-ink-700"
                    >
                      {user.role === "ADMIN" ? "Promote" : "Demote"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
