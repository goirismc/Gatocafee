/*
  Script seguro para copiar colecciones desde una BD con nombre literal
  "appName=Gatocafee" hacia "Gatocafee" en el mismo cluster.

  Uso:
    node copy_appname_to_gatocafee.js [ORIGEN_DB] [DESTINO_DB]

  Ejemplo (por defecto):
    node copy_appname_to_gatocafee.js "appName=Gatocafee" Gatocafee

  Comportamiento:
  - Para cada colección en la BD origen, itera documentos y los inserta
    en la colección homóloga de la BD destino.
  - Si un documento con el mismo `_id` ya existe en destino, lo omite
    para evitar sobrescribir o eliminar datos.
  - Informa conteos de insertados / omitidos / errores por colección.

  Requisitos: `MONGODB_URI` definido en `backend/.env`.
*/

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  const srcDb = process.argv[2] || 'appName=Gatocafee';
  const tgtDb = process.argv[3] || 'Gatocafee';

  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    console.error('MONGODB_URI no definido en backend/.env');
    process.exit(1);
  }

  function buildUriForDb(baseUri, dbName) {
    const [basePart, queryPart] = baseUri.split('?');
    const lastSlash = basePart.lastIndexOf('/');
    const baseNoDb = lastSlash === -1 ? basePart : basePart.substring(0, lastSlash);
    // encode dbName to handle characters like '=' safely
    const encodedDb = encodeURIComponent(dbName);
    return queryPart ? `${baseNoDb}/${encodedDb}?${queryPart}` : `${baseNoDb}/${encodedDb}`;
  }

  const srcUri = buildUriForDb(rawUri, srcDb);
  const tgtUri = buildUriForDb(rawUri, tgtDb);

  console.log('Origen DB:', srcDb);
  console.log('Destino DB:', tgtDb);
  console.log('Conectando a cluster...');

  let srcConn, tgtConn;
  try {
    srcConn = mongoose.createConnection(srcUri, { serverSelectionTimeoutMS: 10000 });
    tgtConn = mongoose.createConnection(tgtUri, { serverSelectionTimeoutMS: 10000 });

    await srcConn.asPromise();
    await tgtConn.asPromise();

    console.log('Conexiones establecidas. Listando colecciones en origen...');
    const srcCols = await srcConn.db.listCollections().toArray();
    const colNames = srcCols.map(c => c.name).filter(n => !n.startsWith('system.'));

    if (colNames.length === 0) {
      console.log('No hay colecciones en la BD origen. Nada que copiar.');
      await srcConn.close();
      await tgtConn.close();
      return process.exit(0);
    }

    console.log('Colecciones a procesar:', colNames.join(', '));

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const name of colNames) {
      console.log('\n--- Colección:', name, '---');
      const srcColl = srcConn.db.collection(name);
      const tgtColl = tgtConn.db.collection(name);

      const srcCount = await srcColl.countDocuments();
      const tgtCount = await tgtColl.countDocuments();
      console.log(`Origen: ${srcCount} docs — Destino: ${tgtCount} docs`);

      if (srcCount === 0) {
        console.log('Origen vacío — saltando.');
        continue;
      }

      const cursor = srcColl.find({}, { batchSize: 500 });
      let inserted = 0;
      let skipped = 0;
      let errors = 0;

      for await (const doc of cursor) {
        try {
          // Intentar insertar tal cual (mantener _id original)
          await tgtColl.insertOne(doc);
          inserted++;
        } catch (err) {
          // Código 11000: documento existente (duplicado _id u otro índice único)
          if (err && (err.code === 11000 || (err.code && err.code === 11000))) {
            skipped++;
          } else {
            errors++;
            console.error('Error insertando documento en', name, err.message || err);
          }
        }
      }

      console.log(`Colección ${name}: insertados=${inserted}, omitidos=${skipped}, errores=${errors}`);
      totalInserted += inserted;
      totalSkipped += skipped;
      totalErrors += errors;
    }

    console.log('\n=== Resumen total ===');
    console.log(`Insertados: ${totalInserted}`);
    console.log(`Omitidos (duplicados): ${totalSkipped}`);
    console.log(`Errores: ${totalErrors}`);

    await srcConn.close();
    await tgtConn.close();
    console.log('Copia completada.');
    process.exit(0);
  } catch (e) {
    console.error('Error durante copia:', e);
    try { if (srcConn) await srcConn.close(); } catch (_) {}
    try { if (tgtConn) await tgtConn.close(); } catch (_) {}
    process.exit(1);
  }
})();
