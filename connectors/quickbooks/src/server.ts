import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import syncRouter from './routes/sync';
import exportRouter from './routes/export';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/connectors/quickbooks/auth', authRouter);
app.use('/connectors/quickbooks/sync', syncRouter);
app.use('/connectors/quickbooks/export', exportRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'quickbooks-connector' });
});

app.listen(PORT, () => {
  console.log(`QuickBooks Connector running on port ${PORT}`);
});