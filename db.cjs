const { Client } = require("pg");

const client = new Client({
  user: process.env.PG_USER, // Must match the Render username
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: {
    rejectUnauthorized: false, // This is required for Render PostgreSQL
  },
});

client
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL successfully!"))
  .catch((err) => console.error("❌ Database Connection Error:", err.stack));

module.exports = client;
