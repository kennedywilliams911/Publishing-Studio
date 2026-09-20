ALTER TABLE "subscriptions" RENAME COLUMN "stripeCustomerId" TO "providerCustomerId";
ALTER TABLE "subscriptions" RENAME COLUMN "stripeSubscriptionId" TO "providerSubscriptionId";
ALTER TABLE "subscriptions" RENAME COLUMN "stripePriceId" TO "providerPlanId";
ALTER INDEX "subscriptions_stripeCustomerId_key" RENAME TO "subscriptions_providerCustomerId_key";
ALTER INDEX "subscriptions_stripeSubscriptionId_key" RENAME TO "subscriptions_providerSubscriptionId_key";
