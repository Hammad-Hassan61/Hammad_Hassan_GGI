import { AppDataSource } from '../../../config/database';
import { UserSubscription } from '../entities/UserSubscription';
import { User } from '../../auth/entities/User';
import { SubscriptionPlan, SubscriptionTier } from '../entities/SubscriptionPlan';
import { UserSubscriptionHistory } from '../entities/UserSubscriptionHistory';
import {BILLING_CYCLE} from "../../../shared/constants";
import { LessThanOrEqual } from 'typeorm';

type BillingCycle = typeof BILLING_CYCLE[keyof typeof BILLING_CYCLE];

export class SubscriptionService {
  async createBundle(userId: string, planTier: SubscriptionTier, billingCycle: BillingCycle, autoRenew: boolean) {
    const plan = await AppDataSource.getRepository(SubscriptionPlan).findOneBy({ tier: planTier });
    if (!plan) throw new Error('Plan not found');

    const user = await AppDataSource.getRepository(User).findOneBy({ id: userId });
    if (!user) throw new Error('User not found');

    const sub = new UserSubscription();
    sub.user = user;
    sub.plan = plan;
    sub.price = billingCycle === BILLING_CYCLE.YEARLY ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);
    sub.maxMessages = billingCycle === BILLING_CYCLE.YEARLY ? plan.yearlyMaxMessages : plan.monthlyMaxMessages;
    sub.autoRenew = autoRenew;
    sub.isActive = true;
    sub.startDate = new Date();
    
    const endDate = new Date();
    if (billingCycle === BILLING_CYCLE.MONTHLY) {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    sub.endDate = endDate;
    sub.renewalDate = autoRenew ? endDate : null;

    // Simulate payment processing
    const paymentSuccess = Math.random() > 0.1; // 90% success rate
    if (!paymentSuccess) {
      sub.isActive = false;
      await AppDataSource.getRepository(UserSubscription).save(sub);
      return { error: 'Payment failed', subscription: this.mapSubscriptionResponse(sub) };
    }

    await AppDataSource.getRepository(UserSubscription).save(sub);

    await this.recordHistory(sub, 'ACTIVE');

    return { subscription: this.mapSubscriptionResponse(sub) };
  }

  private mapSubscriptionResponse(sub: UserSubscription) {
    return {
      id: sub.id,
      plan: {
        id: sub.plan.id,
        tier: sub.plan.tier,
        name: sub.plan.name
      },
      startDate: sub.startDate,
      endDate: sub.endDate,
      renewalDate: sub.renewalDate,
      isActive: sub.isActive,
      autoRenew: sub.autoRenew,
      maxMessages: sub.maxMessages,
      usedMessages: sub.usedMessages,
      price: sub.price,
      createdAt: sub.createdAt
    };
  }

  private async recordHistory(sub: UserSubscription, status: string) {
    const history = new UserSubscriptionHistory();
    history.user = sub.user;
    history.plan = sub.plan;
    history.startDate = sub.startDate;
    history.endDate = sub.endDate;
    history.priceAtPurchase = sub.price;
    history.maxMessages = sub.maxMessages;
    history.usedMessages = sub.usedMessages;
    history.status = status;
    await AppDataSource.getRepository(UserSubscriptionHistory).save(history);
  }

  async cancelSubscription(subscriptionId: string, userId: string, roleName: string) {
    if(!subscriptionId) throw new Error('Subscription id not found');
    const sub = await AppDataSource.getRepository(UserSubscription).findOne({
      where: { id: subscriptionId },
      relations: ['user', 'plan']
    });
    if (!sub) throw new Error('Subscription not found');

    if (roleName !== 'admin' && sub.user.id !== userId) {
      return { error: 'You do not have permission to cancel this subscription' };
    }
    sub.autoRenew = false;
    sub.renewalDate = null;
    sub.isActive = false; 

    await AppDataSource.getRepository(UserSubscription).save(sub);
    await this.recordHistory(sub, 'CANCELLED');
    return this.mapSubscriptionResponse(sub);
  }

  async processRenewals() {
    const now = new Date();
    const subsToRenew = await AppDataSource.getRepository(UserSubscription).find({
      where: { 
        autoRenew: true, 
        isActive: true, 
        renewalDate: LessThanOrEqual(now) 
      },
      relations: ['user', 'plan'],
    });

    for (const sub of subsToRenew) {
      // Simulate payment processing
      const paymentSuccess = Math.random() > 0.1;
      if (!paymentSuccess) {
        sub.isActive = false;
        sub.renewalDate = null;
        await AppDataSource.getRepository(UserSubscription).save(sub);
        await this.recordHistory(sub, 'PAYMENT_FAILED');
        continue;
      }

      // Record old period in history before updating
      await this.recordHistory(sub, 'RENEWED_OLD_PERIOD');

      const isYearly = sub.price === Number(sub.plan.yearlyPrice);
      
      const newStartDate = new Date(sub.endDate);
      const newEndDate = new Date(sub.endDate);
      if (isYearly) {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      }
      
      sub.startDate = newStartDate;
      sub.endDate = newEndDate;
      sub.renewalDate = newEndDate;
      sub.usedMessages = 0;
      
      await AppDataSource.getRepository(UserSubscription).save(sub);
      await this.recordHistory(sub, 'ACTIVE');
    }
  }

  async getMySubscriptions(userId: string) {
    const subs = await AppDataSource.getRepository(UserSubscription).find({
      where: { user: { id: userId } },
      order: { startDate: 'DESC' },
      relations: ['plan']
    });

    return subs.map(sub => this.mapSubscriptionResponse(sub));
  }
}
