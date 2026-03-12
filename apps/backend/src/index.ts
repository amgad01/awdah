import express from 'express';
import cors from 'cors';
import { StatusCodes } from 'http-status-codes';
import { handler as logPrayerHandler } from './contexts/salah/infrastructure/handlers/log-prayer.handler';
import { handler as getSalahDebtHandler } from './contexts/salah/infrastructure/handlers/get-salah-debt.handler';
import { handler as logFastHandler } from './contexts/sawm/infrastructure/handlers/log-fast.handler';
import { handler as getSawmDebtHandler } from './contexts/sawm/infrastructure/handlers/get-sawm-debt.handler';
import { handler as addPracticingPeriodHandler } from './contexts/salah/infrastructure/handlers/add-practicing-period.handler';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { SECURITY_HEADERS } from './shared/middleware/security-headers';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to simulate Lambda execution
const runHandler = async (handler: any, req: express.Request, res: express.Response) => {
    const event: Partial<APIGatewayProxyEventV2> = {
        body: JSON.stringify(req.body),
        headers: req.headers as Record<string, string>,
        queryStringParameters: req.query as Record<string, string>,
        rawPath: req.path,
        requestContext: {
            http: {
                method: req.method,
                path: req.path,
                protocol: 'HTTP/1.1',
                sourceIp: req.ip || '127.0.0.1',
                userAgent: req.get('user-agent') || 'unknown',
            },
            // Simulate authorizer claims for development
            authorizer: {
                jwt: {
                    claims: {
                        sub: req.headers['x-user-id'] || 'local-dev-user',
                    },
                },
            },
        } as any,
    };

    const context: Partial<Context> = {
        awsRequestId: 'local-dev-request',
    };

    try {
        const result = await handler(event as APIGatewayProxyEventV2, context as Context);
        res.status(result.statusCode)
            .set({
                ...result.headers,
                ...SECURITY_HEADERS,
                'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000;"
            })
            .send(result.body);
    } catch (error) {
        console.error('Handler Error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).set(SECURITY_HEADERS).json({ message: 'Internal Server Error' });
    }
};

// Routes
app.post('/salah/log', (req, res) => runHandler(logPrayerHandler, req, res));
app.get('/salah/debt', (req, res) => runHandler(getSalahDebtHandler, req, res));
app.post('/sawm/log', (req, res) => runHandler(logFastHandler, req, res));
app.get('/sawm/debt', (req, res) => runHandler(getSawmDebtHandler, req, res));
app.post('/salah/practicing-period', (req, res) => runHandler(addPracticingPeriodHandler, req, res));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(port, () => {
    console.log(`Backend simulation server listening at http://localhost:${port}`);
});
