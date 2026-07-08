require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');
const http = require('http');

const projectRef = process.env.SUPABASE_URL?.match(/https?:\/\/(.+)\.supabase\.co/)?.[1] || '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

function makeRequest(url, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const req = mod.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  // Try using a Supabase Management API approach
  // There's a way to run SQL via the query endpoint
  const sql = `ALTER TABLE patients ADD COLUMN IF NOT EXISTS "Status" TEXT DEFAULT 'active' CHECK ("Status" IN ('active', 'deleted'));`;

  // Try direct connection to cloud-sql via Supabase
  // Use the REST API's rpc mechanism if there's a pg function
  // Or try the direct postgres connection string with pooler
  
  // Actually, the simplest: use the @supabase/supabase-js client
  // to try to execute via a special endpoint
  
  // Try the Supabase projects API
  try {
    console.log('Trying Supabase Management API...');
    const r = await makeRequest(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      'POST',
      { query: sql },
      {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      }
    );
    console.log(`  Status: ${r.status}`, typeof r.body === 'string' ? r.body.substring(0, 200) : JSON.stringify(r.body).substring(0, 200));
    if (r.status === 200 || r.status === 201) {
      console.log('  Column added!');
      process.exit(0);
    }
  } catch (e) {
    console.log(`  Failed: ${e.message}`);
  }

  // Try pooler with project-ref hostname
  const { Client } = require('pg');
  const configs = [
    {
      connectionString: `postgresql://postgres.${projectRef}:${serviceKey}@${projectRef}.pooler.supabase.com:6543/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    {
      connectionString: `postgresql://postgres.${projectRef}:${serviceKey}@${projectRef}.supabase.co:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
  ];

  for (const config of configs) {
    const client = new Client(config);
    try {
      console.log(`\nTrying: ${config.connectionString.substring(0, 70)}...`);
      await client.connect();
      console.log('  Connected!');
      await client.query(sql);
      console.log('  Status column added successfully!');
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`  Failed: ${err.message.substring(0, 120)}`);
      try { await client.end(); } catch {}
    }
  }

  console.error('\nAll connection attempts failed.');
  console.error('Please run this SQL in your Supabase SQL Editor:');
  console.error(`\n  ${sql}\n`);
  process.exit(1);
}

run();
