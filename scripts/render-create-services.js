#!/usr/bin/env node
/**
 * render-create-services.js
 *
 * Script para crear 2 Web Services en Render (backend y frontend) usando la API pública.
 * Uso (en tu máquina):
 *   - Exporta tu API key: set RENDER_API_KEY=... (Windows) o export RENDER_API_KEY=... (mac/linux)
 *   - node scripts/render-create-services.js <owner/repo>
 *
 * Ejemplo:
 *   RENDER_API_KEY=xxxx node scripts/render-create-services.js goirismc/Gatocafee
 *
 * Nota: Render puede cambiar su API. Este script hace llamadas a /v1/services y muestra la respuesta completa.
 * Si la API cambia, revisa https://api.render.com v1 docs para adaptar los campos.
 */

const { argv, env } = require('process');
const fetch = globalThis.fetch || require('node-fetch');

if (!env.RENDER_API_KEY) {
  console.error('ERROR: debes exportar RENDER_API_KEY antes de ejecutar el script.');
  console.error('Windows (PowerShell): $env:RENDER_API_KEY = "<KEY>"; node scripts/render-create-services.js goirismc/Gatocafee');
  console.error('mac/linux: export RENDER_API_KEY="<KEY>"; node scripts/render-create-services.js goirismc/Gatocafee');
  process.exit(1);
}

const repo = argv[2] || 'goirismc/Gatocafee';
const branch = 'main';
const api = 'https://api.render.com/v1/services';

async function createService(payload) {
  const res = await fetch(api, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RENDER_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch(e) { body = text; }
  return { status: res.status, body };
}

async function getOwnerId() {
  const res = await fetch('https://api.render.com/v1/owners', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${env.RENDER_API_KEY}` }
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch(e) { body = text; }
  if (Array.isArray(body) && body.length > 0 && body[0].owner && body[0].owner.id) {
    return body[0].owner.id;
  }
  throw new Error('No ownerId found in /v1/owners response');
}

(async () => {
  console.log('Repositorio:', repo);
  console.log('Creando servicios en Render...');

  // Backend payload
  const backendPayload = {
    name: 'gatocafee-backend',
    type: 'web_service',
    plan: 'free',
    // serviceDetails required for non-static services
    serviceDetails: {
      repo: `https://github.com/${repo}`,
      branch,
      env: 'node',
      buildCommand: 'npm install',
      startCommand: 'npm start',
      healthCheckPath: '/api/health'
    }
  };

  // Frontend payload
  const frontendPayload = {
    name: 'gatocafee-frontend',
    type: 'web_service',
    plan: 'free',
    serviceDetails: {
      repo: `https://github.com/${repo}`,
      branch,
      env: 'node',
      buildCommand: 'npm run build',
      startCommand: 'npm start'
    }
  };

  try {
    const ownerId = await getOwnerId();
    // attach owner fields required by Render API
    backendPayload.ownerID = ownerId;
    backendPayload.ownerId = ownerId;

    frontendPayload.ownerID = ownerId;
    frontendPayload.ownerId = ownerId;

    console.log('\n1) Creando backend...');
    const backendRes = await createService(backendPayload);
    console.log('Backend status:', backendRes.status);
    console.log('Backend response:', JSON.stringify(backendRes.body, null, 2));

    console.log('\n2) Creando frontend...');
    const frontendRes = await createService(frontendPayload);
    console.log('Frontend status:', frontendRes.status);
    console.log('Frontend response:', JSON.stringify(frontendRes.body, null, 2));

    console.log('\nHecho. Si las llamadas devuelven error 400/422, revisa la respuesta y adapta los campos según la API de Render.');
    console.log('Por seguridad, configura las variables de entorno y secretos desde el dashboard de Render tras crear los servicios.');
  } catch (err) {
    console.error('Error durante la petición:', err);
    process.exit(1);
  }
})();
