-- Migration script: Thêm các cột snapshot vào bảng bookings
-- Chạy script này nếu bảng bookings chưa có các cột snapshot

USE travel_booking;

-- Kiểm tra và thêm các cột snapshot nếu chưa có
SET @col_tour_name := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'travel_booking' AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'tour_name'
);

SET @sql := IF(@col_tour_name = 0,
  'ALTER TABLE bookings 
   ADD COLUMN tour_name VARCHAR(255) AFTER tour_id,
   ADD COLUMN provider_name VARCHAR(255) AFTER tour_name,
   ADD COLUMN start_date DATE AFTER provider_name,
   ADD COLUMN end_date DATE AFTER start_date,
   ADD COLUMN price DECIMAL(12,2) AFTER end_date,
   ADD COLUMN currency VARCHAR(5) DEFAULT "VND" AFTER price,
   ADD COLUMN customer_name VARCHAR(100) AFTER currency,
   ADD COLUMN customer_email VARCHAR(191) AFTER customer_name,
   ADD COLUMN customer_phone VARCHAR(20) AFTER customer_email;',
  'SELECT "Các cột snapshot đã tồn tại."'
);
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- Kiểm tra quantity và total_price
SET @col_quantity := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'travel_booking' AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'quantity'
);

SET @sql := IF(@col_quantity = 0,
  'ALTER TABLE bookings 
   ADD COLUMN quantity INT DEFAULT 1 AFTER tour_id,
   ADD COLUMN total_price DECIMAL(12,2) DEFAULT 0 AFTER quantity;',
  'SELECT "Cột quantity và total_price đã tồn tại."'
);
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

SELECT "✅ Migration hoàn tất!";

