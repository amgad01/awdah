import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { AppError, InternalError, ValidationError } from '@awdah/shared';
import { createLogger } from './logger';
import { SECURITY_HEADERS } from './security-headers';

export interface AuthenticatedRequest<TBody extends Record<string, any> = Record<string, any>> {
    userId: string;
    body: TBody;
}

export type AuthenticatedHandler<TBody extends Record<string, any> = Record<string, any>> = (
    req: AuthenticatedRequest<TBody>,
    context: Context,
) => Promise<{ statusCode: number; body: unknown }>;

export function wrapHandler<TBody extends Record<string, any> = Record<string, any>>(
    contextName: string,
    handler: AuthenticatedHandler<TBody>,
): (event: APIGatewayProxyEventV2, context: Context) => Promise<APIGatewayProxyResultV2> {
    return async (event, context) => {
        const logger = createLogger(contextName, context.awsRequestId);
        const startTime = Date.now();

        logger.info(
            { path: event.rawPath, method: event.requestContext?.http?.method },
            'invocation started',
        );

        try {
            // 1. Extract User Identity
            const authorizer = (event.requestContext as unknown as { authorizer?: Record<string, unknown> }).authorizer;
            const userId =
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (authorizer?.iam as Record<string, any> | undefined)?.cognitoIdentity?.identityId ||
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (authorizer?.jwt as Record<string, any> | undefined)?.claims?.sub ||
                'anonymous';

            // 2. Parse Body if present
            let body: TBody = {} as TBody;
            if (event.body) {
                try {
                    body = JSON.parse(event.body);
                } catch {
                    throw new ValidationError('Invalid JSON body');
                }
            }

            // 3. Execute Handler
            const result = await handler({ userId, body }, context);

            const duration = Date.now() - startTime;
            logger.info({ duration, statusCode: result.statusCode }, 'invocation completed');

            return {
                statusCode: result.statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    ...SECURITY_HEADERS,
                },
                body: JSON.stringify(result.body),
            };
        } catch (error) {
            const duration = Date.now() - startTime;

            if (error instanceof AppError) {
                logger.warn({ duration, code: error.code, statusCode: error.statusCode }, error.message);
                return {
                    statusCode: error.statusCode,
                    headers: {
                        'Content-Type': 'application/json',
                        ...SECURITY_HEADERS,
                    },
                    body: JSON.stringify(error.toJSON()),
                };
            }

            const unexpectedError = error instanceof Error ? error : new Error(String(error));
            logger.error({ duration, err: unexpectedError }, 'unexpected error');

            const internalError = new InternalError('An unexpected error occurred');
            return {
                statusCode: internalError.statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    ...SECURITY_HEADERS,
                },
                body: JSON.stringify(internalError.toJSON()),
            };
        }
    };
}
