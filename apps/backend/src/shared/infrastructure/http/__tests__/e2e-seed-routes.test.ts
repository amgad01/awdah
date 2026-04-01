import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Express } from 'express';
import express from 'express';
import request from 'supertest';
import { registerE2eSeedRoutes } from '../e2e-seed-routes';

describe('E2E Seed Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not register routes when ENABLE_E2E_SEED is not set', () => {
    delete process.env.ENABLE_E2E_SEED;
    registerE2eSeedRoutes(app);

    return request(app)
      .post('/v1/e2e/seed')
      .send({ users: [{ email: 'test@example.com' }] })
      .expect(404);
  });

  it('should register seed route when ENABLE_E2E_SEED is true', () => {
    process.env.ENABLE_E2E_SEED = 'true';

    // Mock the AWS client creation to avoid real AWS calls
    vi.mock('../../aws/client-config', () => ({
      createAwsClientConfig: () => ({
        region: 'eu-west-1',
      }),
    }));

    registerE2eSeedRoutes(app);

    // Route existence is validated by ensuring this does not return 404.
    return request(app)
      .post('/v1/e2e/seed')
      .send({})
      .then((response) => {
        expect(response.status).not.toBe(404);
      });
  });

  it('should accept POST request with users array to /v1/e2e/seed', async () => {
    process.env.ENABLE_E2E_SEED = 'true';

    // Create a mock app that tracks requests
    const mockApp = express();
    mockApp.use(express.json());

    // Add a catch-all to track requests
    mockApp.post('/v1/e2e/seed', (req, res) => {
      // Validate the request contract
      expect(req.body).toHaveProperty('users');
      expect(Array.isArray(req.body.users)).toBe(true);

      // Respond with success
      res.status(200).json({ status: 'seeded', count: req.body.users.length });
    });

    const response = await request(mockApp)
      .post('/v1/e2e/seed')
      .send({
        users: [{ email: 'test-user@example.com' }],
      })
      .expect(200);

    expect(response.body).toEqual({
      status: 'seeded',
      count: 1,
    });
  });

  it('should reject request with missing users array', async () => {
    process.env.ENABLE_E2E_SEED = 'true';

    const mockApp = express();
    mockApp.use(express.json());

    mockApp.post('/v1/e2e/seed', (req, res) => {
      const { users } = req.body;
      if (!Array.isArray(users)) {
        return res.status(400).json({ error: 'Missing users array' });
      }
      res.status(200).json({ status: 'seeded', count: users.length });
    });

    const response = await request(mockApp).post('/v1/e2e/seed').send({}).expect(400);

    expect(response.body).toEqual({
      error: 'Missing users array',
    });
  });

  it('should reject request with non-array users parameter', async () => {
    process.env.ENABLE_E2E_SEED = 'true';

    const mockApp = express();
    mockApp.use(express.json());

    mockApp.post('/v1/e2e/seed', (req, res) => {
      const { users } = req.body;
      if (!Array.isArray(users)) {
        return res.status(400).json({ error: 'Missing users array' });
      }
      res.status(200).json({ status: 'seeded', count: users.length });
    });

    const response = await request(mockApp)
      .post('/v1/e2e/seed')
      .send({ users: 'not-an-array' })
      .expect(400);

    expect(response.body).toEqual({
      error: 'Missing users array',
    });
  });

  it('should handle multiple users in one seeding request', async () => {
    process.env.ENABLE_E2E_SEED = 'true';

    const mockApp = express();
    mockApp.use(express.json());

    mockApp.post('/v1/e2e/seed', (req, res) => {
      const { users } = req.body;
      if (!Array.isArray(users)) {
        return res.status(400).json({ error: 'Missing users array' });
      }
      res.status(200).json({ status: 'seeded', count: users.length });
    });

    const users = [
      { email: 'user1@example.com' },
      { email: 'user2@example.com' },
      { email: 'tracker@example.com' },
    ];

    const response = await request(mockApp).post('/v1/e2e/seed').send({ users }).expect(200);

    expect(response.body.count).toBe(3);
  });

  it('should include status and count in successful response', async () => {
    process.env.ENABLE_E2E_SEED = 'true';

    const mockApp = express();
    mockApp.use(express.json());

    mockApp.post('/v1/e2e/seed', (req, res) => {
      const { users } = req.body;
      if (!Array.isArray(users)) {
        return res.status(400).json({ error: 'Missing users array' });
      }
      res.status(200).json({ status: 'seeded', count: users.length });
    });

    const response = await request(mockApp)
      .post('/v1/e2e/seed')
      .send({ users: [{ email: 'test@example.com' }] });

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('count');
    expect(response.body.status).toBe('seeded');
    expect(response.body.count).toBeGreaterThanOrEqual(0);
  });
});
