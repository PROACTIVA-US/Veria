import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import suggestRouter from './routes/suggest.js';

const PORT = Number(process.env.PORT || 4001);
const app = express();

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'ai-broker', timestamp: new Date().toISOString() });
});

// Routes
app.use('/ai/graph', suggestRouter);

// Error handler (4 parameters required for Express error middleware)
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ai-broker service listening on port ${PORT}`);
});