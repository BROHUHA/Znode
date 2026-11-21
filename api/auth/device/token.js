export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const deviceCode = body.device_code;
    if (!deviceCode) {
      return res.status(400).json({ error: 'Missing device_code' });
    }

    const clientId = body.client_id?.trim() || '861556708454-d6dlm3lh05idd8npek18k6be8ba3oc68.apps.googleusercontent.com';
    const clientSecret = body.client_secret?.trim() || 'SboVhoG9s0rNafixCSGGKXAT';

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return res.status(200).json({ status: 'pending', error: tokenData.error });
    }

    const accessToken = tokenData.access_token;
    let accountInfo = {
      name: 'YouTube Music Listener',
      email: '',
      thumbnailUrl: null,
    };

    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        accountInfo = {
          name: userData.name || userData.email?.split('@')[0] || 'YouTube Music Listener',
          email: userData.email || '',
          thumbnailUrl: userData.picture || null,
        };
      }
    } catch (uErr) {
      console.warn('UserInfo fetch warning:', uErr);
    }

    if (!accountInfo.thumbnailUrl) {
      try {
        const chanRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (chanRes.ok) {
          const chanData = await chanRes.json();
          const snippet = chanData.items?.[0]?.snippet;
          if (snippet) {
            accountInfo.name = snippet.title || accountInfo.name;
            accountInfo.thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || accountInfo.thumbnailUrl;
          }
        }
      } catch (cErr) {
        console.warn('Channel fetch warning:', cErr);
      }
    }

    return res.status(200).json({
      status: 'success',
      accessToken,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      account: accountInfo,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
