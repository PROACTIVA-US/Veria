// k6 example: load /decisions on compliance service
import http from 'k6/http';
import { sleep } from 'k6';

export const options = { vus: 10, duration: '10s' };

export default function () {
  const url = 'http://localhost:3004/decisions';
  const payload = JSON.stringify({ jurisdiction: 'US', accreditation: true });
  const params = { headers: { 'content-type': 'application/json' } };
  http.post(url, payload, params);
  sleep(1);
}
