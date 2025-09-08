const express = require("express");
const cors = require("cors");
const { pool } = require("./config/mysql");

const app = express();
app.use(cors());
app.use(express.json());

// Route test
app.get("/", async (req, res) => {
  
const t =  await pool.query("SELECT 1 + 1 AS solution")
console.log('The solution is: ', t[0][0].solution); // should log "The solution is: 2"
  res.send("🚀 Backend is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
