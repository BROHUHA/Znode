export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-yt-cookie, x-goog-cookie, X-Goog-PageId, X-Goog-Visitor-Id'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const rawPath = req.query.path;
    let endpoint = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath || '');
    if (!endpoint && req.url) {
      const cleanUrl = req.url.split('?')[0];
      endpoint = cleanUrl.replace(/^\/api\/innertube\/?/, '');
    }
    const targetUrl = `https://music.youtube.com/youtubei/v1/${endpoint}`;

    const authHeader = req.headers['authorization'];
    const ytCookie = req.headers['x-yt-cookie'] || req.headers['x-goog-cookie'] || req.headers['cookie'];
    const pageId = req.headers['x-goog-pageid'];
    const visitorId = req.headers['x-goog-visitor-id'];

    const isTvClient = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ');

    let parsedBody = {};
    if (typeof req.body === 'string') {
      try {
        parsedBody = JSON.parse(req.body);
      } catch (_) {
        parsedBody = {};
      }
    } else if (req.body && typeof req.body === 'object') {
      parsedBody = req.body;
    }

    const bodyClientName = parsedBody?.context?.client?.clientName;
    const bodyClientVersion = parsedBody?.context?.client?.clientVersion;

    let forwardUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';
    let forwardClientName = isTvClient ? '31' : '67';
    let forwardClientVersion = isTvClient ? '7.20260707.07.00' : '1.20250101.01.00';

    if (bodyClientName === 'IOS') {
      forwardClientName = '5';
      forwardClientVersion = bodyClientVersion || '19.45.4';
      forwardUserAgent = `com.google.ios.youtube/${forwardClientVersion} (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)`;
    } else if (bodyClientName === 'ANDROID_MUSIC') {
      forwardClientName = '21';
      forwardClientVersion = bodyClientVersion || '6.43.52';
      forwardUserAgent = `com.google.android.apps.youtube.music/${forwardClientVersion} (Linux; U; Android 14)`;
    } else if (bodyClientName === 'TVHTML5') {
      forwardClientName = '7';
      forwardClientVersion = bodyClientVersion || '7.20260707.07.00';
    }

    const forwardHeaders = {
      'Content-Type': 'application/json',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
      'User-Agent': forwardUserAgent,
      'X-YouTube-Client-Name': forwardClientName,
      'X-YouTube-Client-Version': forwardClientVersion,
    };

    if (authHeader) forwardHeaders['Authorization'] = authHeader;
    if (ytCookie) forwardHeaders['Cookie'] = ytCookie;
    if (pageId) forwardHeaders['X-Goog-PageId'] = pageId;
    if (visitorId) forwardHeaders['X-Goog-Visitor-Id'] = visitorId;

    let ytRes = await fetch(targetUrl, {
      method: req.method || 'POST',
      headers: forwardHeaders,
      body:
        req.method !== 'GET' && req.method !== 'HEAD'
          ? JSON.stringify(parsedBody)
          : undefined,
    });

    // If unauthenticated request was rejected by YouTube (datacenter IP block 400/403/429),
    // automatically retry using Android Music client which is not datacenter IP blocked
    if (!authHeader && !ytCookie && (ytRes.status === 400 || ytRes.status === 403 || ytRes.status === 429)) {
      const androidHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.apps.youtube.music/5.26.54 (Linux; U; Android 14)',
        'X-YouTube-Client-Name': '21',
        'X-YouTube-Client-Version': '5.26.54',
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/',
      };

      const androidBody = {
        ...parsedBody,
        context: {
          client: {
            clientName: 'ANDROID_MUSIC',
            clientVersion: '5.26.54',
            osName: 'Android',
            osVersion: '14',
            androidSdkVersion: 34,
            hl: 'en',
            gl: 'US',
          },
          user: parsedBody?.context?.user || { lockedSafetyMode: false },
        },
      };

      try {
        const retryRes = await fetch(targetUrl, {
          method: req.method || 'POST',
          headers: androidHeaders,
          body: JSON.stringify(androidBody),
        });

        if (retryRes.ok) {
          ytRes = retryRes;
        }
      } catch (retryErr) {
        console.warn('Android Music client fallback error:', retryErr);
      }
    }

    const data = await ytRes.text();
    res.status(ytRes.status);
    res.setHeader('Content-Type', ytRes.headers.get('content-type') || 'application/json');
    return res.send(data);
  } catch (error) {
    console.error('Innertube proxy error:', error);
    return res.status(500).json({ error: error.message || 'Internal proxy error' });
  }
}
