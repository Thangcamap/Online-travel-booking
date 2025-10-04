import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

console.log("🌱 Seeding database...");

// Lấy đường dẫn tuyệt đối của thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  // 1️⃣ Kết nối MySQL (chưa chỉ định DB)
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "thang123", // 👉 đổi nếu khác
    port: 3306,
  });

  // 2️⃣ Tạo DB nếu chưa có
  await connection.query("CREATE DATABASE IF NOT EXISTS travel_booking");
  console.log("✅ Database 'travel_booking' created or already exists");

  await connection.end();

  // 3️⃣ Kết nối lại với DB vừa tạo
  const pool = await mysql.createPool({
    host: "localhost",
    user: "root",
    password: "thang123",
    port: 3306,
    database: "travel_booking",
    multipleStatements: true,
  });

  // 4️⃣ Đọc file SQL chính xác
  const sqlPath = path.join(__dirname, "../../database/travel_booking.sql");

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Không tìm thấy file SQL tại: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");

  // 5️⃣ Thực thi SQL
  console.log("⚙️  Executing SQL script...");
  await pool.query(sql);

  // 6️⃣ Kiểm tra bảng
  const [rows] = await pool.query("SHOW TABLES");
  console.log("📋 Tables in DB:", rows.map(r => Object.values(r)[0]));

  await pool.end();
  console.log("🎉 Seeding completed successfully!");
}

// 🚀 Chạy script
initDatabase().catch(err => console.error("❌ Error:", err.message));
