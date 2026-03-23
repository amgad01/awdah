import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import type { Express } from 'express';

interface TestResponse {
  statusCode: number;
  headers: Record<string, string | string[] | number | undefined>;
  body: string;
}

type ExpressHandlerApp = Express & {
  handle: (req: IncomingMessage, res: ServerResponse, callback: (error?: unknown) => void) => void;
};

const mockUseCases = {
  logPrayerUseCase: { execute: vi.fn() },
  getSalahDebtUseCase: { execute: vi.fn() },
  addPracticingPeriodUseCase: { execute: vi.fn() },
  updatePracticingPeriodUseCase: { execute: vi.fn() },
  getPracticingPeriodsUseCase: { execute: vi.fn() },
  deletePracticingPeriodUseCase: { execute: vi.fn() },
  getPrayerHistoryUseCase: { execute: vi.fn() },
  getPrayerHistoryPageUseCase: { execute: vi.fn() },
  deletePrayerLogUseCase: { execute: vi.fn() },
  resetPrayerLogsUseCase: { execute: vi.fn() },
  logFastUseCase: { execute: vi.fn() },
  getSawmDebtUseCase: { execute: vi.fn() },
  getFastHistoryUseCase: { execute: vi.fn() },
  getFastHistoryPageUseCase: { execute: vi.fn() },
  deleteFastLogUseCase: { execute: vi.fn() },
  resetFastLogsUseCase: { execute: vi.fn() },
  getUserSettingsUseCase: { execute: vi.fn() },
  updateUserSettingsUseCase: { execute: vi.fn() },
  deleteAccountUseCase: { execute: vi.fn() },
  exportDataUseCase: { execute: vi.fn() },
};

vi.mock('../shared/di/container', () => mockUseCases);

let app: ExpressHandlerApp;
let SharedNotFoundError: typeof import('@awdah/shared').NotFoundError;

beforeAll(async () => {
  vi.resetModules();
  const shared = await import('@awdah/shared');
  SharedNotFoundError = shared.NotFoundError;
  const mod = await import('../index');
  app = mod.app as ExpressHandlerApp;
});

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(mockUseCases.logPrayerUseCase.execute).mockResolvedValue(undefined);
  vi.mocked(mockUseCases.getSalahDebtUseCase.execute).mockResolvedValue({
    totalPrayersOwed: 120,
    completedPrayers: 20,
    remainingPrayers: 100,
  });
  vi.mocked(mockUseCases.getUserSettingsUseCase.execute).mockResolvedValue({
    userId: 'test-user',
    bulughDate: '1431-09-15',
    gender: 'female',
  });
  vi.mocked(mockUseCases.updateUserSettingsUseCase.execute).mockResolvedValue(undefined);
});

async function invokeApp(
  method: string,
  url: string,
  options?: {
    headers?: Record<string, string>;
    body?: unknown;
  },
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const written: Buffer[] = [];
    let settled = false;

    const finalize = (res: ServerResponse) => {
      if (settled) return;
      settled = true;

      const raw = Buffer.concat(written).toString('utf8');
      const separatorIndex = raw.indexOf('\r\n\r\n');
      const body = separatorIndex >= 0 ? raw.slice(separatorIndex + 4) : '';

      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body,
      });
    };

    const socket = new Duplex({
      read() {},
      write(chunk, _encoding, callback) {
        written.push(Buffer.from(chunk));
        callback();
      },
    }) as Duplex & { remoteAddress?: string };

    socket.remoteAddress = '127.0.0.1';

    const req = new IncomingMessage(socket as unknown as import('node:net').Socket);
    req.url = url;
    req.method = method;
    req.headers = Object.fromEntries(
      Object.entries(options?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
    );

    if (options?.body !== undefined) {
      const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.headers['content-type'] ??= 'application/json';
      req.headers['content-length'] = String(Buffer.byteLength(body));
      process.nextTick(() => {
        req.push(body);
        req.push(null);
      });
    } else {
      process.nextTick(() => req.push(null));
    }

    const res = new ServerResponse(req);
    const originalEnd = res.end.bind(res);

    res.end = ((...args: Parameters<ServerResponse['end']>) => {
      const returnValue = originalEnd(...args);
      setImmediate(() => finalize(res));
      return returnValue;
    }) as ServerResponse['end'];

    res.assignSocket(socket as unknown as import('node:net').Socket);

    res.on('error', reject);
    app.handle(req, res, reject);
  });
}

describe('API Route Tests', () => {
  it('GET /health should return 200 OK', async () => {
    const response = await invokeApp('GET', '/health');

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
  });

  it('POST /v1/salah/log without x-user-id should return 401', async () => {
    const response = await invokeApp('POST', '/v1/salah/log', {
      body: {
        date: '1446-08-15',
        prayerName: 'fajr',
        type: 'obligatory',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Missing x-user-id header' },
    });
  });

  it('POST /v1/salah/log with x-user-id should return 201 and call the use case', async () => {
    const response = await invokeApp('POST', '/v1/salah/log', {
      headers: { 'x-user-id': 'test-user' },
      body: {
        date: '1446-08-15',
        prayerName: 'fajr',
        type: 'obligatory',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(mockUseCases.logPrayerUseCase.execute).toHaveBeenCalledWith({
      userId: 'test-user',
      date: '1446-08-15',
      prayerName: 'fajr',
      type: 'obligatory',
    });
  });

  it('GET /v1/salah/debt with x-user-id should return mocked debt data', async () => {
    const response = await invokeApp('GET', '/v1/salah/debt', {
      headers: { 'x-user-id': 'test-user' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      totalPrayersOwed: 120,
      completedPrayers: 20,
      remainingPrayers: 100,
    });
    expect(mockUseCases.getSalahDebtUseCase.execute).toHaveBeenCalledWith('test-user');
  });

  it('GET /v1/user/profile with x-user-id should return the profile data', async () => {
    const response = await invokeApp('GET', '/v1/user/profile', {
      headers: { 'x-user-id': 'test-user' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      userId: 'test-user',
      bulughDate: '1431-09-15',
      gender: 'female',
    });
    expect(mockUseCases.getUserSettingsUseCase.execute).toHaveBeenCalledWith('test-user');
  });

  it('GET /v1/user/profile should return 404 when the profile is missing', async () => {
    vi.mocked(mockUseCases.getUserSettingsUseCase.execute).mockRejectedValueOnce(
      new SharedNotFoundError('User profile not found'),
    );

    const response = await invokeApp('GET', '/v1/user/profile', {
      headers: { 'x-user-id': 'test-user' },
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      error: { code: 'NOT_FOUND', message: 'User profile not found' },
    });
  });

  it('POST /v1/user/profile with x-user-id should return 400 when body is invalid', async () => {
    const response = await invokeApp('POST', '/v1/user/profile', {
      headers: { 'x-user-id': 'test-user' },
      body: { gender: 'male' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('GET /v1/salah/history/page with x-user-id should call the paged history use case', async () => {
    vi.mocked(mockUseCases.getPrayerHistoryPageUseCase.execute).mockResolvedValueOnce({
      items: [],
      hasMore: false,
    });

    const response = await invokeApp(
      'GET',
      '/v1/salah/history/page?startDate=1446-08-01&endDate=1446-08-30&limit=50',
      {
        headers: { 'x-user-id': 'test-user' },
      },
    );

    expect(response.statusCode).toBe(200);
    expect(mockUseCases.getPrayerHistoryPageUseCase.execute).toHaveBeenCalledWith({
      userId: 'test-user',
      startDate: '1446-08-01',
      endDate: '1446-08-30',
      limit: 50,
    });
  });

  it('GET /v1/sawm/history/page with x-user-id should call the paged history use case', async () => {
    vi.mocked(mockUseCases.getFastHistoryPageUseCase.execute).mockResolvedValueOnce({
      items: [],
      hasMore: false,
    });

    const response = await invokeApp(
      'GET',
      '/v1/sawm/history/page?startDate=1446-08-01&endDate=1446-08-30&limit=50',
      {
        headers: { 'x-user-id': 'test-user' },
      },
    );

    expect(response.statusCode).toBe(200);
    expect(mockUseCases.getFastHistoryPageUseCase.execute).toHaveBeenCalledWith({
      userId: 'test-user',
      startDate: '1446-08-01',
      endDate: '1446-08-30',
      limit: 50,
    });
  });
});
