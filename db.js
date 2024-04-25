const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

pool.connect((err) => {
  if (err) throw err;
  console.log("Connected to PostgreSQL database");
});

const checkTableQuery = `
  SELECT to_regclass('public.delivery_data') AS exists
`;

pool.query(checkTableQuery, (err, res) => {
  if (err) {
    console.error("Error checking for table", err);
    return;
  }
  if (!res.rows[0].exists) {
    const createTableQuery = `
      CREATE TABLE delivery_data (
        id SERIAL PRIMARY KEY,
        organization_id VARCHAR(255) NOT NULL,
        zone VARCHAR(255) NOT NULL,
        total_distance FLOAT NOT NULL,
        item_type VARCHAR(255) NOT NULL,
        total_price FLOAT NOT NULL,
        currency VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL
      )
    `;
    pool.query(createTableQuery, (err, res) => {
      if (err) {
        console.error("Error creating table", err);
        return;
      }
      console.log("Table is successfully created");
    });
  } else {
    console.log("Table already exists");
  }
});

module.exports = pool;
