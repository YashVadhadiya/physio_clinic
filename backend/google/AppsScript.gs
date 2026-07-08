/**
 * PhysioClinic - Google Apps Script Backend
 * 
 * Deploy this file to your Google Sheet:
 *   Extensions -> Apps Script -> Paste this code -> Deploy -> New deployment -> Web app
 *   Execute as: Me, Who has access: Anyone
 * 
 * Set SCRIPT_TOKEN below to a secret value for request authentication.
 * Leave empty to disable token checking (not recommended for production).
 */

var SCRIPT_TOKEN = ''; // Set this to a secret token

var SHEET_NAMES = {
  WORKERS: 'Workers',
  PATIENTS: 'Patients',
  VISITS: 'Visits',
  ACTIVITY_LOGS: 'ActivityLogs',
  SETTINGS: 'Settings'
};

var HEADERS = {};
HEADERS[SHEET_NAMES.WORKERS] = [
  'WorkerID', 'Name', 'Mobile', 'Email', 'Address', 'PasswordHash',
  'Role', 'Status', 'JoiningDate', 'EmergencyContact', 'ProfilePhoto',
  'CreatedAt', 'UpdatedAt'
];
HEADERS[SHEET_NAMES.PATIENTS] = [
  'PatientID', 'Name', 'Mobile', 'Address', 'Gender', 'Age',
  'Notes', 'CreatedBy', 'CreatedAt', 'UpdatedAt'
];
HEADERS[SHEET_NAMES.VISITS] = [
  'VisitID', 'PatientID', 'WorkerID', 'VisitDate', 'VisitTime',
  'VisitType', 'FeesCollected', 'Amount', 'TreatmentNotes',
  'Remarks', 'NextVisit', 'CreatedAt', 'UpdatedAt'
];
HEADERS[SHEET_NAMES.ACTIVITY_LOGS] = [
  'LogID', 'UserID', 'Action', 'Description', 'Timestamp'
];
HEADERS[SHEET_NAMES.SETTINGS] = [
  'Key', 'Value', 'UpdatedAt'
];

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    
    if (SCRIPT_TOKEN && params.token !== SCRIPT_TOKEN) {
      return respond({ success: false, message: 'Unauthorized' }, 403);
    }
    
    var action = params.action;
    var sheet = params.sheet;
    
    switch (action) {
      case 'init':
        return handleInit();
      case 'getAll':
        return handleGetAll(sheet);
      case 'getById':
        return handleGetById(sheet, params.idField, params.idValue);
      case 'insert':
        return handleInsert(sheet, params.data);
      case 'update':
        return handleUpdate(sheet, params.idField, params.idValue, params.data);
      case 'delete':
        return handleDelete(sheet, params.idField, params.idValue, params.softDelete);
      case 'search':
        return handleSearch(sheet, params.searchTerm, params.fields);
      case 'filter':
        return handleFilter(sheet, params.filters);
      case 'paginate':
        return handlePaginate(sheet, params.page, params.limit, params.filters);
      case 'count':
        return handleCount(sheet, params.filters);
      case 'aggregate':
        return handleAggregate(sheet, params.valueField, params.groupByField);
      case 'dateRange':
        return handleDateRange(sheet, params.dateField, params.startDate, params.endDate);
      case 'sort':
        return handleSort(sheet, params.sortField, params.sortOrder);
      case 'getMultiple':
        return handleGetMultiple(params.sheets);
      default:
        return respond({ success: false, message: 'Unknown action: ' + action }, 400);
    }
  } catch (err) {
    return respond({ success: false, message: err.message }, 500);
  }
}

function doGet(e) {
  return respond({ success: false, message: 'Use POST method' }, 405);
}

function respond(data, statusCode) {
  statusCode = statusCode || 200;
  return ContentService
    .createTextOutput(JSON.stringify({
      success: statusCode < 400,
      data: data,
      message: statusCode < 400 ? 'Success' : data.message || 'Error'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetByName(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headers = HEADERS[name];
    if (headers) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function getAllData(sheetName) {
  var sheet = getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j] !== undefined ? String(data[i][j]) : '';
    }
    rows.push(row);
  }
  return rows;
}

function findRowIndex(sheetName, idField, idValue) {
  var data = getSheetByName(sheetName).getDataRange().getValues();
  if (data.length < 2) return -1;
  var headers = data[0];
  var idCol = headers.indexOf(idField);
  if (idCol === -1) return -1;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idValue)) return i;
  }
  return -1;
}

// ---- Handlers ----

function handleInit() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existingSheets = ss.getSheets().map(function(s) { return s.getName(); });
  var created = [];
  
  for (var key in SHEET_NAMES) {
    var name = SHEET_NAMES[key];
    if (existingSheets.indexOf(name) === -1) {
      var sheet = ss.insertSheet(name);
      var headers = HEADERS[name];
      if (headers) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
      }
      created.push(name);
    }
  }
  
  return respond({ initialized: true, created: created });
}

function handleGetAll(sheetName) {
  var rows = getAllData(sheetName);
  return respond(rows);
}

function handleGetById(sheetName, idField, idValue) {
  var rows = getAllData(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][idField]) === String(idValue)) {
      return respond(rows[i]);
    }
  }
  return respond(null);
}

function handleInsert(sheetName, data) {
  var sheet = getSheetByName(sheetName);
  var headers = HEADERS[sheetName];
  if (!headers) return respond({ error: 'Unknown sheet' }, 400);
  
  var now = new Date().toISOString();
  var values = [];
  for (var i = 0; i < headers.length; i++) {
    var val = data[headers[i]];
    if (val === undefined || val === null) val = '';
    if (headers[i] === 'CreatedAt' && !data.CreatedAt) val = now;
    if (headers[i] === 'UpdatedAt' && !data.UpdatedAt) val = now;
    values.push(val);
  }
  
  sheet.appendRow(values);
  return respond(data);
}

function handleUpdate(sheetName, idField, idValue, updateData) {
  var idx = findRowIndex(sheetName, idField, idValue);
  if (idx === -1) return respond({ error: 'Record not found: ' + idValue }, 404);
  
  var sheet = getSheetByName(sheetName);
  var headers = HEADERS[sheetName];
  var data = sheet.getDataRange().getValues();
  var row = data[idx];
  
  for (var j = 0; j < headers.length; j++) {
    if (updateData[headers[j]] !== undefined) {
      row[j] = updateData[headers[j]];
    }
    if (headers[j] === 'UpdatedAt') {
      row[j] = new Date().toISOString();
    }
  }
  
  var range = sheet.getRange(idx + 1, 1, 1, row.length);
  range.setValues([row]);
  
  // Return updated row
  var result = {};
  for (var k = 0; k < headers.length; k++) {
    result[headers[k]] = row[k] !== undefined ? String(row[k]) : '';
  }
  return respond(result);
}

function handleDelete(sheetName, idField, idValue, softDelete) {
  if (softDelete) {
    return handleUpdate(sheetName, idField, idValue, { Status: 'deleted' });
  }
  
  var idx = findRowIndex(sheetName, idField, idValue);
  if (idx === -1) return respond({ error: 'Record not found' }, 404);
  
  var sheet = getSheetByName(sheetName);
  sheet.deleteRow(idx + 1);
  return respond({ deleted: true });
}

function handleSearch(sheetName, searchTerm, fields) {
  var rows = getAllData(sheetName);
  var term = String(searchTerm).toLowerCase();
  var results = [];
  
  for (var i = 0; i < rows.length; i++) {
    var match = false;
    if (!fields || fields.length === 0) {
      for (var key in rows[i]) {
        if (String(rows[i][key]).toLowerCase().indexOf(term) !== -1) {
          match = true;
          break;
        }
      }
    } else {
      for (var f = 0; f < fields.length; f++) {
        var field = fields[f];
        if (rows[i][field] && String(rows[i][field]).toLowerCase().indexOf(term) !== -1) {
          match = true;
          break;
        }
      }
    }
    if (match) results.push(rows[i]);
  }
  
  return respond(results);
}

function handleFilter(sheetName, filters) {
  var rows = getAllData(sheetName);
  var results = [];
  
  for (var i = 0; i < rows.length; i++) {
    var match = true;
    for (var key in filters) {
      if (!filters[key]) continue;
      if (String(rows[i][key]).toLowerCase() !== String(filters[key]).toLowerCase()) {
        match = false;
        break;
      }
    }
    if (match) results.push(rows[i]);
  }
  
  return respond(results);
}

function handlePaginate(sheetName, page, limit, filters) {
  page = page || 1;
  limit = limit || 20;
  var rows = getAllData(sheetName);
  
  if (filters) {
    var filtered = [];
    for (var i = 0; i < rows.length; i++) {
      var match = true;
      for (var key in filters) {
        if (!filters[key]) continue;
        if (String(rows[i][key]).toLowerCase().indexOf(String(filters[key]).toLowerCase()) === -1) {
          match = false;
          break;
        }
      }
      if (match) filtered.push(rows[i]);
    }
    rows = filtered;
  }
  
  var total = rows.length;
  var totalPages = Math.ceil(total / limit);
  var start = (page - 1) * limit;
  var paged = rows.slice(start, start + limit);
  
  return respond({
    data: paged,
    pagination: {
      total: total,
      page: page,
      limit: limit,
      totalPages: totalPages
    }
  });
}

function handleCount(sheetName, filters) {
  var rows = getAllData(sheetName);
  
  if (!filters || Object.keys(filters).length === 0) {
    return respond(rows.length);
  }
  
  var count = 0;
  for (var i = 0; i < rows.length; i++) {
    var match = true;
    for (var key in filters) {
      if (!filters[key]) continue;
      if (String(rows[i][key]).toLowerCase() !== String(filters[key]).toLowerCase()) {
        match = false;
        break;
      }
    }
    if (match) count++;
  }
  
  return respond(count);
}

function handleAggregate(sheetName, valueField, groupByField) {
  var rows = getAllData(sheetName);
  var grouped = {};
  
  for (var i = 0; i < rows.length; i++) {
    var key = rows[i][groupByField] || 'Unknown';
    var val = parseFloat(rows[i][valueField]) || 0;
    if (grouped[key] === undefined) grouped[key] = 0;
    grouped[key] += val;
  }
  
  return respond(grouped);
}

function handleDateRange(sheetName, dateField, startDate, endDate) {
  var rows = getAllData(sheetName);
  var start = new Date(startDate).getTime();
  var end = new Date(endDate).getTime();
  var results = [];
  
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][dateField]) continue;
    var rowTime = new Date(rows[i][dateField]).getTime();
    if (rowTime >= start && rowTime <= end) {
      results.push(rows[i]);
    }
  }
  
  return respond(results);
}

function handleSort(sheetName, sortField, sortOrder) {
  var rows = getAllData(sheetName);
  sortOrder = sortOrder || 'asc';
  
  rows.sort(function(a, b) {
    var valA = String(a[sortField] || '');
    var valB = String(b[sortField] || '');
    if (sortOrder === 'asc') return valA.localeCompare(valB);
    return valB.localeCompare(valA);
  });
  
  return respond(rows);
}

function handleGetMultiple(sheets) {
  if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
    return respond({ error: 'sheets must be a non-empty array' }, 400);
  }
  
  var result = {};
  for (var i = 0; i < sheets.length; i++) {
    result[sheets[i]] = getAllData(sheets[i]);
  }
  
  return respond(result);
}
