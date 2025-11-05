USE travel_booking;

-- ===========================================================
-- 🧱 TẠO CỘT payment_image (nếu chưa có)
-- ===========================================================
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_image VARCHAR(255) NULL AFTER status;

-- ===========================================================
-- 👤 THÊM NGƯỜI DÙNG, NHÀ CUNG CẤP, TOUR, ĐẶT CHỖ, THANH TOÁN MẪU
-- ===========================================================

-- 1️⃣ Người dùng (User thường)
INSERT INTO users (user_id, name, email, password, phone_number, role)
VALUES ('iof839n25b', 'Quang Tran', 'quangtran12@gmail.com', '123456', '0987654321', 'user')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 2️⃣ Nhà cung cấp (Provider)
INSERT INTO users (user_id, name, email, password, phone_number, role)
VALUES ('U013', 'Công ty Du lịch ABC', 'provider@example.com', 'abc123', '0909009009', 'provider')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3️⃣ Hồ sơ công ty du lịch
INSERT INTO tour_providers (provider_id, user_id, company_name, email, phone_number, status, approval_status)
VALUES ('PRV001', 'U013', 'Công ty Du lịch ABC', 'provider@example.com', '0909009009', 'active', 'approved')
ON DUPLICATE KEY UPDATE company_name = VALUES(company_name);

-- 4️⃣ Tour mẫu
INSERT INTO tours (tour_id, provider_id, name, description, price, currency, start_date, end_date, available_slots)
VALUES ('T001', 'PRV001', 'Tour Đà Nẵng 3N2Đ', 'Khám phá Đà Nẵng trong 3 ngày 2 đêm', 3500000, 'VND', '2025-12-01', '2025-12-03', 20)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 5️⃣ Booking (Đặt tour cho người dùng Quang Tran)
INSERT INTO bookings (booking_id, user_id, tour_id, status)
VALUES ('BOOK012', 'iof839n25b', 'T001', 'confirmed')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 6️⃣ Payment (Hóa đơn thanh toán)
INSERT INTO payments (payment_id, booking_id, amount, method, status, payment_image)
VALUES ('PAY012', 'BOOK012', 3500000, 'online', 'unpaid', NULL)
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ===========================================================
-- ✅ KIỂM TRA KẾT QUẢ
-- ===========================================================
SELECT * FROM users;
SELECT * FROM tours;
SELECT * FROM bookings;
SELECT * FROM payments;
