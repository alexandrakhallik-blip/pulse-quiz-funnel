export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, program, programDesc } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const escapeHtml = (str) =>
    String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

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

    const safeName = escapeHtml(name);
    const safeProgram = escapeHtml(program);
    const safeDesc = escapeHtml(programDesc);

    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Pulse', email: 'alexandrakhallik@gmail.com' },
        to: [{ email, name: name || undefined }],
        subject: `${safeName ? safeName + ', твоя' : 'Твоя'} программа готова 🎉`,
        htmlContent: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
            <h1 style="font-size: 22px;">Привет${safeName ? ', ' + safeName : ''}! 👋</h1>
            <p>Мы подобрали тебе программу на основе твоих ответов в квизе:</p>
            <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h2 style="font-size: 18px; margin: 0 0 8px;">${safeProgram}</h2>
              <p style="margin: 0; color: #555;">${safeDesc}</p>
            </div>
            <p>Установи приложение Pulse — программа уже будет ждать тебя внутри, 7 дней Premium бесплатно.</p>
            <p style="margin-top: 32px; color: #888; font-size: 13px;">Не хочешь больше получать письма? Просто ответь на это письмо словом "стоп".</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const details = await emailRes.text();
      return res.status(200).json({ ok: true, emailWarning: details });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
