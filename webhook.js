const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

const SECRET = 'ofmcrm_webhook_secret_2026';
const PORT = 9000;

http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404);
    return res.end('Not found');
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const sig = req.headers['x-hub-signature-256'];
    const hmac = 'sha256=' + crypto
      .createHmac('sha256', SECRET)
      .update(body)
      .digest('hex');

    if (sig !== hmac) {
      res.writeHead(401);
      return res.end('Unauthorized');
    }

    exec('/var/www/ofmcrm/deploy.sh', (err, stdout, stderr) => {
      console.log('Deploy output:', stdout);
      if (err) console.error('Deploy error:', stderr);
    });

    res.writeHead(200);
    res.end('OK');
  });
}).listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
