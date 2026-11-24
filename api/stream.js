import { Readable } from 'node:stream';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).send('Invalid or missing url parameter');
  }

  try {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const upstream = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers,
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).end();
    }

    const passthroughHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
    ];
    for (const h of passthroughHeaders) {
      const val = upstream.headers.get(h);
      if (val) res.setHeader(h, val);
    }
    if (!upstream.headers.get('accept-ranges')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(upstream.status);

    if (req.method === 'HEAD' || !upstream.body) {
      return res.end();
    }

    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.on('error', () => {
      if (!res.writableEnded) res.end();
    });
    return nodeStream.pipe(res);
  } catch (error) {
    console.error('Stream proxy error:', error);
    if (!res.headersSent) {
      return res.status(502).send(error.message || 'Stream proxy failed');
    }
    if (!res.writableEnded) res.end();
  }
}
