export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;
  const filename = req.query.filename || 'track.m4a';

  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).send('Invalid or missing url parameter');
  }

  try {
    const fileRes = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      },
    });

    if (!fileRes.ok) {
      return res.status(fileRes.status).end();
    }

    const contentType = fileRes.headers.get('content-type') || 'audio/mp4';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    const buffer = await fileRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Download proxy error:', error);
    return res.status(502).send(error.message || 'Download failed');
  }
}
