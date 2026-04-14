import { StatusCodes } from '@awdah/shared';

export interface ApiResponse<T = unknown> {
  statusCode: number;
  body: T;
}

export const responses = {
  ok: <T>(body: T): ApiResponse<T> => ({
    statusCode: StatusCodes.OK,
    body,
  }),

  created: <T>(body: T): ApiResponse<T> => ({
    statusCode: StatusCodes.CREATED,
    body,
  }),

  noContent: (): ApiResponse<null> => ({
    statusCode: StatusCodes.NO_CONTENT,
    body: null,
  }),

  accepted: <T>(body: T): ApiResponse<T> => ({
    statusCode: StatusCodes.ACCEPTED,
    body,
  }),

  custom: <T>(statusCode: number, body: T): ApiResponse<T> => ({
    statusCode,
    body,
  }),
};
