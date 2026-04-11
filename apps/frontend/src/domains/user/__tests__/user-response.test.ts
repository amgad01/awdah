import { describe, expect, it } from 'vitest';
import {
  parseDeleteAccountResponse,
  parseExportDownloadResponse,
  parseUserJobStatusResponse,
  parseUserLifecycleEnvelope,
  parseUserProfileResponse,
} from '../user-response';

describe('user-response', () => {
  it('parses a valid user profile', () => {
    expect(
      parseUserProfileResponse({
        userId: 'u-1',
        username: 'amgad',
        bulughDate: '1440-01-01',
        gender: 'male',
      }),
    ).toEqual({
      userId: 'u-1',
      username: 'amgad',
      dateOfBirth: undefined,
      bulughDate: '1440-01-01',
      revertDate: undefined,
      gender: 'male',
    });
  });

  it('rejects invalid profile gender', () => {
    expect(() =>
      parseUserProfileResponse({
        userId: 'u-1',
        bulughDate: '1440-01-01',
        gender: 'unknown',
      }),
    ).toThrow(/gender/);
  });

  it('parses lifecycle envelopes and job status payloads', () => {
    const payload = {
      message: 'started',
      job: {
        jobId: 'job-1',
        type: 'export',
        status: 'processing',
        requestedAt: '2026-04-10T10:00:00.000Z',
      },
    };

    expect(parseUserLifecycleEnvelope(payload)).toEqual(payload);
    expect(parseUserJobStatusResponse({ job: payload.job })).toEqual({ job: payload.job });
  });

  it('parses export and delete-account payloads', () => {
    expect(
      parseExportDownloadResponse({
        message: 'ready',
        fileName: 'awdah.json',
        data: { hello: 'world' },
      }),
    ).toEqual({
      message: 'ready',
      fileName: 'awdah.json',
      data: { hello: 'world' },
    });

    expect(
      parseDeleteAccountResponse({
        message: 'deleted',
        authDeleted: true,
      }),
    ).toEqual({
      message: 'deleted',
      authDeleted: true,
    });
  });
});
