import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import suggestRouter from './routes/suggest.js';

describe('AI Broker Service', () => {
  let app: express.Application;

  beforeAll(() => {
    // Create a test instance of the app
    app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use(cors());
    app.use(helmet());

    app.get('/health', (_req, res) => {
      res.json({ ok: true, service: 'ai-broker', timestamp: new Date().toISOString() });
    });

    app.use('/ai/graph', suggestRouter);

    app.use((err: Error, _req: express.Request, res: express.Response, _next: any) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('service', 'ai-broker');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Middleware', () => {
    it('should handle JSON payloads', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .send({ prompt: 'test', provider: 'local' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });

    it('should handle CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should reject oversized payloads', async () => {
      const largePayload = { prompt: 'x'.repeat(3 * 1024 * 1024) }; // 3MB

      const response = await request(app)
        .post('/ai/graph/suggest')
        .send(largePayload);

      // Express error handler returns 500 for body-parser errors
      expect(response.status).toBe(500);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      // Express error handler returns 500 for parse errors
      expect(response.status).toBe(500);
    });
  });
});