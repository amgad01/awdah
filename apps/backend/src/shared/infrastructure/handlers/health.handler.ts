import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SECURITY_HEADERS } from '../../middleware/security-headers';
import { StatusCodes } from '@awdah/shared';

export const handler = async (_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: StatusCodes.OK,
    headers: {
      'Content-Type': 'application/json',
      ...SECURITY_HEADERS,
    },
    body: JSON.stringify({
      status: 'UP',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    }),
  };
};
