const fs = require("fs");
const path = require("path");
const pool = require("./index");

async function runSchema() {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");

    const sql = fs.readFileSync(schemaPath, "utf8");

    await pool.query(sql);

    console.log("Schema created successfully");

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

runSchema();