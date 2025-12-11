/**
 * Script tự động chạy SQL để khởi tạo hệ thống tích điểm
 * 
 * Cách chạy:
 *   node run_points_system.js
 * 
 * Hoặc từ thư mục root:
 *   node web/database/run_points_system.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Cấu hình database (lấy từ backend/config/mysql.js)
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'thang123', // ⚠️ Thay đổi nếu cần
  database: 'travel_booking',
  port: 3306,
  multipleStatements: true, // Cho phép chạy nhiều câu lệnh SQL
  charset: 'utf8mb4'
};

async function runSQLScript() {
  let connection;
  
  try {
    console.log('🔌 Đang kết nối đến database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Kết nối thành công!\n');

    // Đọc file SQL
    const sqlFilePath = path.join(__dirname, 'create_points_system.sql');
    console.log('📖 Đang đọc file SQL:', sqlFilePath);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`❌ Không tìm thấy file: ${sqlFilePath}`);
    }

    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ Đã đọc file SQL thành công!\n');

    // Chạy SQL script
    console.log('⚡ Đang chạy SQL script...');
    console.log('⏳ Vui lòng đợi, có thể mất vài giây...\n');
    
    await connection.query(sqlScript);
    
    console.log('✅ SQL script đã chạy thành công!\n');

    // Kiểm tra kết quả
    console.log('🔍 Đang kiểm tra kết quả...\n');
    
    // Kiểm tra bảng user_points
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'user_points'"
    );
    if (tables.length > 0) {
      console.log('✅ Bảng user_points đã được tạo');
    } else {
      console.log('❌ Bảng user_points chưa được tạo');
    }

    // Kiểm tra bảng point_transactions
    const [tables2] = await connection.query(
      "SHOW TABLES LIKE 'point_transactions'"
    );
    if (tables2.length > 0) {
      console.log('✅ Bảng point_transactions đã được tạo');
    } else {
      console.log('❌ Bảng point_transactions chưa được tạo');
    }

    // Kiểm tra trigger
    const [triggers] = await connection.query(
      "SHOW TRIGGERS WHERE `Table` = 'payments' AND `Trigger` = 'after_payment_paid'"
    );
    if (triggers.length > 0) {
      console.log('✅ Trigger after_payment_paid đã được tạo');
    } else {
      console.log('❌ Trigger after_payment_paid chưa được tạo');
    }

    // Kiểm tra function
    const [functions] = await connection.query(
      "SHOW FUNCTION STATUS WHERE Db = 'travel_booking' AND Name = 'get_user_points'"
    );
    if (functions.length > 0) {
      console.log('✅ Function get_user_points đã được tạo');
    } else {
      console.log('❌ Function get_user_points chưa được tạo');
    }

    // Đếm số user đã được khởi tạo điểm
    const [userPoints] = await connection.query(
      "SELECT COUNT(*) as count FROM user_points"
    );
    console.log(`\n📊 Số user đã được khởi tạo điểm: ${userPoints[0].count}`);

    console.log('\n🎉 Hoàn thành! Hệ thống tích điểm đã sẵn sàng.\n');

  } catch (error) {
    console.error('\n❌ LỖI:', error.message);
    console.error('\nChi tiết lỗi:');
    console.error(error);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Gợi ý: Kiểm tra lại username và password trong file này.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Gợi ý: Database "travel_booking" chưa tồn tại. Hãy tạo database trước.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Gợi ý: MySQL server chưa chạy hoặc cấu hình host/port không đúng.');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Đã đóng kết nối database.');
    }
  }
}

// Chạy script
console.log('═══════════════════════════════════════════════════');
console.log('   KHỞI TẠO HỆ THỐNG TÍCH ĐIỂM');
console.log('═══════════════════════════════════════════════════\n');

runSQLScript()
  .then(() => {
    console.log('\n✅ Script hoàn thành thành công!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script thất bại:', error);
    process.exit(1);
  });

