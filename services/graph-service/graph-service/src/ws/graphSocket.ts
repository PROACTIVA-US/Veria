import type { WebSocketServer } from 'ws';
export function initGraphSocket(wss: WebSocketServer) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const org = url.searchParams.get('org') || 'demo-org';
    ws.send(JSON.stringify({ type: 'welcome', org }));
    ws.on('message', (msg) => { for (const client of wss.clients) { try { client.send(msg.toString()); } catch {} } });
  });
}
