#!/usr/bin/env node
// mitigation_upload_tests.js
// Arranca server.js (backend), prepara archivos de prueba y ejecuta 5 uploads

const cp = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendDir, '..');

console.log('Repo root:', repoRoot);
console.log('Backend dir:', backendDir);

// Spawn server
console.log('Spawning backend server...');
const server = cp.spawn(process.execPath, ['server.js'], { cwd: backendDir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', d => process.stdout.write('[SERVER] ' + d.toString()));
server.stderr.on('data', d => process.stderr.write('[SERVER-ERR] ' + d.toString()));

// Poll health endpoints
const ports = [5001,5000,5002,5003,5004,5005];
let foundBase = null;
// Token para pruebas (debe pasarse por env `TEST_TOKEN`). Si no se proporciona, el script intentará hacer login con credenciales de prueba.
let TEST_TOKEN = process.env.TEST_TOKEN;
async function waitForBase(){
  const maxTries = 40;
  for(let t=0;t<maxTries;t++){
    // no redeclarar TEST_TOKEN aquí; usar la variable global

    for(const p of ports){
      try{
        const res = await fetch(`http://localhost:${p}/api/health`);
        if(res && res.ok){
          const j = await res.json().catch(()=>null);
          if(j && j.success){
            return `http://localhost:${p}`;
          }
        }
      }catch(e){ /* ignore */ }
    }
    await new Promise(r=>setTimeout(r,250));
  }
  return null;
}

(async function main(){
  try{
    const base = await waitForBase();
    if(!base) throw new Error('No server base found after timeout');
    console.log('Server base found at', base);

    // Preparar tmp
    const tmpDir = path.join(repoRoot, 'tmp');
    fs.mkdirSync(tmpDir, { recursive: true });

    // Seleccionar fuente JPG existente
    const srcJpg = path.join(repoRoot, 'frontend', 'public', 'images', 'chocolatefrio.jpg');
    if(!fs.existsSync(srcJpg)){
      throw new Error('Source JPG not found: ' + srcJpg);
    }

    const jpgValid = path.join(tmpDir, 'test_valid.jpg');
    fs.copyFileSync(srcJpg, jpgValid);

    // Crear PNG a partir de JPG usando Jimp
    let pngValid = path.join(tmpDir, 'test_valid.png');
    try{
      const Jimp = require('jimp');
      const img = await Jimp.read(srcJpg);
      await img.writeAsync(pngValid);
      console.log('PNG created:', pngValid);
    }catch(e){
      console.error('Could not create PNG via Jimp:', e.message);
      // fallback: copy jpg as png (will be mismatched)
      fs.copyFileSync(srcJpg, pngValid);
    }

    // Fake extension: jpg content but .png extension
    const fakeExt = path.join(tmpDir, 'fake_ext.png');
    fs.copyFileSync(jpgValid, fakeExt);

    // SVG test
    const svgPath = path.join(tmpDir, 'test.svg');
    fs.writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="red"/></svg>', 'utf8');

    // Large file (>6MB) with JPEG header by repeating jpg
    const largePath = path.join(tmpDir, 'large.jpg');
    const srcBuf = fs.readFileSync(jpgValid);
    fs.writeFileSync(largePath, srcBuf);
    while(fs.statSync(largePath).size < 6*1024*1024){
      fs.appendFileSync(largePath, srcBuf);
    }
    console.log('Large file created size:', fs.statSync(largePath).size);

    // Helper: obtener token de prueba si no fue provisto
    async function obtainTestTokenIfNeeded(baseUrl) {
      if (TEST_TOKEN) return TEST_TOKEN;
      try {
        console.log('No TEST_TOKEN proporcionado; intentando login con credenciales de prueba');
        const r = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@gatocafee.com', password: 'admin123' })
        });
        if (!r.ok) throw new Error('Login falló: ' + r.status);
        const j = await r.json();
        TEST_TOKEN = j.token;
        console.log('TEST_TOKEN obtenido vía login de prueba');
        return TEST_TOKEN;
      } catch (err) {
        console.warn('No se pudo obtener TEST_TOKEN automáticamente:', err.message);
        return TEST_TOKEN;
      }
    }

    // Helper: post multipart using fetch and manual boundary
    async function postFile(filePath, clientContentType, omitAuth = false){
      const fname = path.basename(filePath);
      const fileBuf = fs.readFileSync(filePath);
      const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
      const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fname}"\r\nContent-Type: ${clientContentType}\r\n\r\n`);
      const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([head, fileBuf, tail]);

      if (!omitAuth) await obtainTestTokenIfNeeded(base);

      const headers = {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': String(body.length)
      };
      if (!omitAuth && TEST_TOKEN) headers['Authorization'] = `Bearer ${TEST_TOKEN}`;

      const res = await fetch(`${base}/api/uploads/product-image`, {
        method: 'POST',
        headers,
        body: body
      });
      const text = await res.text().catch(()=>'<non-json-response>');
      return { status: res.status, body: text };
    }

    const results = [];

    console.log('\n=== Test 1: JPG válido (con token) ===');
    results.push({name:'JPG con token', file: jpgValid, res: await postFile(jpgValid, 'image/jpeg')});

    console.log('\n=== Test 2: JPG válido (sin token) ===');
    results.push({name:'JPG sin token', file: jpgValid, res: await postFile(jpgValid, 'image/jpeg', true)});

    console.log('\n=== Test 3: Large (sin token) ===');
    results.push({name:'Large sin token', file: largePath, res: await postFile(largePath, 'image/jpeg', true)});

    console.log('\n=== Results Summary ===');
    for(const r of results){
      console.log('---', r.name, '---');
      console.log('File:', r.file);
      console.log('Status:', r.res.status);
      console.log('Body:', r.res.body);
    }

    // Kill server
    try{ server.kill(); }catch(e){}
    process.exit(0);

  }catch(err){
    console.error('Error in tests:', err);
    try{ server.kill(); }catch(e){}
    process.exit(1);
  }
})();
