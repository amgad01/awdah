import { wrapHandler } from './wrap-handler';
import { parseBody } from '../validation/parse-body';
import { type AnyZodObject } from 'zod';

interface UseCase<TInput, TOutput = unknown> {
  execute(input: TInput): Promise<TOutput>;
}

export interface CreateHandlerOptions<TInput> {
  useQuery?: boolean;
  successMessage?: string;
  statusCode?: number;
  transformInput?: (userId: string, input: Record<string, unknown>) => TInput;
  schema?: AnyZodObject;
}

export function createHandler<TInput, TOutput = unknown>(
  contextName: string,
  useCase: UseCase<TInput, TOutput>,
  options: CreateHandlerOptions<TInput> = {},
) {
  const {
    useQuery = false,
    successMessage,
    statusCode = 200,
    transformInput = (userId, input) => ({ userId, ...input }) as unknown as TInput,
    schema,
  } = options;

  return wrapHandler(contextName, async ({ userId, body, query }) => {
    const parsedInput = schema
      ? parseBody(schema, useQuery ? query : body)
      : useQuery
        ? query
        : body;
    const result = await useCase.execute(transformInput(userId, parsedInput));

    return {
      statusCode,
      body: result || { message: successMessage || 'Operation successful' },
    };
  });
}
