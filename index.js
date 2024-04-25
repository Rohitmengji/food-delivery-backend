require("dotenv").config();
const express = require("express");
const { Client } = require("pg");
const swaggerSetup = require("./swagger");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 4000;

const baseDistance = 5; // in km
const basePrice = 10; // in euros

// Per km price for different types of items
const prices = {
  perishable: 1.5, // euros/km
  nonperishable: 1, // euros/km
};

const currency = "euros";

const connectionString = process.env.DATABASE_URL;

const client = new Client({
  connectionString: connectionString,
});

const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database");
  } catch (error) {
    console.error("Connection error", error);
  }
};

connectToDatabase();

// Check if the table exists, if not, create it
const checkTableQuery = `
  SELECT to_regclass('public.delivery_data') AS exists
`;

client.query(checkTableQuery, (err, res) => {
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
    client.query(createTableQuery, (err, res) => {
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

// Calculate delivery cost
const calculateCost = (distance, itemType) => {
  if (isNaN(distance) || distance <= 0) {
    throw new Error("Invalid distance");
  }

  let totalPrice = basePrice;
  if (distance > baseDistance) {
    const extraDistance = distance - baseDistance;
    totalPrice += extraDistance * prices[itemType];
  }
  return totalPrice;
};

// Enable CORS
app.use(cors());

app.use(express.json());

// Delivery cost endpoint
app.post("/calculate-cost", async (req, res) => {
  const { organization_id, zone, total_distance, item_type } = req.body;

  try {
    // Validate request
    if (!organization_id || !zone || !total_distance || !item_type) {
      throw new Error("Missing required fields");
    }

    // Check if item_type is valid
    if (!prices[item_type.toLowerCase()]) {
      throw new Error("Invalid item type");
    }

    // Calculate total price
    const totalPrice = calculateCost(
      parseFloat(total_distance),
      item_type.toLowerCase()
    );

    // Save data to the PostgreSQL database
    const timestamp = new Date().toISOString();
    const insertDataQuery = `
      INSERT INTO delivery_data (organization_id, zone, total_distance, item_type, total_price, currency, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      organization_id,
      zone,
      parseFloat(total_distance),
      item_type,
      totalPrice,
      currency,
      timestamp,
    ];

    const result = await client.query(insertDataQuery, values);
    res.json({ total_price: `${totalPrice} ${currency}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/data", async (req, res) => {
  try {
    const getDataQuery = `SELECT * FROM delivery_data`;
    const result = await client.query(getDataQuery);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching data", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/data/:organization_id", async (req, res) => {
  const organization_id = req.params.organization_id;
  try {
    const deleteDataQuery = `DELETE FROM delivery_data 
    WHERE organization_id = $1`;

    const result = await client.query(deleteDataQuery, [organization_id]);
    res.json({ message: "Data Deleted Successfully" });
  } catch (error) {
    console.error("Error deleting data", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Setup Swagger
swaggerSetup(app);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
