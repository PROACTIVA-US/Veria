import { buildServer } from './server';
const app = buildServer();
const port = Number(process.env.PORT || 3003);
const host = process.env.HOST || '0.0.0.0';
app.listen({ port, host }).catch((err) => { app.log.error(err); process.exit(1); });
