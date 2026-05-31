const pool = require("./index");

async function testDB() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log(res.rows[0]);
  } catch (err) {
    console.error(err);
  }
}

testDB();