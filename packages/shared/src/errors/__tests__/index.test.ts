import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorisedError,
  UnauthenticatedError,
  ConflictError,
  InternalError,
} from '../index';

describe('Domain Errors', () => {
  it('should have correct details for ValidationError', () => {
    const error = new ValidationError('Invalid input');
    expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
  });

  it('should have correct details for NotFoundError', () => {
    const error = new NotFoundError('User not found');
    expect(error.statusCode).toBe(StatusCodes.NOT_FOUND);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should have correct details for UnauthorisedError', () => {
    const error = new UnauthorisedError('Forbidden');
    expect(error.statusCode).toBe(StatusCodes.FORBIDDEN);
    expect(error.code).toBe('UNAUTHORISED');
  });

  it('should have correct details for UnauthenticatedError', () => {
    const error = new UnauthenticatedError('Login required');
    expect(error.statusCode).toBe(StatusCodes.UNAUTHORIZED);
    expect(error.code).toBe('UNAUTHENTICATED');
  });

  it('should have correct details for ConflictError', () => {
    const error = new ConflictError('User already exists');
    expect(error.statusCode).toBe(StatusCodes.CONFLICT);
    expect(error.code).toBe('CONFLICT');
  });

  it('should have correct details for InternalError', () => {
    const error = new InternalError('Something broke');
    expect(error.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(error.code).toBe('INTERNAL_ERROR');
  });

  it('should serialize to JSON correctly via toJSON', () => {
    const error = new AppError('NOT_FOUND', 'Not found', 404);
    const json = error.toJSON();
    expect(json.error.code).toBe('NOT_FOUND');
    expect(json.error.message).toBe('Not found');
  });
});
