import http from 'node:http';
import { execSync } from 'node:child_process';

const PLAN_ID = process.argv[2] || 'cmlejbmci00009wpst0719e4c';

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', ...headers, 'Content-Length': Buffer.byteLength(data) } }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve(JSON.parse(buf)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const { accessToken } = await post('/auth/login', { email: 'test@local.dev', password: 'Passw0rd!' });
if (!accessToken) { console.error('Login failed'); process.exit(1); }

const order = await post('/billing/order', { planId: PLAN_ID }, { Authorization: `Bearer ${accessToken}` });
if (!order.payUrl) { console.error('No payUrl:', JSON.stringify(order)); process.exit(1); }

console.log(`\n👉 Opening sandbox pay page...\n`);
execSync(`xdg-open '${order.payUrl}'`);
