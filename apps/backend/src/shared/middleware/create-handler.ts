import { wrapHandler } from './wrap-handler';
import { responses } from './responses';
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

function defaultTransformInput<TInput>(userId: string, input: Record<string, unknown>): TInput {
  return { userId, ...input } as unknown as TInput;
}

function selectRawInput(
  useQuery: boolean,
  body: Record<string, unknown>,
  query: Record<string, string>,
): Record<string, unknown> {
  return useQuery ? query : body;
}

function parseHandlerInput(
  schema: ZodSchema<Record<string, unknown>> | undefined,
  rawInput: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema) {
    return rawInput;
  }

  return parseBody(schema, rawInput);
}

function buildSuccessBody<TOutput>(
  result: TOutput,
  successMessage: string | undefined,
  present: ((result: TOutput) => unknown) | undefined,
): unknown {
  if (result == null) {
    return { message: successMessage ?? 'Operation successful' };
  }

  if (present) {
    return present(result);
  }

  return result;
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
    transformInput = defaultTransformInput,
    schema,
  } = options;

  async function handleAuthenticatedRequest({
    userId,
    body,
    query,
  }: {
    userId: string;
    body: Record<string, unknown>;
    query: Record<string, string>;
  }) {
    const rawInput = selectRawInput(useQuery, body, query);
    const parsedInput = parseHandlerInput(schema, rawInput);
    const useCaseInput = transformInput(userId, parsedInput);
    const result = await useCase.execute(useCaseInput);
    const responseBody = buildSuccessBody(result, successMessage, present);

    return responses.custom(statusCode, responseBody);
  }

  return wrapHandler(contextName, handleAuthenticatedRequest);
}
