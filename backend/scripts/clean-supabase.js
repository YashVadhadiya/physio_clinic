require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
let ws;
try { ws = require('ws'); } catch { ws = null; }
const options = {};
if (ws) options.realtime = { transport: ws };

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, options);

const tables = ['activity_logs', 'visits', 'patients', 'workers', 'settings'];
const pks = {
  workers: 'WorkerID',
  patients: 'PatientID',
  visits: 'VisitID',
  activity_logs: 'LogID',
  settings: 'Key'
};

async function clean() {
  for (const table of tables) {
    const { data } = await supabase.from(table).select(pks[table]);
    if (data && data.length > 0) {
      for (const row of data) {
        await supabase.from(table).delete().eq(pks[table], row[pks[table]]);
      }
      console.log(`Deleted ${data.length} rows from ${table}`);
    } else {
      console.log(`${table}: already empty`);
    }
  }
  console.log('\nAll tables cleaned. Ready for fresh test.');
}

clean().catch(e => console.error('Error:', e.message)).finally(() => process.exit(0));
