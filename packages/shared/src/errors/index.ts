import { StatusCodes } from 'http-status-codes';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORISED'
  | 'UNAUTHENTICATED'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, StatusCodes.BAD_REQUEST);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, StatusCodes.NOT_FOUND);
  }
}

export class UnauthorisedError extends AppError {
  constructor(message: string) {
    super('UNAUTHORISED', message, StatusCodes.FORBIDDEN);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message: string) {
    super('UNAUTHENTICATED', message, StatusCodes.UNAUTHORIZED);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, StatusCodes.CONFLICT);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super('RATE_LIMIT', message, StatusCodes.TOO_MANY_REQUESTS);
  }
}

export class InternalError extends AppError {
  constructor(message: string) {
    super('INTERNAL_ERROR', message, StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
