// gateway-routes.example.ts
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Express } from 'express';
import path from 'path';
import express from 'express';
export function registerGraphRoutes(app: Express) {
  app.use('/graph',    createProxyMiddleware({ target: process.env.GRAPH_SERVICE_URL || 'http://graph-service:4000', changeOrigin: true }));
  app.use('/ai/graph', createProxyMiddleware({ target: process.env.AI_BROKER_URL    || 'http://ai-broker:4001',     changeOrigin: true }));
  app.use('/ws/graph', createProxyMiddleware({ target: process.env.GRAPH_SERVICE_WS_URL || 'ws://graph-service:4000', ws: true, changeOrigin: true }));
}
export function registerPackRoutes(app: Express) {
  app.use('/packs', express.static(path.resolve(process.cwd(), 'packages/domain-packs')));
}
