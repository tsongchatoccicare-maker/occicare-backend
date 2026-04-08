/**
 * Netlify Function: Line Notify Proxy
 * URL: /.netlify/functions/line-proxy
 * เนื่องจาก Line API ไม่รองรับ CORS จาก Browser โดยตรง
 */
const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { token, message } = JSON.parse(event.body || '{}');
    if (!token || !message) return { statusCode: 400, headers, body: JSON.stringify({ message: 'Missing token or message' }) };

    const body = 'message=' + encodeURIComponent(message);
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'notify-api.line.me',
        path: '/api/notify',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        resolve({ statusCode: 200, headers, body: JSON.stringify({ message: 'sent', status: res.statusCode }) });
      });
      req.on('error', (e) => resolve({ statusCode: 500, headers, body: JSON.stringify({ message: e.message }) }));
      req.write(body);
      req.end();
    });
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ message: e.message }) };
  }
};
