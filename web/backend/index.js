require("dotenv").config({ path: __dirname + "/.env.development" });
console.log("🌍 GEOAPIFY_API_KEY =", process.env.GEOAPIFY_API_KEY);
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { pool } = require("./config/mysql");
const { initSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

// ✅ Khởi tạo socket
initSocket(server);

// ✅ Middleware CORS + JSON
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const googleLoginRoute = require("./src/routes/google-login");
app.use("/api/auth/google", googleLoginRoute);

const registerRoute = require("./src/routes/register");
app.use("/api/register", registerRoute);

const homeRoutes = require("./src/routes/home");
app.use("/api/home", homeRoutes);

const aboutRoutes = require("./src/routes/about");
app.use("/api/about", aboutRoutes);

const aiRoutes = require("./src/routes/ai");
app.use("/api/ai", aiRoutes);

const bookingsRoutes = require("./src/routes/bookings");
app.use("/api/bookings", bookingsRoutes);

const reviewsRoutes = require("./src/routes/reviews");
app.use("/api/reviews", reviewsRoutes);

const pointsRoutes = require("./src/routes/points");
app.use("/api/points", pointsRoutes);

const paymentsRoutes = require("./src/routes/payments");

const chatRoutes = require("./src/routes/chat");
app.use("/api/chat", chatRoutes);

// ✅ Thêm middleware riêng cho payments (để xử lý ảnh đúng URL)
app.use("/api/payments", (req, res, next) => {
  req.BASE_URL = process.env.BASE_URL || "http://localhost:5000"; // thêm BASE_URL
  next();
}, paymentsRoutes);

// ✅ Route test
app.get("/", async (req, res) => {
  const t = await pool.query("SELECT 1 + 1 AS solution");
  console.log("The solution is:", t[0][0].solution);
  res.send("🚀 Backend is running...");
});


// ✅ Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`✅ Server running on http://localhost:${PORT}`);
//   console.log("🖼️ Static files served from:", path.join(__dirname, "uploads"));
// });


// ✅ Start server đúng chuẩn (Express + Socket.IO)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server + Socket.IO running on http://localhost:${PORT}`);
  console.log("🖼️ Static files served from:", path.join(__dirname, "uploads"));
});
