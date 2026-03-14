import express from 'express';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { handler as logFastHandler } from '../../../contexts/sawm/infrastructure/handlers/log-fast.handler';
import { handler as getSawmDebtHandler } from '../../../contexts/sawm/infrastructure/handlers/get-sawm-debt.handler';
import { handler as getFastHistoryHandler } from '../../../contexts/sawm/infrastructure/handlers/get-fast-history.handler';
import { handler as deleteFastLogHandler } from '../../../contexts/sawm/infrastructure/handlers/delete-fast-log.handler';

export const registerSawmRoutes = (
  router: express.Router,
  apiVersion: string,
  runHandler: (
    handler: (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>,
    req: express.Request,
    res: express.Response,
  ) => Promise<void>,
) => {
  router.post(`${apiVersion}/sawm/log`, (req, res) => runHandler(logFastHandler, req, res));
  router.delete(`${apiVersion}/sawm/log`, (req, res) => runHandler(deleteFastLogHandler, req, res));
  router.get(`${apiVersion}/sawm/debt`, (req, res) => runHandler(getSawmDebtHandler, req, res));
  router.get(`${apiVersion}/sawm/history`, (req, res) =>
    runHandler(getFastHistoryHandler, req, res),
  );
};
