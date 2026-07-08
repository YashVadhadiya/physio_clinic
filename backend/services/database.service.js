const DATABASE_TYPE = process.env.DATABASE_TYPE || 'google_sheets';

let db;

if (DATABASE_TYPE === 'supabase') {
  db = require('./supabase.service');
  console.log('Database: using Supabase');
} else {
  db = require('./googleSheets.service');
  console.log('Database: using Google Sheets');
}

module.exports = db;
