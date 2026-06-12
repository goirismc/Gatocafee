const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let value;
if (process.env.NEXT_PUBLIC_API_URL) {
  value = process.env.NEXT_PUBLIC_API_URL;
} else if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/NEXT_PUBLIC_API_URL=(.*)/);
  if (match) value = match[1].trim();
}

if (!value) {
  console.error('Falta NEXT_PUBLIC_API_URL en .env.local o en el entorno');
  process.exit(1);
}
console.log('NEXT_PUBLIC_API_URL presente:', value);
process.exit(0);
