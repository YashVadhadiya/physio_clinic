-- PhysioClinic Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables
-- Column names match the existing Google Sheets format (PascalCase)

-- 1. Workers
CREATE TABLE IF NOT EXISTS workers (
  "WorkerID" TEXT PRIMARY KEY,
  "Name" TEXT NOT NULL,
  "Mobile" TEXT,
  "Email" TEXT,
  "Address" TEXT DEFAULT '',
  "PasswordHash" TEXT NOT NULL,
  "Role" TEXT NOT NULL DEFAULT 'worker' CHECK ("Role" IN ('admin', 'worker')),
  "Status" TEXT NOT NULL DEFAULT 'active' CHECK ("Status" IN ('active', 'inactive', 'deleted')),
  "JoiningDate" TEXT,
  "EmergencyContact" TEXT DEFAULT '',
  "ProfilePhoto" TEXT DEFAULT '',
  "CreatedAt" TEXT NOT NULL,
  "UpdatedAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workers_mobile ON workers("Mobile");
CREATE INDEX IF NOT EXISTS idx_workers_email ON workers("Email");
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers("Status");

-- 2. Patients
CREATE TABLE IF NOT EXISTS patients (
  "PatientID" TEXT PRIMARY KEY,
  "Name" TEXT NOT NULL,
  "Mobile" TEXT,
  "Address" TEXT DEFAULT '',
  "Gender" TEXT DEFAULT '' CHECK ("Gender" IN ('Male', 'Female', 'Other', '')),
  "Age" TEXT DEFAULT '',
  "Notes" TEXT DEFAULT '',
  "Status" TEXT DEFAULT 'active' CHECK ("Status" IN ('active', 'deleted')),
  "CreatedBy" TEXT,
  "CreatedAt" TEXT NOT NULL,
  "UpdatedAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients("Mobile");
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients("Name");

-- 3. Visits
CREATE TABLE IF NOT EXISTS visits (
  "VisitID" TEXT PRIMARY KEY,
  "PatientID" TEXT NOT NULL REFERENCES patients("PatientID"),
  "WorkerID" TEXT NOT NULL REFERENCES workers("WorkerID"),
  "VisitDate" TEXT NOT NULL,
  "VisitTime" TEXT,
  "VisitType" TEXT DEFAULT 'Home' CHECK ("VisitType" IN ('Home', 'Hospital')),
  "FeesCollected" TEXT DEFAULT 'No' CHECK ("FeesCollected" IN ('Yes', 'No')),
  "Amount" TEXT DEFAULT '0',
  "TreatmentNotes" TEXT DEFAULT '',
  "Remarks" TEXT DEFAULT '',
  "NextVisit" TEXT DEFAULT '',
  "CreatedAt" TEXT NOT NULL,
  "UpdatedAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits("PatientID");
CREATE INDEX IF NOT EXISTS idx_visits_worker_id ON visits("WorkerID");
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits("VisitDate");

-- 4. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  "LogID" TEXT PRIMARY KEY,
  "UserID" TEXT,
  "Action" TEXT NOT NULL,
  "Description" TEXT DEFAULT '',
  "Timestamp" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs("UserID");
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs("Timestamp");

-- 5. Settings
CREATE TABLE IF NOT EXISTS settings (
  "Key" TEXT PRIMARY KEY,
  "Value" TEXT DEFAULT '',
  "UpdatedAt" TEXT
);
