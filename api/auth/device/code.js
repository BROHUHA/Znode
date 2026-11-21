export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const clientId = body.client_id?.trim() || '861556708454-d6dlm3lh05idd8npek18k6be8ba3oc68.apps.googleusercontent.com';

    const bodyParams = new URLSearchParams({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube-paid-content https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    });

    const googleRes = await fetch('https://oauth2.googleapis.com/device/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    });

    const data = await googleRes.json();
    return res.status(googleRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
