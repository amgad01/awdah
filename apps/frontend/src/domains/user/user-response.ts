import type {
  DeleteAccountResponse,
  ExportDownloadResponse,
  UserLifecycleJobEnvelope,
  UserLifecycleJobResponse,
  UserProfileResponse,
} from '@/lib/api';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid user response: ${field} must be a non-empty string.`);
  }
  return value;
}

function assertOptionalString(value: unknown, field: string): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`Invalid user response: ${field} must be a string when present.`);
  }
  return value;
}

function assertBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid user response: ${field} must be a boolean.`);
  }
  return value;
}

export function parseUserProfileResponse(payload: unknown): UserProfileResponse | null {
  if (payload == null) {
    return null;
  }

  if (!isRecord(payload)) {
    throw new Error('Invalid user response: profile payload must be an object.');
  }

  const gender = payload.gender;
  if (gender !== 'male' && gender !== 'female') {
    throw new Error('Invalid user response: gender must be male or female.');
  }

  return {
    userId: assertString(payload.userId, 'userId'),
    username: assertOptionalString(payload.username, 'username'),
    dateOfBirth: assertOptionalString(payload.dateOfBirth, 'dateOfBirth'),
    bulughDate: assertString(payload.bulughDate, 'bulughDate'),
    revertDate: assertOptionalString(payload.revertDate, 'revertDate'),
    gender,
  };
}

export function parseUserLifecycleJob(payload: unknown): UserLifecycleJobResponse {
  if (!isRecord(payload)) {
    throw new Error('Invalid user response: lifecycle job must be an object.');
  }

  const type = payload.type;
  if (
    type !== 'export' &&
    type !== 'delete-account' &&
    type !== 'reset-prayers' &&
    type !== 'reset-fasts'
  ) {
    throw new Error('Invalid user response: lifecycle job type is not recognized.');
  }

  const status = payload.status;
  if (
    status !== 'pending' &&
    status !== 'processing' &&
    status !== 'completed' &&
    status !== 'failed'
  ) {
    throw new Error('Invalid user response: lifecycle job status is not recognized.');
  }

  return {
    jobId: assertString(payload.jobId, 'jobId'),
    type,
    status,
    requestedAt: assertString(payload.requestedAt, 'requestedAt'),
    startedAt: assertOptionalString(payload.startedAt, 'startedAt'),
    completedAt: assertOptionalString(payload.completedAt, 'completedAt'),
    errorMessage: assertOptionalString(payload.errorMessage, 'errorMessage'),
    exportFileName: assertOptionalString(payload.exportFileName, 'exportFileName'),
    exportContentType: assertOptionalString(payload.exportContentType, 'exportContentType'),
    exportChunkCount:
      typeof payload.exportChunkCount === 'number' ? payload.exportChunkCount : undefined,
    authCleanupRequired:
      typeof payload.authCleanupRequired === 'boolean' ? payload.authCleanupRequired : undefined,
    authDeleted: typeof payload.authDeleted === 'boolean' ? payload.authDeleted : undefined,
    authCleanupCompletedAt: assertOptionalString(
      payload.authCleanupCompletedAt,
      'authCleanupCompletedAt',
    ),
  };
}

export function parseUserLifecycleEnvelope(payload: unknown): UserLifecycleJobEnvelope | null {
  if (payload == null) {
    return null;
  }

  if (!isRecord(payload)) {
    throw new Error('Invalid user response: lifecycle envelope must be an object.');
  }

  return {
    message: assertString(payload.message, 'message'),
    job: parseUserLifecycleJob(payload.job),
  };
}

export function parseDeleteAccountResponse(payload: unknown): DeleteAccountResponse | null {
  if (payload == null) {
    return null;
  }

  if (!isRecord(payload)) {
    throw new Error('Invalid user response: delete-account payload must be an object.');
  }

  return {
    message: assertString(payload.message, 'message'),
    authDeleted: assertBoolean(payload.authDeleted, 'authDeleted'),
  };
}

export function parseExportDownloadResponse(payload: unknown): ExportDownloadResponse | null {
  if (payload == null) {
    return null;
  }

  if (!isRecord(payload)) {
    throw new Error('Invalid user response: export payload must be an object.');
  }

  const data = payload.data;
  if (!isRecord(data)) {
    throw new Error('Invalid user response: export data must be an object.');
  }

  return {
    message: assertString(payload.message, 'message'),
    fileName: assertString(payload.fileName, 'fileName'),
    data,
  };
}

export function parseUserJobStatusResponse(
  payload: unknown,
): { job: UserLifecycleJobResponse } | null {
  if (payload == null) {
    return null;
  }

  if (!isRecord(payload)) {
    throw new Error('Invalid user response: job-status payload must be an object.');
  }

  return {
    job: parseUserLifecycleJob(payload.job),
  };
}
