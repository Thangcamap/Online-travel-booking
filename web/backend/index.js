require("dotenv").config({ path: __dirname + "/.env.development" });
console.log("🌍 GEOAPIFY_API_KEY =", process.env.GEOAPIFY_API_KEY);
const express = require("express");
const cors = require("cors");
const path = require("path");;
const { pool } = require("./config/mysql");

const app = express();

// ✅ Middleware CORS + JSON
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json());

// ✅ Static: phục vụ ảnh trong thư mục backend/uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Import routes
const geocodeRoutes = require("./src/routes/geocode");
app.use("/api/geocode", geocodeRoutes);

const addressRoutes = require("./src/routes/addressRoutes");
app.use("/api/addresses", addressRoutes);

const adminRoutes = require("./src/routes/admins");
app.use("/api/admins", adminRoutes);

const toursRouter = require("./src/routes/tours");
app.use("/api/tours", toursRouter);

const providerRoutes = require("./src/routes/providers");
app.use("/api/providers", providerRoutes);

const loginRoute = require("./src/routes/login");
app.use("/api/login", loginRoute);

const registerRoute = require("./src/routes/register");
app.use("/api/register", registerRoute);

const homeRoutes = require("./src/routes/home");
app.use("/api/home", homeRoutes);

const aiRoutes = require("./src/routes/ai");
app.use("/api/ai", aiRoutes);



// ✅ Route test
app.get("/", async (req, res) => {
  const t = await pool.query("SELECT 1 + 1 AS solution");
  console.log("The solution is:", t[0][0].solution);
  res.send("🚀 Backend is running...");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log("🖼️ Static files served from:", path.join(__dirname, "uploads"));
});
