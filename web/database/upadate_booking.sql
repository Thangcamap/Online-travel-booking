USE travel_booking;

-- ===========================================================
-- CẤU HÌNH CHARSET CHUNG
-- ===========================================================
SET foreign_key_checks = 0;

ALTER DATABASE travel_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE addresses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE tour_providers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE admins CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE tours CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE images CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE bookings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE payments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE reviews CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE ai_recommendations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE ai_messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE tour_itineraries CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET foreign_key_checks = 1;


-- ===========================================================
-- THÊM CỘT CÒN THIẾU (CHỐT LẠI)
-- ===========================================================

-- quantity
SET @col_quantity := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'travel_booking' AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'quantity'
);
SET @sql := IF(@col_quantity = 0,
  'ALTER TABLE bookings ADD COLUMN quantity INT DEFAULT 1 AFTER tour_id;',
  'SELECT "Cột quantity đã tồn tại."'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- total_price
SET @col_total_price := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'travel_booking' AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'total_price'
);
SET @sql := IF(@col_total_price = 0,
  'ALTER TABLE bookings ADD COLUMN total_price DECIMAL(12,2) DEFAULT 0 AFTER quantity;',
  'SELECT "Cột total_price đã tồn tại."'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payment_image
SET @col_payment_image := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'travel_booking' AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_image'
);
SET @sql := IF(@col_payment_image = 0,
  'ALTER TABLE payments ADD COLUMN payment_image VARCHAR(255) NULL AFTER status;',
  'SELECT "Cột payment_image đã tồn tại."'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ===========================================================
-- TRIGGER (BẢN CHUẨN)
-- ===========================================================

-- Sinh booking_id tự động
DROP TRIGGER IF EXISTS before_insert_booking;
DELIMITER //
CREATE TRIGGER before_insert_booking
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
  IF NEW.booking_id IS NULL OR NEW.booking_id = '' THEN
    SET NEW.booking_id = CONCAT(
      'B',
      LPAD(
        (SELECT IFNULL(MAX(CAST(SUBSTRING(booking_id, 2) AS UNSIGNED)), 0) + 1 FROM bookings),
        4,
        '0'
      )
    );
  END IF;
END;
//
DELIMITER ;

-- Tính total_price + snapshot tour + khách
DROP TRIGGER IF EXISTS before_insert_booking_price;
DELIMITER //
CREATE TRIGGER before_insert_booking_price
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
  DECLARE t_price DECIMAL(12,2);
  DECLARE t_name VARCHAR(255);
  DECLARE p_name VARCHAR(255);
  DECLARE s_date DATE;
  DECLARE e_date DATE;
  DECLARE u_name VARCHAR(100);
  DECLARE u_email VARCHAR(191);
  DECLARE u_phone VARCHAR(20);

  SELECT name, price, start_date, end_date INTO t_name, t_price, s_date, e_date
  FROM tours WHERE tour_id = NEW.tour_id;

  SELECT tp.company_name INTO p_name
  FROM tour_providers tp
  JOIN tours t ON t.provider_id = tp.provider_id
  WHERE t.tour_id = NEW.tour_id;

  SELECT name, email, phone_number INTO u_name, u_email, u_phone
  FROM users WHERE user_id = NEW.user_id;

  SET NEW.tour_name = t_name;
  SET NEW.provider_name = p_name;
  SET NEW.price = t_price;
  SET NEW.start_date = s_date;
  SET NEW.end_date = e_date;
  SET NEW.total_price = t_price * IFNULL(NEW.quantity, 1);

  SET NEW.customer_name = u_name;
  SET NEW.customer_email = u_email;
  SET NEW.customer_phone = u_phone;
END;
//
DELIMITER ;


-- ===========================================================
-- DỮ LIỆU MẪU TOUR + ẢNH
-- ===========================================================
SET SQL_SAFE_UPDATES = 0;

DELETE FROM images WHERE entity_type = 'tour';
DELETE FROM tours;

INSERT INTO tour_providers (
  provider_id, user_id, company_name, description, email, phone_number, logo_url, status, approval_status
) VALUES (
  'PRV001', 'ADM001', 'AI Travel Vietnam',
  'Công ty lữ hành hàng đầu Việt Nam chuyên tour trong nước và quốc tế.',
  'contact@aitravel.vn', '0909000111',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d',
  'active', 'approved'
);

INSERT INTO tours (
  tour_id, provider_id, name, description, price, currency, start_date, end_date, available_slots
) VALUES
('T001', 'PRV001', 'Tour Đà Nẵng 3N2Đ', 'Khám phá Đà Nẵng trong 3 ngày 2 đêm với Bà Nà Hills, Cầu Rồng, Mỹ Khê...', 3500000, 'VND', '2025-11-30', '2025-12-02', 20),
('T002', 'PRV001', 'Tour Sapa Fansipan 4N3Đ', 'Chinh phục đỉnh Fansipan – nóc nhà Đông Dương.', 4290000, 'VND', '2025-12-09', '2025-12-12', 25),
('T003', 'PRV001', 'Tour Phú Quốc Resort 3N2Đ', 'Thiên đường nghỉ dưỡng VinWonders và Sunset Town.', 5290000, 'VND', '2025-12-19', '2025-12-21', 15);

INSERT INTO images (image_id, entity_id, entity_type, image_url, description) VALUES
('IMG001', 'T001', 'tour', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', 'Biển Đà Nẵng'),
('IMG002', 'T002', 'tour', 'https://images.unsplash.com/photo-1590490359420-4c226f3e2f2e', 'Đỉnh Fansipan'),
('IMG003', 'T003', 'tour', 'https://images.unsplash.com/photo-1546484959-f4a2b9b69a4e', 'Resort Phú Quốc');

SET SQL_SAFE_UPDATES = 1;


-- ===========================================================
-- CẬP NHẬT CHI TIẾT TOUR
-- ===========================================================
UPDATE tours SET
  schedule_info = JSON_OBJECT('departure', '2025-11-30','return', '2025-12-02','base_price', '3.500.000 VND'),
  experience_info = 'Khám phá Bà Nà Hills, Cầu Rồng, Mỹ Khê, ẩm thực miền Trung.',
  package_info = '- Vé máy bay khứ hồi\n- Khách sạn 4*\n- Ăn sáng buffet\n- Vé Bà Nà Hills',
  guide_info = 'HDV chuyên nghiệp am hiểu miền Trung.',
  note_info = 'Mang giấy tờ tùy thân, không mang đồ cấm lên cáp treo.',
  surcharge_info = '- Phụ thu lễ Tết: +20%'
WHERE tour_id = 'T001';

UPDATE tours SET
  schedule_info = JSON_OBJECT('departure', '2025-12-09','return', '2025-12-12','base_price', '4.290.000 VND'),
  experience_info = 'Chinh phục đỉnh Fansipan – nóc nhà Đông Dương.',
  package_info = '- Vé tàu Hà Nội – Lào Cai\n- Khách sạn 3*\n- Ăn sáng & hướng dẫn viên',
  guide_info = 'HDV người H’Mông bản địa.',
  note_info = 'Mang áo ấm, thuốc cảm lạnh.',
  surcharge_info = '- Phụ thu phòng đơn 400.000đ/đêm'
WHERE tour_id = 'T002';

UPDATE tours SET
  schedule_info = JSON_OBJECT('departure', '2025-12-19','return', '2025-12-21','base_price', '5.290.000 VND'),
  experience_info = 'Khám phá bãi Sao, VinWonders, Sunset Town.',
  package_info = '- Vé máy bay khứ hồi\n- Resort 5*\n- Xe đưa đón\n- Vé Safari',
  guide_info = 'HDV biển đảo chuyên nghiệp.',
  note_info = 'Mang đồ bơi và CCCD khi check-in.',
  surcharge_info = '- Phụ thu view biển: +500.000đ/đêm'
WHERE tour_id = 'T003';


-- ===========================================================
-- THÊM LỊCH TRÌNH CHI TIẾT (tour_itineraries)
-- ===========================================================
INSERT INTO tour_itineraries (tour_id, day_number, title, description)
VALUES
('T001', 1, 'Ngày 1: Đà Nẵng – Bà Nà Hills', 'Khởi hành sáng, tham quan Bà Nà Hills, Cầu Vàng, Fantasy Park. Ăn trưa buffet.'),
('T001', 2, 'Ngày 2: Biển Mỹ Khê – Cầu Rồng', 'Tắm biển Mỹ Khê buổi sáng, dạo phố cổ Hội An buổi tối.'),
('T001', 3, 'Ngày 3: Mua sắm & Tiễn sân bay', 'Tham quan chợ Hàn, check-out khách sạn, ra sân bay Đà Nẵng.'),
('T002', 1, 'Ngày 1: Hà Nội – Sapa', 'Xe giường nằm đi Sapa, nhận phòng, tham quan nhà thờ đá.'),
('T002', 2, 'Ngày 2: Fansipan', 'Đi cáp treo Fansipan, ngắm cảnh và chụp ảnh lưu niệm.'),
('T002', 3, 'Ngày 3: Bản Cát Cát', 'Khám phá văn hóa dân tộc H’Mông.'),
('T002', 4, 'Ngày 4: Về Hà Nội', 'Ăn sáng, lên xe trở lại Hà Nội.');

-- ===========================================================
-- TẠO ADMIN MẶC ĐỊNH
-- ===========================================================
INSERT INTO users (user_id, name, email, password, phone_number, role)
VALUES ('ADM001', 'Admin', 'admin@gmail.com',
'$2b$10$hs40kZ1tOuUqu.WSCoOISuXA8cEov661oM2HcV2w8ZH2bS51vjMFC', '0999999999', 'admin')
ON DUPLICATE KEY UPDATE email=email;

INSERT INTO admins (admin_id, user_id)
VALUES ('A001', 'ADM001')
ON DUPLICATE KEY UPDATE admin_id=admin_id;
--cập nhập 
ALTER TABLE payments
MODIFY status ENUM('unpaid','pending','paid','failed') 
NOT NULL DEFAULT 'unpaid';

--- chừ vé nếu thanh toán 
DELIMITER $$

CREATE TRIGGER trg_booking_confirmed_deduct_slots
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    -- Chỉ chạy khi trạng thái chuyển từ pending -> confirmed
    IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN

        -- Kiểm tra còn đủ chỗ
        IF (SELECT available_slots FROM tours WHERE tour_id = NEW.tour_id) < NEW.quantity THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Không đủ chỗ trống cho tour';
        END IF;

        -- Trừ số chỗ
        UPDATE tours
        SET available_slots = available_slots - NEW.quantity
        WHERE tour_id = NEW.tour_id;
    END IF;
END$$

DELIMITER ;

---- TÍNH ĐIỂM DNAHDS GIÁ 

/* ================= USER POINTS ================= */
CREATE TABLE IF NOT EXISTS user_points (
  user_id VARCHAR(50) PRIMARY KEY,
  total_points INT DEFAULT 0,
  available_points INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/* ================= POINT TRANSACTIONS ================= */
CREATE TABLE IF NOT EXISTS point_transactions (
  transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,

  points INT NOT NULL,
  transaction_type ENUM('earn','use') NOT NULL,

  source_type ENUM('review','booking','admin','redemption','manual') DEFAULT 'manual',
  source_id BIGINT NULL,

  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id)
);
