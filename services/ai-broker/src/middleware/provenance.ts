// Provenance logger (structured logs)
import { Request, Response, NextFunction } from 'express';
export function provenanceLogger() {
  return function(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const prov = (req as any)._provenance || {};
      const entry = {
        kind: 'gateway.request',
        reqId: prov.reqId || (req.headers['x-request-id'] as string) || 'n/a',
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        subject: prov.subject || null,
        org: prov.org || null,
        latency_ms: Date.now() - start
      };
      try { console.log(JSON.stringify(entry)); } catch {}
    });
    next();
  }
}
