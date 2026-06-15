// Use global fetch (Node >=18)
(async () => {
  try {
    const res = await fetch('http://localhost:5002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gatocafee.com', password: 'admin123' }),
    });
    const txt = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', txt);
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
