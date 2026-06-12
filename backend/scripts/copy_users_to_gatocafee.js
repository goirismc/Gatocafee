const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI no definido en .env');

    // Construir URI origen (sin nombre de BD) para apuntar a la DB por defecto (test)
    const [basePart, queryPart] = uri.split('?');
    const lastSlash = basePart.lastIndexOf('/');
    const baseNoDb = lastSlash === -1 ? basePart : basePart.substring(0, lastSlash);
    const sourceUri = queryPart ? `${baseNoDb}/?${queryPart}` : `${baseNoDb}/`;

    console.log('Source URI (preview):', sourceUri.replace(/:[^@]+@/, ':*****@'));
    console.log('Target URI (preview):', uri.replace(/:[^@]+@/, ':*****@'));

    // Conexiones
    const srcConn = mongoose.createConnection(sourceUri, { serverSelectionTimeoutMS: 10000 });
    const tgtConn = mongoose.create_connection ? mongoose.create_connection(uri, { serverSelectionTimeoutMS: 10000 }) : mongoose.createConnection(uri, { serverSelectionTimeoutMS: 10000 });

    await srcConn.asPromise();
    await tgtConn.asPromise();

    const srcColl = srcConn.db.collection('usuarios');
    const tgtColl = tgtConn.db.collection('usuarios');

    const srcCount = await srcColl.countDocuments();
    const tgtCount = await tgtColl.countDocuments();

    console.log('Usuarios en origen (test):', srcCount);
    console.log('Usuarios en destino (Gatocafee):', tgtCount);

    if (srcCount === 0) {
      console.log('No hay usuarios en la DB origen. Nada que copiar.');
    } else if (tgtCount > 0) {
      console.log('DB destino ya contiene usuarios. No se realizará copia para evitar duplicados.');
    } else {
      const docs = await srcColl.find().toArray();
      if (docs.length === 0) {
        console.log('Origen vacío. Abortando.');
      } else {
        await tgtColl.insertMany(docs);
        console.log(`Copiadas ${docs.length} documentos de 'usuarios' a la DB Gatocafee.`);
      }
    }

    await srcConn.close();
    await tgtConn.close();
    process.exit(0);
  } catch (err) {
    console.error('Error durante la migración:', err);
    process.exit(1);
  }
})();
