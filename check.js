const https = require('https');

const init = JSON.stringify({
  jsonrpc: "2.0",
  id: "1",
  method: "initialize",
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } }
});

const opt = {
  hostname: 'mcp.supabase.com',
  path: '/mcp?project_ref=xczqrgddqdyzpkpkzzyo&features=database',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sbp_bb7ab2279843f92bb4b6835e6b3b848874443a09',
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Content-Length': Buffer.byteLength(init)
  }
};

const req = https.request(opt, (res) => {
  let d = '';
  res.on('data', (c) => d += c);
  res.on('end', () => {
    const sid = res.headers['mcp-session-id'] || 'x';
    const q = JSON.stringify({
      jsonrpc: "2.0",
      id: "2",
      method: "tools/call",
      params: {
        name: "execute_sql",
        arguments: { query: `SELECT id, favorited_by FROM inventory WHERE favorited_by IS NOT NULL AND favorited_by != 'null'::jsonb LIMIT 3` }
      }
    });
    const r = https.request({
      ...opt,
      headers: { ...opt.headers, 'Mcp-Session-Id': sid, 'Content-Length': Buffer.byteLength(q) }
    }, (res2) => {
      let d2 = '';
      res2.on('data', (c) => d2 += c);
      res2.on('end', () => console.log(d2.slice(-600)));
    });
    r.on('error', (e) => console.error(e));
    r.write(q);
    r.end();
  });
});

req.on('error', (e) => console.error(e));
req.write(init);
req.end();