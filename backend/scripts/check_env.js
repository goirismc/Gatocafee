const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Variables de entorno faltantes:', missing.join(', '));
  process.exit(1);
}
console.log('Variables de entorno críticas presentes.');
process.exit(0);
