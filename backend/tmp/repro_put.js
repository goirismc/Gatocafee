(async () => {
  try {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMmJiNDk1Mjk1MGNiZDViNzljYmM3YyIsImlhdCI6MTc4MTMyMjc4OCwiZXhwIjoxNzgxMzUxNTg4fQ.Tvl5xTfKPMSwZkc-laMy60AbNzxmFZr6JoShBwhLkjs";
    const id = '6a29bdeb1adbd1307d06f562';
    const base = 'http://localhost:5002/api';

    console.log('=== GET cliente ===');
    const getRes = await fetch(`${base}/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('GET status', getRes.status);
    const getBody = await getRes.text();
    console.log('GET body:', getBody);

    const payload = {
      nombre: 'Prueba desde Ventas',
      apellido: '',
      razonSocial: 'Prueba SRL',
      ci_ruc: '',
      direccion: '',
      telefono: '',
      email: ''
    };

    console.log('=== PUT cliente ===');
    console.log('Payload:', JSON.stringify(payload));
    const putRes = await fetch(`${base}/clientes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    console.log('PUT status', putRes.status);
    const putBody = await putRes.text();
    console.log('PUT body:', putBody);

  } catch (e) {
    console.error('Script error:', e.stack || e);
    process.exit(1);
  }
})();
