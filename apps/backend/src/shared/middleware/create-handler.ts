import { wrapHandler } from './wrap-handler';
import { parseBody } from '../validation/parse-body';
import { type ZodSchema } from 'zod';

interface UseCase<TInput, TOutput = unknown> {
  execute(input: TInput): Promise<TOutput>;
}

export interface CreateHandlerOptions<TInput, TOutput = unknown> {
  useQuery?: boolean;
  successMessage?: string;
  statusCode?: number;
  present?: (result: TOutput) => unknown;
  transformInput?: (userId: string, input: Record<string, unknown>) => TInput;
  schema?: ZodSchema<Record<string, unknown>>;
}

export function createHandler<TInput, TOutput = unknown>(
  contextName: string,
  useCase: UseCase<TInput, TOutput>,
  options: CreateHandlerOptions<TInput, TOutput> = {},
) {
  const {
    useQuery = false,
    successMessage,
    statusCode = 200,
    present,
    transformInput = (userId, input) => ({ userId, ...input }) as unknown as TInput,
    schema,
  } = options;

  return wrapHandler(contextName, async ({ userId, body, query }) => {
    const rawInput = useQuery ? query : body;
    const parsedInput = schema ? parseBody(schema, rawInput) : rawInput;
    const result = await useCase.execute(transformInput(userId, parsedInput));

    return {
      statusCode,
      body:
        result == null
          ? { message: successMessage ?? 'Operation successful' }
          : present
            ? present(result)
            : result,
    };
  });
}
