// backend/db.js
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",        // đổi nếu khác
  password: "@Quang12345", // đổi mật khẩu DB của bạn
  database: "tour_booking_db",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
