USE travel_booking;

-- ===========================================================
-- 🧱 THÊM CỘT payment_image (nếu chưa có)
-- ===========================================================
SET @col_exists := (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'travel_booking' 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'payment_image'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE payments ADD COLUMN payment_image VARCHAR(255) NULL AFTER status;',
  'SELECT "Cột payment_image đã tồn tại, bỏ qua.";'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ===========================================================
-- 💡 GÁN USER ID HIỆN CÓ (xem bằng: SELECT * FROM users;)
-- ===========================================================
SET @CUSTOM_USER_ID = '0phiwvucmjfp';
-- Ép collation để tránh lỗi mix (utf8mb4_unicode_ci vs utf8mb4_0900_ai_ci)
SET @CUSTOM_USER_ID = CONVERT(@CUSTOM_USER_ID USING utf8mb4) COLLATE utf8mb4_unicode_ci;


-- ===========================================================
-- 🧭 TẠO DỮ LIỆU MẪU CHO HỆ THỐNG (Tour / Provider)
-- ===========================================================

-- 1️⃣ Nhà cung cấp (Provider)
INSERT INTO users (user_id, name, email, password, phone_number, role)
VALUES ('U013', 'Công ty Du lịch ABC', 'provider@example.com', 'abc123', '0909009009', 'provider')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 2️⃣ Hồ sơ công ty du lịch
INSERT INTO tour_providers (provider_id, user_id, company_name, email, phone_number, status, approval_status)
VALUES ('PRV001', 'U013', 'Công ty Du lịch ABC', 'provider@example.com', '0909009009', 'active', 'approved')
ON DUPLICATE KEY UPDATE company_name = VALUES(company_name);

-- 3️⃣ Tour mẫu (tạo tour nếu chưa có)
INSERT INTO tours (tour_id, provider_id, name, description, price, currency, start_date, end_date, available_slots)
VALUES (
  'T001',
  'PRV001',
  'Tour Đà Nẵng 3N2Đ',
  'Khám phá Đà Nẵng trong 3 ngày 2 đêm với nhiều điểm check-in nổi tiếng như Bà Nà Hills, Cầu Rồng, Mỹ Khê...',
  3500000,
  'VND',
  '2025-12-01',
  '2025-12-03',
  20
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 4️⃣ Ảnh tour mẫu (sửa đúng thứ tự cột)
INSERT INTO images (image_id, entity_id, entity_type, image_url, description)
VALUES (
  'IMG001',
  'T001',
  'tour',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'Biển Đà Nẵng'
)
ON DUPLICATE KEY UPDATE description = VALUES(description);


-- ===========================================================
-- ✅ KIỂM TRA KẾT QUẢ TOUR MẪU
-- ===========================================================
SELECT 
  t.tour_id,
  t.name AS tour_name,
  t.price,
  t.start_date,
  t.end_date,
  tp.company_name AS provider,
  i.image_url
FROM tours t
LEFT JOIN tour_providers tp ON t.provider_id = tp.provider_id
LEFT JOIN images i ON i.entity_id = t.tour_id
WHERE t.tour_id = 'T001';


-- ===========================================================
-- 🆕 TẠO TOUR ĐẶT MỚI (CHƯA THANH TOÁN)
-- ===========================================================

-- 1️⃣ Tạo booking mới cho user hiện tại
INSERT INTO bookings (booking_id, user_id, tour_id, status)
VALUES (
  'BOOK013',
  '0phiwvucmjfp',--- sử dụng user id đã gán ở trên
  'T001',
  'pending'  -- chưa xác nhận
)
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 2️⃣ Tạo hóa đơn thanh toán (chưa thanh toán)
INSERT INTO payments (payment_id, booking_id, amount, method, status, payment_image)
VALUES (
  'PAY013',
  'BOOK013',
  3500000,
  'online',
  'unpaid',  -- chưa thanh toán
  NULL
)
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 3️⃣ Kiểm tra kết quả
SELECT 
  u.name AS user_name,
  b.booking_id, b.status AS booking_status,
  p.payment_id, p.amount, p.status AS payment_status
FROM users u
JOIN bookings b ON u.user_id = b.user_id
JOIN payments p ON b.booking_id = p.booking_id
WHERE u.user_id = '0phiwvucmjfp'
ORDER BY b.created_at DESC;
