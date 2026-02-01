import { User } from '../src/modules/auth/entities/User';
import { UserSubscription } from '../src/modules/subscriptions/entities/UserSubscription';
import { QuotaPolicy } from '../src/modules/chat/policies/QuotaPolicy';

describe('QuotaPolicy', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    user.freeMessagesUsedThisMonth = 0;
    user.lastQuotaResetDate = new Date();
  });

  it('should allow request if free quota is available', async () => {
    const result = await QuotaPolicy.canUserMakeRequest(user, []);
    expect(result.allowed).toBe(true);
    expect(result.useFreeQuota).toBe(true);
  });

  it('should deny request if free quota is exhausted and no subscriptions', async () => {
    user.freeMessagesUsedThisMonth = 3;
    const result = await QuotaPolicy.canUserMakeRequest(user, []);
    expect(result.allowed).toBe(false);
  });

  it('should allow request if free quota is exhausted but active subscription exists', async () => {
    user.freeMessagesUsedThisMonth = 3;
    const sub = new UserSubscription();
    sub.id = 'sub-1';
    sub.isActive = true;
    sub.maxMessages = 10;
    sub.usedMessages = 5;
    sub.createdAt = new Date();

    const result = await QuotaPolicy.canUserMakeRequest(user, [sub]);
    expect(result.allowed).toBe(true);
    expect(result.useFreeQuota).toBe(false);
    expect(result.subscriptionId).toBe('sub-1');
  });

  it('should reset free quota on new month', async () => {
    user.freeMessagesUsedThisMonth = 3;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    user.lastQuotaResetDate = lastMonth;

    const result = await QuotaPolicy.canUserMakeRequest(user, []);
    expect(user.freeMessagesUsedThisMonth).toBe(0);
    expect(result.allowed).toBe(true);
  });
});
