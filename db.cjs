const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const client = new Client({
  user: process.env.PG_USER,
  host: "dpg-cv9t2fqn91rc738sp4pg-a.oregon-postgres.render.com",
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432,
  // ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// client.query("SELECT NOW();")
//   .then((res) => console.log("Database Time:", res.rows[0].now))
//   .catch((err) => console.error("Query Error:", err.stack));

client
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL successfully!"))
  .catch((err) => console.error("❌ Database Connection Error:", err.stack));

module.exports = client;
