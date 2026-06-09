#!/usr/bin/env node
// Usage: set RENDER_API_KEY and SERVICE_ID env, and variables MONGODB_URI, JWT_SECRET, CLOUDINARY_URL
const fetch = globalThis.fetch || require('node-fetch');
const { env } = process;
if (!env.RENDER_API_KEY) { console.error('RENDER_API_KEY missing'); process.exit(1); }
const serviceId = env.SERVICE_ID || process.argv[2];
if (!serviceId) { console.error('SERVICE_ID missing'); process.exit(1); }
const headers = { Authorization: `Bearer ${env.RENDER_API_KEY}`, 'Content-Type': 'application/json' };
async function add(key, value, secure=true) {
  if (!value) return;
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, { method: 'POST', headers, body: JSON.stringify({ key, value, secure }) });
  const txt = await res.text();
  if (res.status>=200 && res.status<300) console.log(`✅ ${key} added to ${serviceId}`);
  else console.error(`❌ ${key} failed (${res.status}): ${txt}`);
}
(async ()=>{
  await add('MONGODB_URI', env.MONGODB_URI, true);
  await add('JWT_SECRET', env.JWT_SECRET, true);
  await add('CLOUDINARY_URL', env.CLOUDINARY_URL, true);
  await add('NODE_ENV', env.NODE_ENV || 'production', false);
  await add('FRONTEND_URL', env.FRONTEND_URL, false);
})();
