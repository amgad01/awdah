import express from 'express';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

export type LocalHandler = (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>;

export type RouteMethod = 'get' | 'post' | 'put' | 'delete';

export interface RouteDefinition {
  method: RouteMethod;
  path: string;
  handler: LocalHandler;
}

export type RouteRunner = (
  handler: LocalHandler,
  req: express.Request,
  res: express.Response,
) => Promise<void>;

export function registerRouteDefinitions(
  router: express.Router,
  apiVersion: string,
  runHandler: RouteRunner,
  definitions: RouteDefinition[],
): void {
  definitions.forEach(({ method, path, handler }) => {
    router[method](`${apiVersion}${path}`, (req, res) => {
      void runHandler(handler, req, res);
    });
  });
}
