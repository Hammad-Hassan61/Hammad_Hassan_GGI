import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';


describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });


  it('should sign up a new user', async () => {
    const email = `test-${Date.now()}@example.com`;
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: email,
        password: 'password123',
        name: 'Test User'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(email);
  });

  it('should login an existing user', async () => {
    const email = `test-${Date.now()}@example.com`;
    // Create user first
    await request(app)
      .post('/api/auth/signup')
      .send({
        email: email,
        password: 'password123',
        name: 'Test User'
      });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: email,
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('sid');
  });

  it('should fail login with wrong credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
  });
});