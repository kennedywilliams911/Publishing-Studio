import { getCurrentSession } from "@/lib/auth";
import { apiFetchSafe } from "@/lib/api";
import BillingActions from "./BillingActions";

export const metadata = { title: "Subscription" };
export const dynamic = "force-dynamic";

type Subscription = {
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
} | null;

export default async function BillingPage() {
  const [session, data] = await Promise.all([
    getCurrentSession(),
    apiFetchSafe<{ subscription: Subscription }>("/api/billing/subscription"),
  ]);
  const subscription = data?.subscription;
  const trialDate = subscription?.trialEndsAt
    ? new Date(subscription.trialEndsAt).toLocaleDateString()
    : null;
  const periodDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
        Subscription
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
        Manage your Publishing Studio subscription.
      </p>
      <div className="mt-6 rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <p className="text-sm text-ink-500 dark:text-parchment-300">
          Signed in as {session?.email}
        </p>
        <h2 className="mt-4 text-xl font-semibold text-ink-900 dark:text-parchment-50">
          Publishing Studio subscription
        </h2>
        <p className="mt-2 text-sm text-ink-600 dark:text-parchment-300">
          7-day free trial, then your selected plan. Cancel anytime.
        </p>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-ink-500 dark:text-parchment-400">Status</span>
            <p className="font-semibold text-ink-900 dark:text-parchment-50">
              {subscription?.status ??
                session?.subscriptionStatus ??
                "INACTIVE"}
            </p>
          </div>
          {trialDate && (
            <div>
              <span className="text-ink-500 dark:text-parchment-400">
                Trial ends
              </span>
              <p className="font-semibold text-ink-900 dark:text-parchment-50">
                {trialDate}
              </p>
            </div>
          )}
          {periodDate && (
            <div>
              <span className="text-ink-500 dark:text-parchment-400">
                Next renewal date
              </span>
              <p className="font-semibold text-ink-900 dark:text-parchment-50">
                {periodDate}
              </p>
            </div>
          )}
        </div>
        <BillingActions
          hasSubscription={Boolean(subscription)}
          trialActive={subscription?.status === "TRIALING"}
        />
      </div>
    </div>
  );
}
