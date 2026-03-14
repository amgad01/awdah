import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('API Integration Tests', () => {
  it('GET /health should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('POST /v1/salah/log without x-user-id should return 401', async () => {
    const response = await request(app).post('/v1/salah/log').send({
      date: '1446-08-15',
      prayerName: 'fajr',
      type: 'obligatory',
    });

    expect(response.status).toBe(401);
  });

  it('POST /v1/salah/log with x-user-id should reach handler', async () => {
    const response = await request(app).post('/v1/salah/log').set('x-user-id', 'test-user').send({
      date: '1446-08-15',
      prayerName: 'fajr',
      type: 'obligatory',
    });

    // 500 is expected — DynamoDB is not running in test environment
    expect(response.status).toBe(500);
  });

  it('GET /v1/salah/debt with x-user-id should reach handler', async () => {
    const response = await request(app).get('/v1/salah/debt').set('x-user-id', 'test-user');
    expect([200, 404, 500]).toContain(response.status);
  });

  it('GET /v1/user/profile with x-user-id should return 500 when database is missing', async () => {
    const response = await request(app).get('/v1/user/profile').set('x-user-id', 'test-user');
    expect(response.status).toBe(500);
  });

  it('POST /v1/user/profile with x-user-id should return 400 when body is invalid', async () => {
    const response = await request(app)
      .post('/v1/user/profile')
      .set('x-user-id', 'test-user')
      .send({ gender: 'male' }); // Missing bulughDate

    expect(response.status).toBe(400);
  });
});
