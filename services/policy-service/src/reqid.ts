export function getReqId(headers: Record<string, any>): string | undefined {
  return (headers['x-request-id'] || headers['X-Request-Id']) as string | undefined;
}
