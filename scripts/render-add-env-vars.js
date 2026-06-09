#!/usr/bin/env node
/**
 * render-add-env-vars.js
 * Uso: export RENDER_API_KEY=... y export variables a añadir, luego:
 * node scripts/render-add-env-vars.js
 *
 * Variables leídas del entorno:
 *  - RENDER_API_KEY
 *  - MONGODB_URI
 *  - JWT_SECRET
 *  - CLOUDINARY_URL (opcional)
 *  - NEXT_PUBLIC_API_URL (opcional)
 *  - FRONTEND_URL (opcional)
 */

const fetch = globalThis.fetch || require('node-fetch');
const { env } = process;

if (!env.RENDER_API_KEY) {
  console.error('RENDER_API_KEY no definido');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${env.RENDER_API_KEY}`, 'Content-Type': 'application/json' };

async function listServices() {
  const res = await fetch('https://api.render.com/v1/services', { headers });
  const txt = await res.text();
  try { return JSON.parse(txt); } catch(e) { throw new Error('No se pudo parsear services response: '+txt); }
}

async function addEnvVar(serviceId, key, value, secure = true) {
  const url = `https://api.render.com/v1/services/${serviceId}/env-vars`;
  const body = { key, value, secure };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body)});
  const txt = await res.text();
  let parsed;
  try { parsed = JSON.parse(txt); } catch(e) { parsed = txt; }
  return { status: res.status, body: parsed };
}

(async ()=>{
  try {
    const services = await listServices();
    // find services by name
    const backend = services.find(s => s.name === 'gatocafee-backend');
    const frontend = services.find(s => s.name === 'gatocafee-frontend');
    if (!backend) { console.error('No se encontró servicio gatocafee-backend en tu cuenta Render'); }
    if (!frontend) { console.error('No se encontró servicio gatocafee-frontend en tu cuenta Render'); }
    if (!backend && !frontend) process.exit(1);

    // Prepare vars
    const varsBackend = [];
    if (env.MONGODB_URI) varsBackend.push(['MONGODB_URI', env.MONGODB_URI]);
    if (env.JWT_SECRET) varsBackend.push(['JWT_SECRET', env.JWT_SECRET]);
    if (env.CLOUDINARY_URL) varsBackend.push(['CLOUDINARY_URL', env.CLOUDINARY_URL]);
    if (env.FRONTEND_URL) varsBackend.push(['FRONTEND_URL', env.FRONTEND_URL]);
    varsBackend.push(['NODE_ENV', env.NODE_ENV || 'production']);

    const varsFrontend = [];
    if (env.NEXT_PUBLIC_API_URL) varsFrontend.push(['NEXT_PUBLIC_API_URL', env.NEXT_PUBLIC_API_URL]);
    else {
      // guess backend url
      varsFrontend.push(['NEXT_PUBLIC_API_URL', `https://${backend ? backend.serviceDetails?.defaultCertificate?.alternateNames?.[0] || (backend ? backend.defaultDomain : 'gatocafee-backend.onrender.com') : 'gatocafee-backend.onrender.com'}/api`]);
    }

    // Add backend vars
    if (backend) {
      for (const [k,v] of varsBackend) {
        if (!v) continue;
        const res = await addEnvVar(backend.id, k, v, true);
        if (res.status === 201 || res.status === 200) console.log(`✅ Añadida ${k} a gatocafee-backend`);
        else console.error(`❌ Error añadiendo ${k} a gatocafee-backend:`, res.status, typeof res.body === 'object' ? JSON.stringify(res.body) : res.body);
      }
    }

    // Add frontend vars
    if (frontend) {
      for (const [k,v] of varsFrontend) {
        if (!v) continue;
        const res = await addEnvVar(frontend.id, k, v, false);
        if (res.status === 201 || res.status === 200) console.log(`✅ Añadida ${k} a gatocafee-frontend`);
        else console.error(`❌ Error añadiendo ${k} a gatocafee-frontend:`, res.status, typeof res.body === 'object' ? JSON.stringify(res.body) : res.body);
      }
    }

    console.log('Operación terminada. Si los vars se añadieron, haz un redeploy del servicio desde el Dashboard para aplicar cambios.');
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
