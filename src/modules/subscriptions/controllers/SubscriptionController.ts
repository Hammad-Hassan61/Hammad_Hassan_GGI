import { Response } from 'express';
import { SubscriptionService } from '../services/SubscriptionService';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { SubscriptionTier } from '../entities/SubscriptionPlan';
import { z } from 'zod';
import {BILLING_CYCLE, HttpStatus} from '../../../shared/constants';
import { createModuleLogger } from '../../../shared/logger';

const logger = createModuleLogger('subscriptions');

const createSubscriptionSchema = z.object({
  tier: z.enum([SubscriptionTier.BASIC, SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE]),
  billingCycle: z.enum([BILLING_CYCLE.MONTHLY, BILLING_CYCLE.YEARLY]),
  autoRenew: z.boolean(),
}).strict();

export class SubscriptionController {
  private subscriptionService = new SubscriptionService();

  async create(req: AuthenticatedRequest, res: Response) {
    const validation = createSubscriptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid input', details: validation.error.format() });
    }

    const { tier, billingCycle, autoRenew } = validation.data;
    const result = await this.subscriptionService.createBundle(req.user!.id, tier, billingCycle, autoRenew);

    if ('error' in result) {
      logger.error(`Subscription creation failed for user ${req.user!.id}: ${result.error}`);
      return res.status(402).json(result);
    }

    logger.info(`Subscription created for user ${req.user!.id}, plan: ${tier}`);
    return res.status(HttpStatus.CREATED).json(result.subscription);
  }

  async cancel(req: AuthenticatedRequest, res: Response) {
    const id = req.params.id as string;
    const result = await this.subscriptionService.cancelSubscription(id, req.user!.id, req.user!.roleName);
    if ('error' in result) {
      return res.status(HttpStatus.FORBIDDEN).json(result);
    }
    logger.info(`Subscription cancelled: ${id} by user ${req.user!.id}`);
    return res.status(HttpStatus.OK).json(result);
  }

  async getMySubscriptions(req: AuthenticatedRequest, res: Response) {
    const subscriptions = await this.subscriptionService.getMySubscriptions(req.user!.id);
    return res.status(HttpStatus.OK).json(subscriptions);
  }
}
