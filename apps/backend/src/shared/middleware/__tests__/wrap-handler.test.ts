import { describe, it, expect, vi } from 'vitest';
import { wrapHandler } from '../wrap-handler';
import { responses } from '../responses';
import { SECURITY_HEADERS } from '../security-headers';
import { ValidationError, StatusCodes } from '@awdah/shared';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

describe('wrap-handler', () => {
  const mockContext: Context = {
    awsRequestId: 'test-request-id',
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn',
    memoryLimitInMB: '128',
    logGroupName: 'log',
    logStreamName: 'stream',
    getRemainingTimeInMillis: () => 1000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  const createMockEvent = (body?: unknown): APIGatewayProxyEventV2 =>
    ({
      version: '2.0',
      routeKey: '$default',
      rawPath: '/test',
      rawQueryString: '',
      headers: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        domainName: 'id.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'id',
        http: {
          method: 'POST',
          path: '/test',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'agent',
        },
        requestId: 'id',
        routeKey: '$default',
        stage: '$default',
        time: 'time',
        timeEpoch: 0,
        authorizer: {
          jwt: {
            claims: {
              sub: 'test-user-id',
            },
            scopes: [],
          },
        },
      },
      isBase64Encoded: false,
      body: body ? JSON.stringify(body) : undefined,
    }) as unknown as APIGatewayProxyEventV2;

  describe('responses', () => {
    it('should create an ok response with a plain body', () => {
      const body = { foo: 'bar' };
      const result = responses.ok(body);
      expect(result.statusCode).toBe(StatusCodes.OK);
      expect(result.body).toEqual(body);
    });

    it('should create an ok response with a message and data', () => {
      const message = 'Success!';
      const data = { id: 123 };
      const result = responses.ok({ message, data });
      expect(result.statusCode).toBe(StatusCodes.OK);
      expect(result.body).toEqual({ message, id: 123 });
    });

    it('should create a created response with a message', () => {
      const message = 'Created!';
      const result = responses.created({ message });
      expect(result.statusCode).toBe(StatusCodes.CREATED);
      expect(result.body).toEqual({ message });
    });
  });

  describe('wrapHandler', () => {
    it('should execute successfully and return security headers', async () => {
      const handler = vi.fn().mockResolvedValue(responses.ok({ ok: true }));
      const wrapped = wrapHandler('TestContext', handler);

      const event = createMockEvent({ some: 'data' });
      const result = await wrapped(event, mockContext);

      // Cast for testing to avoid Type errors on APIGatewayProxyResultV2 (which can be a string)
      const res = result as { statusCode: number; body: string; headers: Record<string, string> };

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ ok: true });
      expect(res.headers).toMatchObject(SECURITY_HEADERS);
      expect(res.headers['Content-Type']).toBe('application/json');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          body: { some: 'data' },
        }),
        mockContext,
      );
    });

    it('should handle body parsing errors', async () => {
      const handler = vi.fn();
      const wrapped = wrapHandler('TestContext', handler);

      const event = createMockEvent();
      (event as { body?: string }).body = '{ invalid json }';

      const result = await wrapped(event, mockContext);
      const res = result as { statusCode: number; body: string; headers: Record<string, string> };

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(res.headers).toMatchObject(SECURITY_HEADERS);
    });

    it('should handle AppErrors', async () => {
      const handler = vi.fn().mockRejectedValue(new ValidationError('Custom error'));
      const wrapped = wrapHandler('TestContext', handler);

      const event = createMockEvent();
      const result = await wrapped(event, mockContext);
      const res = result as { statusCode: number; body: string; headers: Record<string, string> };

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Custom error');
      expect(res.headers).toMatchObject(SECURITY_HEADERS);
    });

    it('should handle unexpected errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Boom!'));
      const wrapped = wrapHandler('TestContext', handler);

      const event = createMockEvent();
      const result = await wrapped(event, mockContext);
      const res = result as { statusCode: number; body: string; headers: Record<string, string> };

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('An unexpected error occurred');
      expect(res.headers).toMatchObject(SECURITY_HEADERS);
    });
  });
});
