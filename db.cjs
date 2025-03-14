const { Client } = require("pg");

const client = new Client({
  user: "postgres",
  host: process.env.PG_HOST,
  database: " RUTU_STOCK",
  password: "itegoss2025",
  port: process.env.PG_PORT,
});

client
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL from Node.js!"))
  .catch((err) => console.error("❌ Connection error:", err.stack));

module.exports = client;
