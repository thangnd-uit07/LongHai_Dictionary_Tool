'use strict';

/**
 * Re-export schema từ sqliteDb.js (port từ C# ExcelUtils/sqlite/SqliteDb.cs).
 *
 * File này giữ lại để tương thích với code cũ đã import từ './db/schema'.
 */
const sqliteDb = require('./sqliteDb');

module.exports = {
  SCHEMA_SQL: sqliteDb.SCHEMA_SQL,
  createSchema: sqliteDb.createSchema,
};

