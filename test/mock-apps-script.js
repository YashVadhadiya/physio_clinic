const http = require('http');

const TOKEN = 'test-token-123';
const DB = {};

function ensureSheet(s) { if (!DB[s]) DB[s] = []; }

function getVal(obj, key) { return obj[key] !== undefined ? String(obj[key]) : ''; }

function jsonRes(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') return jsonRes(res, { success: false, message: 'Use POST' }, 405);

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const params = JSON.parse(body);
      const { token, action, sheet, idField, idValue, data, searchTerm, fields, filters, page, limit, softDelete, sortField, sortOrder, valueField, groupByField, dateField, startDate, endDate } = params;

      if (TOKEN && token !== TOKEN) return jsonRes(res, { success: false, message: 'Unauthorized' }, 403);

      let result;
      switch (action) {
        case 'init':
          result = { initialized: true, created: ['Workers','Patients','Visits','ActivityLogs','Settings'] };
          break;

        case 'getAll':
          ensureSheet(sheet);
          result = DB[sheet];
          break;

        case 'getById':
          ensureSheet(sheet);
          result = DB[sheet].find(r => getVal(r, idField) === String(idValue)) || null;
          break;

        case 'insert':
          ensureSheet(sheet);
          const nowI = new Date().toISOString();
          const entryI = { ...data };
          if (!entryI.CreatedAt) entryI.CreatedAt = nowI;
          if (!entryI.UpdatedAt) entryI.UpdatedAt = nowI;
          DB[sheet].push(entryI);
          result = entryI;
          break;

        case 'update':
          ensureSheet(sheet);
          const idxU = DB[sheet].findIndex(r => getVal(r, idField) === String(idValue));
          if (idxU === -1) return jsonRes(res, { success: false, message: 'Record not found: ' + idValue, data: null }, 404);
          Object.assign(DB[sheet][idxU], data);
          DB[sheet][idxU].UpdatedAt = new Date().toISOString();
          result = DB[sheet][idxU];
          break;

        case 'delete':
          ensureSheet(sheet);
          if (softDelete) {
            const idxD = DB[sheet].findIndex(r => getVal(r, idField) === String(idValue));
            if (idxD === -1) return jsonRes(res, { success: false, message: 'Not found', data: null }, 404);
            DB[sheet][idxD].Status = 'deleted';
            result = { deleted: true };
          } else {
            const before = DB[sheet].length;
            DB[sheet] = DB[sheet].filter(r => getVal(r, idField) !== String(idValue));
            result = { deleted: DB[sheet].length < before };
          }
          break;

        case 'search':
          ensureSheet(sheet);
          const term = String(searchTerm || '').toLowerCase();
          result = DB[sheet].filter(row => {
            if (fields && fields.length > 0) return fields.some(f => row[f] && String(row[f]).toLowerCase().includes(term));
            return Object.values(row).some(v => String(v).toLowerCase().includes(term));
          });
          break;

        case 'filter':
          ensureSheet(sheet);
          result = DB[sheet].filter(row => !filters || Object.entries(filters).every(([k, v]) => !v || String(row[k]).toLowerCase() === String(v).toLowerCase()));
          break;

        case 'paginate':
          ensureSheet(sheet);
          let rowsP = DB[sheet];
          if (filters) rowsP = rowsP.filter(row => Object.entries(filters).every(([k, v]) => !v || String(row[k]).toLowerCase().includes(String(v).toLowerCase())));
          const p = parseInt(page) || 1, l = parseInt(limit) || 20;
          const total = rowsP.length;
          const startP = (p - 1) * l;
          result = { data: rowsP.slice(startP, startP + l), pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
          break;

        case 'count':
          ensureSheet(sheet);
          result = DB[sheet].length;
          break;

        case 'aggregate':
          ensureSheet(sheet);
          const grouped = {};
          DB[sheet].forEach(row => {
            const k = row[groupByField] || 'Unknown';
            const v = parseFloat(row[valueField]) || 0;
            grouped[k] = (grouped[k] || 0) + v;
          });
          result = grouped;
          break;

        case 'dateRange':
          ensureSheet(sheet);
          const s = new Date(startDate).getTime(), e = new Date(endDate).getTime();
          result = DB[sheet].filter(row => row[dateField] && new Date(row[dateField]).getTime() >= s && new Date(row[dateField]).getTime() <= e);
          break;

        case 'sort':
          ensureSheet(sheet);
          result = [...DB[sheet]].sort((a, b) => (sortOrder === 'desc' ? -1 : 1) * getVal(a, sortField).localeCompare(getVal(b, sortField)));
          break;

        case 'getMultiple':
          const sheets = params.sheets || [];
          const multiRes = {};
          sheets.forEach(s => { ensureSheet(s); multiRes[s] = DB[s]; });
          result = multiRes;
          break;

        default:
          return jsonRes(res, { success: false, message: 'Unknown action: ' + action }, 400);
      }

      jsonRes(res, { success: true, data: result, message: 'Success' });
    } catch (err) {
      jsonRes(res, { success: false, message: err.message }, 500);
    }
  });
});

server.listen(3001, () => {
  console.log('Mock Apps Script running on port 3001');
});
