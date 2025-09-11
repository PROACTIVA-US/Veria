import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import morgan from 'morgan'; import suggest from './routes/suggest.js';
const PORT = Number(process.env.PORT || 4001); const app = express();
app.use(express.json({ limit: '2mb' })); app.use(cors()); app.use(helmet()); app.use(morgan('dev'));
app.get('/health', (_req,res)=>res.json({ ok:true })); app.use('/ai/graph', suggest);
app.listen(PORT, ()=>console.log(`ai-broker :${PORT}`));
