-- Script để XÓA trigger đang cố sử dụng cột quantity
-- Trigger này đang gây lỗi vì cố truy cập NEW.quantity mà cột không tồn tại
USE travel_booking;

-- Xóa trigger cũ (trigger này đang cố set NEW.quantity)
DROP TRIGGER IF EXISTS before_insert_booking_price;

-- Xóa trigger sinh booking_id nếu cần (code đã tự tạo booking_id)
DROP TRIGGER IF EXISTS before_insert_booking;

SELECT "✅ Đã xóa các trigger sử dụng quantity. Code sẽ tự xử lý booking.";

