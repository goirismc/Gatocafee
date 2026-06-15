const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI no definido en .env');

    const [basePart, queryPart] = uri.split('?');
    const lastSlash = basePart.lastIndexOf('/');
    const baseNoDb = lastSlash === -1 ? basePart : basePart.substring(0, lastSlash);
    const sourceUri = queryPart ? `${baseNoDb}/?${queryPart}` : `${baseNoDb}/`;

    console.log('Conectando a (origen):', sourceUri.replace(/:[^@]+@/, ':*****@'));
    console.log('Conectando a (destino):', uri.replace(/:[^@]+@/, ':*****@'));

    const srcConn = mongoose.createConnection(sourceUri, { serverSelectionTimeoutMS: 10000 });
    const tgtConn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 10000 });

    await srcConn.asPromise();
    await tgtConn.asPromise();

    const srcCollections = await srcConn.db.listCollections().toArray();
    const tgtCollections = await tgtConn.db.listCollections().toArray();

    console.log('Colecciones en ORIGEN (test):', srcCollections.map(c => c.name));
    console.log('Colecciones en DESTINO (Gatocafee):', tgtCollections.map(c => c.name));

    // Mostrar conteo de colecciones relevantes si existen
    for (const c of ['usuarios','usuario','usuarioss','Usuarios']) {
      try {
        const sCount = await srcConn.db.collection(c).countDocuments();
        console.log(`Origen: conteo ${c}:`, sCount);
      } catch (e) {}
      try {
        const tCount = await tgtConn.db.collection(c).countDocuments();
        console.log(`Destino: conteo ${c}:`, tCount);
      } catch (e) {}
    }

    await srcConn.close();
    await tgtConn.close();
    process.exit(0);
  } catch (err) {
    console.error('Error inspeccionando colecciones:', err);
    process.exit(1);
  }
})();
