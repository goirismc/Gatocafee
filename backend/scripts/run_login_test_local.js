(async () => {
  try {
    const res = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gatocafee.com', password: 'admin123' }),
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body);
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
})();
