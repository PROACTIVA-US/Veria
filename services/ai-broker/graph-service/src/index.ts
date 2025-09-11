import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import morgan from 'morgan'; import http from 'http'; import { WebSocketServer } from 'ws';
import nodes from './routes/nodes.js'; import edges from './routes/edges.js'; import milestones from './routes/milestones.js'; import { initGraphSocket } from './ws/graphSocket.js';
const PORT = Number(process.env.PORT || 4000); const app = express();
app.use(express.json({ limit: '2mb' })); app.use(cors()); app.use(helmet()); app.use(morgan('dev'));
app.use((req,_res,next)=>{ (req as any).orgId = (req.headers['x-org-id'] as string) ?? 'demo-org'; next(); });
app.get('/health', (_req,res)=>res.json({ok:true})); app.use('/graph/nodes', nodes); app.use('/graph/edges', edges); app.use('/graph/milestones', milestones);
const server = http.createServer(app); const wss = new WebSocketServer({ server, path: '/ws/graph' }); initGraphSocket(wss);
server.listen(PORT, ()=>console.log(`graph-service :${PORT}`));
