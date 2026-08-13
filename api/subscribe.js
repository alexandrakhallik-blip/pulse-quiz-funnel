export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, program } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: name, PROGRAM: program },
        listIds: [3],
        updateEnabled: true,
      }),
    });

    if (!brevoRes.ok) {
      const details = await brevoRes.text();
      return res.status(502).json({ error: 'Brevo error', details });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
