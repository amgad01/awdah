import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@awdah/shared';

export function parseBody<T>(schema: ZodSchema<T>, body: Record<string, unknown>): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(messages.join('; '));
    }
    throw error;
  }
}
