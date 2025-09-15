import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import suggestRouter from './suggest.js';

describe('AI Broker /suggest route', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/ai/graph', suggestRouter);
  });

  describe('POST /ai/graph/suggest', () => {
    it('should return 400 for missing prompt', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('issues');
    });

    it('should return 400 for empty prompt', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .send({ prompt: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('issues');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .send({
          prompt: 'Create a graph',
          provider: 'invalid-provider'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('issues');
    });

    it('should return 200 with valid response for local provider', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .send({
          prompt: 'Create a simple investment graph',
          provider: 'local'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodes');
      expect(response.body).toHaveProperty('edges');
      expect(response.body).toHaveProperty('explanations');
      expect(Array.isArray(response.body.nodes)).toBe(true);
      expect(Array.isArray(response.body.edges)).toBe(true);
      expect(Array.isArray(response.body.explanations)).toBe(true);
    });

    it('should handle valid input with auto provider selection', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .send({
          prompt: 'Create a KYC compliance graph',
          provider: 'auto',
          mode: 'structure'
        })
        .timeout(10000); // Increase timeout for auto provider

      // Should fallback to local provider when others fail
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodes');
      expect(response.body.nodes.length).toBeGreaterThan(0);
    }, 10000); // Increase test timeout

    it('should accept and handle context data', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .send({
          prompt: 'Extend the graph',
          context: {
            existingNodes: [{ id: '1', type: 'Test' }],
            existingEdges: []
          },
          provider: 'local'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('nodes');
    });

    it('should validate mode parameter', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .send({
          prompt: 'Create graph',
          mode: 'invalid-mode',
          provider: 'local'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle insight mode', async () => {
      const response = await request(app)
        .post('/ai/graph/suggest')
        .send({
          prompt: 'Analyze investment patterns',
          mode: 'insight',
          provider: 'local'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('explanations');
    });
  });
});