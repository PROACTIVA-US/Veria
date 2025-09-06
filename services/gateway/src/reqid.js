export function getOrCreateReqId(headers = {}) {
  const fromHeader = headers['x-request-id'] || headers['X-Request-Id'];
  if (fromHeader) return String(fromHeader);
  const r = Math.random().toString(36).slice(2, 10);
  return `req_${Date.now()}_${r}`;
}
