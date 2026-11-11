const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const dir = path.join(__dirname, '../../data');
fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(path.join(dir, 'ez.sqlite'));
db.pragma = (statement) => db.exec(`PRAGMA ${statement}`);
db.transaction = (fn) => (...args) => {
  db.exec('BEGIN');
  try { const result = fn(...args); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
};
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8'));
module.exports = db;
