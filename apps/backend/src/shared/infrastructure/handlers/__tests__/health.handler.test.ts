import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

const mockEvent = {} as APIGatewayProxyEventV2;

describe('health.handler', () => {
  it('returns UP status with timestamp and environment', async () => {
    process.env.NODE_ENV = 'test';
    const { handler } = await import('../health.handler');

    const result = (await handler(mockEvent)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body as string);
    expect(body.status).toBe('UP');
    expect(body.timestamp).toBeDefined();
    expect(body.environment).toBe('test');
  });

  it('includes security headers in the response', async () => {
    const { handler } = await import('../health.handler');

    const result = (await handler(mockEvent)) as APIGatewayProxyStructuredResultV2;

    expect(result.headers).toBeDefined();
    expect(result.headers!['X-Content-Type-Options']).toBe('nosniff');
    expect(result.headers!['X-Frame-Options']).toBe('DENY');
    expect(result.headers!['Content-Type']).toBe('application/json');
  });

  it('returns a valid ISO timestamp', async () => {
    const { handler } = await import('../health.handler');

    const result = (await handler(mockEvent)) as APIGatewayProxyStructuredResultV2;
    const body = JSON.parse(result.body as string);

    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});
