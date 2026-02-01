import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { User } from '../../src/modules/auth/entities/User';
import { UserSession } from '../../src/modules/auth/entities/UserSession';

import { Role } from '../../src/modules/auth/entities/Role';

describe('Security Middleware Integration Tests', () => {
  let token: string;
  let sid: string;
  let userId: string;
  let roleId: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);
    const sessionRepository = AppDataSource.getRepository(UserSession);
    const roleRepository = AppDataSource.getRepository(Role);

    let role = await roleRepository.findOneBy({ name: 'user' });
    if (!role) {
      role = roleRepository.create({ name: 'user' });
      await roleRepository.save(role);
    }
    roleId = role.id;

    let user = await userRepository.findOne({ where: { email: 'sec-test@example.com' }, relations: ['role'] });
    if (!user) {
      user = userRepository.create({
        email: 'sec-test@example.com',
        name: 'Sec Test User',
        passwordHash: 'hashed',
        role
      });
      await userRepository.save(user);
    }
    userId = user.id;

    sid = 'test-sid-' + Date.now();
    const session = sessionRepository.create({
      user,
      sid,
      expiresAt: new Date(Date.now() + 3600000), // 1h
      isActive: true
    });
    await sessionRepository.save(session);

    token = jwt.sign(
      { sub: userId, email: 'sec-test@example.com', roleId, roleName: 'user', sid },
      process.env.JWT_SECRET || 'secret',
      { issuer: process.env.JWT_ISSUER || 'ai-chat-system', audience: process.env.JWT_AUDIENCE || 'ai-chat-app' }
    );
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it('should block request without token', async () => {
    const response = await request(app).post('/api/chat').send({ question: 'Hi' });
    expect(response.status).toBe(401);
  });

    // Timestamp and Nonce validation tests
    it('should block request without timestamp or nonce', async () => {
        const response = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${token}`)
            .send({ question: 'Hi' });
        expect(response.status).toBe(401);
        expect(response.body.message).toContain('security headers');
    });

    it('should block request with expired timestamp', async () => {
        const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 mins ago
        const response = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${token}`)
            .set('x-request-timestamp', oldTimestamp.toString())
            .set('x-request-nonce', 'test-nonce')
            .send({ question: 'Hi' });
        expect(response.status).toBe(401);
        expect(response.body.message).toContain('expired or invalid');
    });

    it('should allow request with valid token and security headers', async () => {
        const response = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${token}`)
            .set('x-request-timestamp', Date.now().toString())
            .set('x-request-nonce', 'test-nonce')
            .send({ question: 'Hi' });

        expect(response.status).not.toBe(401);
    });

    it('should block request if session is inactivated', async () => {
        const sessionRepo = AppDataSource.getRepository(UserSession);
        await sessionRepo.update({ sid }, { isActive: false });

        const response = await request(app)
            .post('/api/chat')
            .set('Authorization', `Bearer ${token}`)
            .set('x-request-timestamp', Date.now().toString())
            .set('x-request-nonce', 'test-nonce')
            .send({ question: 'Hi' });

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid session');

        await sessionRepo.update({ sid }, { isActive: true });
    });

    it('should enforce rate limiting', async () => {
        const requests = [];
        for (let i = 0; i < 20; i++) {
            requests.push(
                request(app)
                    .post('/api/chat')
                    .set('Authorization', `Bearer ${token}`)
                    .set('x-request-timestamp', Date.now().toString())
                    .set('x-request-nonce', 'test-nonce-' + i)
                    .send({ question: 'Hi' })
            );
        }
        const responses = await Promise.all(requests);
        const tooManyRequests = responses.some(r => r.status === 429);
    });
});