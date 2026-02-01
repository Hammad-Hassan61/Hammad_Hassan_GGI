import { User } from '../../auth/entities/User';
import { UserSubscription } from '../../subscriptions/entities/UserSubscription';

export class QuotaPolicy {
  static readonly FREE_MONTHLY_LIMIT = 3;

  static canUserMakeRequest(
    user: User,
    activeSubscriptions: UserSubscription[],
  ): { allowed: boolean; useFreeQuota?: boolean; subscriptionId?: string } {
    const now = new Date();
    const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (!user.lastQuotaResetDate || user.lastQuotaResetDate < firstOfCurrentMonth) {
      user.freeMessagesUsedThisMonth = 0;
      user.lastQuotaResetDate = now;
    }

    if (user.freeMessagesUsedThisMonth < this.FREE_MONTHLY_LIMIT) {
      return { allowed: true, useFreeQuota: true };
    }

    const eligibleSubscriptions = activeSubscriptions
      .filter((sub) => sub.isActive && (sub.usedMessages < sub.maxMessages || sub.maxMessages === -1))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (eligibleSubscriptions.length > 0) {
      return { allowed: true, useFreeQuota: false, subscriptionId: eligibleSubscriptions[0].id };
    }

    return { allowed: false };
  }
}
