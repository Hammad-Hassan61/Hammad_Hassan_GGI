import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../../src/modules/auth/entities/User';
import { UserSession } from '../../src/modules/auth/entities/UserSession';
import { Role } from '../../src/modules/auth/entities/Role';
import { SubscriptionPlan, SubscriptionTier } from '../../src/modules/subscriptions/entities/SubscriptionPlan';
import { UserSubscription } from '../../src/modules/subscriptions/entities/UserSubscription';
import { Permission } from '../../src/modules/auth/entities/Permission';
import { RolePermission } from '../../src/modules/auth/entities/RolePermission';

describe('Subscription and Admin Integration Tests', () => {
  let userToken: string;
  let adminToken: string;
  let userSid: string;
  let adminSid: string;
  let userId: string;
  let adminId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const roleRepo = AppDataSource.getRepository(Role);
    const userRepo = AppDataSource.getRepository(User);
    const sessionRepo = AppDataSource.getRepository(UserSession);
    const planRepo = AppDataSource.getRepository(SubscriptionPlan);
    const subRepo = AppDataSource.getRepository(UserSubscription);
    const permRepo = AppDataSource.getRepository(Permission);
    const rolePermRepo = AppDataSource.getRepository(RolePermission);

    // Roles
    let userRole = await roleRepo.findOneBy({ name: 'user' });
    if (!userRole) {
      userRole = await roleRepo.save(roleRepo.create({ name: 'user' }));
    }
    let adminRole = await roleRepo.findOneBy({ name: 'admin' });
    if (!adminRole) {
      adminRole = await roleRepo.save(roleRepo.create({ name: 'admin' }));
    }

    // Users
    let user = await userRepo.findOneBy({ email: 'user@test.com' });
    if (!user) {
      user = await userRepo.save(userRepo.create({ email: 'user@test.com', name: 'User', passwordHash: 'hash', role: userRole }));
    }
    userId = user.id;

    let admin = await userRepo.findOneBy({ email: 'admin@test.com' });
    if (!admin) {
      admin = await userRepo.save(userRepo.create({ email: 'admin@test.com', name: 'Admin', passwordHash: 'hash', role: adminRole }));
    }
    adminId = admin.id;

    // Sessions
    userSid = 'user-sid-' + Date.now();
    await sessionRepo.save(sessionRepo.create({ user, sid: userSid, expiresAt: new Date(Date.now() + 3600000), isActive: true }));

    adminSid = 'admin-sid-' + Date.now();
    await sessionRepo.save(sessionRepo.create({ user: admin, sid: adminSid, expiresAt: new Date(Date.now() + 3600000), isActive: true }));

    // Tokens
    const issuer = process.env.JWT_ISSUER || 'ai-chat-system';
    const audience = process.env.JWT_AUDIENCE || 'ai-chat-app';

    userToken = jwt.sign({ sub: userId, email: user.email, roleId: userRole.id, roleName: 'user', sid: userSid }, process.env.JWT_SECRET || 'secret', { issuer, audience });
    adminToken = jwt.sign({ sub: adminId, email: admin.email, roleId: adminRole.id, roleName: 'admin', sid: adminSid }, process.env.JWT_SECRET || 'secret', { issuer, audience });

    // Plans
    let plan = await planRepo.findOneBy({ tier: SubscriptionTier.BASIC });
    if (!plan) {
      plan = await planRepo.save(planRepo.create({
        tier: SubscriptionTier.BASIC,
        name: 'Basic',
        monthlyPrice: 10,
        yearlyPrice: 100,
        monthlyMaxMessages: 10,
        yearlyMaxMessages: 120
      }));
    }

    // Subscription
    const sub = await subRepo.save(subRepo.create({
      user,
      plan,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 3600000),
      maxMessages: 10,
      price: 10,
      isActive: true,
      autoRenew: true
    }));
    subscriptionId = sub.id;

    // Permissions
    const perms = [
      { name: 'POST:/api/subscriptions/:id/cancel', role: userRole },
      { name: 'POST:/api/subscriptions/:id/cancel', role: adminRole },
      { name: 'GET:/api/admin/metrics', role: adminRole }
    ];

    for (const p of perms) {
      let perm = await permRepo.findOneBy({ name: p.name });
      if (!perm) {
        perm = await permRepo.save(permRepo.create({ name: p.name }));
      }
      let rp = await rolePermRepo.findOne({ where: { role: { id: p.role.id }, permission: { id: perm.id } } });
      if (!rp) {
        await rolePermRepo.save(rolePermRepo.create({ role: p.role, permission: perm }));
      }
    }
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it('should allow a user to cancel their own subscription', async () => {
    const path = `/api/subscriptions/${subscriptionId}/cancel`;

    const response = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-request-timestamp', Date.now().toString())
      .set('x-request-nonce', 'test-nonce');

    expect(response.status).toBe(200);
    expect(response.body.autoRenew).toBe(false);
    expect(response.body.isActive).toBe(false);
  });

  it('should allow an admin to access metrics', async () => {
    const path = '/api/admin/metrics';

    const response = await request(app)
      .get(path)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-request-timestamp', Date.now().toString())
      .set('x-request-nonce', 'test-nonce');

    expect(response.status).toBe(200);
  });

  it('should deny a user from accessing metrics', async () => {
    const path = '/api/admin/metrics';

    const response = await request(app)
      .get(path)
      .set('Authorization', `Bearer ${userToken}`)
      .set('x-request-timestamp', Date.now().toString())
      .set('x-request-nonce', 'test-nonce');

    expect(response.status).toBe(403);
  });
});
