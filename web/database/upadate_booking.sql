USE travel_booking;
ALTER TABLE tours 
ADD COLUMN schedule_info TEXT NULL,
ADD COLUMN experience_info TEXT NULL,
ADD COLUMN package_info TEXT NULL,
ADD COLUMN guide_info TEXT NULL,
ADD COLUMN note_info TEXT NULL,
ADD COLUMN surcharge_info TEXT NULL;

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

USE travel_booking;

-- 🩹 Thêm cột còn thiếu vào bảng bookings nếu chưa có
SET @col_quantity := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'travel_booking' 
    AND TABLE_NAME = 'bookings' 
    AND COLUMN_NAME = 'quantity'
);
SET @sql := IF(
  @col_quantity = 0,
  'ALTER TABLE bookings ADD COLUMN quantity INT DEFAULT 1 AFTER tour_id;',
  'SELECT "✅ Cột quantity đã tồn tại, bỏ qua."'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_total_price := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'travel_booking' 
    AND TABLE_NAME = 'bookings' 
    AND COLUMN_NAME = 'total_price'
);
SET @sql := IF(
  @col_total_price = 0,
  'ALTER TABLE bookings ADD COLUMN total_price DECIMAL(12,2) DEFAULT 0 AFTER quantity;',
  'SELECT "✅ Cột total_price đã tồn tại, bỏ qua."'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ⚙️ Trigger tự động sinh booking_id (B0001, B0002,...)
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

-- 🧩 Thêm cột ảnh thanh toán nếu thiếu
SET @col_payment_image := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'travel_booking' 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'payment_image'
);
SET @sql := IF(
  @col_payment_image = 0,
  'ALTER TABLE payments ADD COLUMN payment_image VARCHAR(255) NULL AFTER status;',
  'SELECT "✅ Cột payment_image đã tồn tại, bỏ qua."'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ✅ Kiểm tra sau khi cập nhật
DESCRIBE bookings;
DESCRIBE payments;



-- ===========================================================
-- 🌴 THÊM DỮ LIỆU MẪU CHO TOUR (10 tour)
-- ===========================================================
USE travel_booking;

-- Tạm tắt safe update nếu MySQL Workbench bật chế độ an toàn
SET SQL_SAFE_UPDATES = 0;

-- 🧹 Xóa tour cũ (nếu có)
DELETE FROM images WHERE entity_type = 'tour';
DELETE FROM tours;
-- ===========================================================
-- 🧩 Thêm provider mẫu (bắt buộc trước khi thêm tour)
-- ===========================================================
INSERT INTO tour_providers (
  provider_id, user_id, company_name, description, email, phone_number, logo_url, status, approval_status
) VALUES (
  'PRV001', 'ADM001', 'AI Travel Vietnam',
  'Công ty lữ hành hàng đầu Việt Nam chuyên tour trong nước và quốc tế.',
  'contact@aitravel.vn', '0909000111',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d',
  'active', 'approved'
);

-- 🧩 Thêm 10 tour mẫu
INSERT INTO tours (
  tour_id, provider_id, name, description, price, currency,
  start_date, end_date, available_slots
) VALUES
('T001', 'PRV001', 'Tour Đà Nẵng 3N2Đ',
 'Khám phá Đà Nẵng trong 3 ngày 2 đêm với Bà Nà Hills, Cầu Rồng, Mỹ Khê...',
 3500000, 'VND', '2025-11-30', '2025-12-02', 20),

('T002', 'PRV001', 'Tour Sapa Fansipan 4N3Đ',
 'Chinh phục đỉnh Fansipan – nóc nhà Đông Dương, ngắm ruộng bậc thang Mường Hoa và bản Cát Cát.',
 4290000, 'VND', '2025-12-09', '2025-12-12', 25),

('T003', 'PRV001', 'Tour Phú Quốc Resort 3N2Đ',
 'Thiên đường nghỉ dưỡng với bãi Sao, VinWonders và Sunset Town lãng mạn.',
 5290000, 'VND', '2025-12-19', '2025-12-21', 15),

('T004', 'PRV001', 'Tour Nha Trang Biển Xanh 3N2Đ',
 'Lặn ngắm san hô Hòn Mun, tắm biển Trần Phú và khám phá Vinpearl Land.',
 3590000, 'VND', '2026-01-04', '2026-01-06', 30),

('T005', 'PRV001', 'Tour Đà Lạt Hoa Mộng 3N2Đ',
 'Trải nghiệm không khí se lạnh, ngắm hồ Xuân Hương và thác Datanla thơ mộng.',
 2990000, 'VND', '2026-01-14', '2026-01-16', 25),

('T006', 'PRV001', 'Tour Hà Giang – Cao Nguyên Đá 4N3Đ',
 'Chinh phục đèo Mã Pí Lèng, thăm cột cờ Lũng Cú và ngắm hoa tam giác mạch.',
 4490000, 'VND', '2026-01-31', '2026-02-03', 20),

('T007', 'PRV001', 'Tour Singapore – Sentosa 4N3Đ',
 'Khám phá đảo quốc sư tử, Universal Studios và Gardens by the Bay nổi tiếng.',
 11990000, 'VND', '2026-02-09', '2026-02-12', 10),

('T008', 'PRV001', 'Tour Bangkok – Pattaya 4N3Đ',
 'Tận hưởng ẩm thực Thái Lan, phố đi bộ Pattaya và chùa Vàng huyền thoại.',
 8990000, 'VND', '2026-02-19', '2026-02-22', 15),

('T009', 'PRV001', 'Tour Hạ Long – Yên Tử 3N2Đ',
 'Du ngoạn vịnh Hạ Long kỳ vĩ, chiêm bái non thiêng Yên Tử linh thiêng.',
 3890000, 'VND', '2026-03-04', '2026-03-06', 25),

('T010', 'PRV001', 'Tour Tokyo – Núi Phú Sĩ 5N4Đ',
 'Trải nghiệm văn hóa Nhật Bản, tham quan Tokyo Tower và núi Phú Sĩ biểu tượng.',
 24990000, 'VND', '2026-03-19', '2026-03-23', 12);

-- 🖼️ Thêm ảnh minh họa tương ứng cho mỗi tour
INSERT INTO images (image_id, entity_id, entity_type, image_url, description) VALUES
('IMG001', 'T001', 'tour', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', 'Biển Đà Nẵng'),
('IMG002', 'T002', 'tour', 'https://images.unsplash.com/photo-1590490359420-4c226f3e2f2e', 'Đỉnh Fansipan'),
('IMG003', 'T003', 'tour', 'https://images.unsplash.com/photo-1546484959-f4a2b9b69a4e', 'Resort Phú Quốc'),
('IMG004', 'T004', 'tour', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', 'Biển Nha Trang'),
('IMG005', 'T005', 'tour', 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b', 'Đà Lạt hoa mộng'),
('IMG006', 'T006', 'tour', 'https://images.unsplash.com/photo-1580974928060-ef8f3e8cfb61', 'Hà Giang'),
('IMG007', 'T007', 'tour', 'https://images.unsplash.com/photo-1603484477859-abe6a73f9369', 'Singapore'),
('IMG008', 'T008', 'tour', 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866', 'Bangkok'),
('IMG009', 'T009', 'tour', 'https://images.unsplash.com/photo-1600180758890-6e1f2f8d8a43', 'Hạ Long'),
('IMG010', 'T010', 'tour', 'https://images.unsplash.com/photo-1526481280695-3c720685208b', 'Tokyo – Núi Phú Sĩ');

-- Bật lại safe update
SET SQL_SAFE_UPDATES = 1;

SELECT booking_id, tour_id, total_price, status FROM bookings ORDER BY created_at DESC;
SELECT payment_id, booking_id, amount, status FROM payments ORDER BY created_at DESC;
-- ===========================================================
-- 📘 CẬP NHẬT THÔNG TIN LƯU Ý CHO CÁC TOUR
-- ===========================================================
USE travel_booking;

-- Tour Đà Nẵng 3N2Đ
UPDATE tours SET
  schedule_info = JSON_OBJECT(
    'departure', '2025-11-30',
    'return', '2025-12-02',
    'base_price', '3.500.000 VND'
  ),
  experience_info = 'Khám phá Bà Nà Hills, cầu Rồng, biển Mỹ Khê và đặc sản miền Trung.',
  package_info = '- Vé máy bay khứ hồi\n- Khách sạn 4*\n- Ăn sáng buffet\n- Xe đưa đón sân bay\n- Vé tham quan Bà Nà Hills',
  guide_info = 'Hướng dẫn viên du lịch chuyên nghiệp, am hiểu văn hóa miền Trung.',
  note_info = 'Vui lòng mang theo giấy tờ tùy thân, không mang đồ cấm lên cáp treo Bà Nà.',
  surcharge_info = '- Phụ thu lễ, Tết: +20%\n- Trẻ em ngủ riêng tính 90% giá người lớn'
WHERE tour_id = 'T001';

-- Tour Sapa Fansipan 4N3Đ
UPDATE tours SET
  schedule_info = JSON_OBJECT(
    'departure', '2025-12-09',
    'return', '2025-12-12',
    'base_price', '4.290.000 VND'
  ),
  experience_info = 'Chinh phục đỉnh Fansipan – nóc nhà Đông Dương, ngắm ruộng bậc thang Mường Hoa và bản Cát Cát.',
  package_info = '- Vé tàu khứ hồi Hà Nội – Lào Cai\n- Khách sạn 3*\n- Ăn sáng & hướng dẫn viên bản địa\n- Vé cáp treo Fansipan',
  guide_info = 'HDV người H’Mông và hướng dẫn viên bản địa có chứng chỉ hành nghề du lịch.',
  note_info = 'Nên mang theo áo ấm, giày leo núi, thuốc cảm lạnh vì thời tiết Sapa lạnh về đêm.',
  surcharge_info = '- Phụ thu phòng đơn 400.000đ/đêm\n- Vé cáp treo không bao gồm ăn trưa'
WHERE tour_id = 'T002';

-- Tour Phú Quốc Resort 3N2Đ
UPDATE tours SET
  schedule_info = JSON_OBJECT(
    'departure', '2025-12-19',
    'return', '2025-12-21',
    'base_price', '5.290.000 VND'
  ),
  experience_info = 'Khám phá bãi Sao, Grand World, Sunset Town, VinWonders và Safari.',
  package_info = '- Vé máy bay khứ hồi\n- Nghỉ dưỡng resort 5*\n- Ăn sáng buffet\n- Xe đưa đón\n- Vé VinWonders + Safari',
  guide_info = 'HDV du lịch biển đảo chuyên nghiệp, tận tâm phục vụ đoàn.',
  note_info = 'Mang theo đồ bơi, kem chống nắng và CMND/CCCD bản gốc khi check-in.',
  surcharge_info = '- Phụ thu phòng view biển: +500.000đ/đêm\n- Trẻ em 6-11 tuổi tính 70% vé người lớn'
WHERE tour_id = 'T003';

-- Tour Nha Trang Biển Xanh 3N2Đ
UPDATE tours SET
  schedule_info = JSON_OBJECT(
    'departure', '2026-01-04',
    'return', '2026-01-06',
    'base_price', '3.590.000 VND'
  ),
  experience_info = 'Lặn ngắm san hô Hòn Mun, tắm biển Trần Phú và khám phá Vinpearl Land.',
  package_info = '- Vé tàu đảo Hòn Mun\n- Khách sạn 4*\n- Ăn sáng buffet\n- Vé Vinpearl Land\n- Xe đưa đón sân bay',
  guide_info = 'Hướng dẫn viên du lịch biển giàu kinh nghiệm, vui vẻ và nhiệt tình.',
  note_info = 'Vui lòng mang theo đồ bơi, kính lặn. Giữ gìn môi trường biển trong sạch.',
  surcharge_info = '- Phụ thu dịp Tết Dương lịch: +15%\n- Phụ thu phòng đơn 400.000đ/đêm'
WHERE tour_id = 'T004';

-- Tour Đà Lạt Hoa Mộng 3N2Đ
UPDATE tours SET
  schedule_info = JSON_OBJECT(
    'departure', '2026-01-14',
    'return', '2026-01-16',
    'base_price', '2.990.000 VND'
  ),
  experience_info = 'Trải nghiệm không khí se lạnh, ngắm hồ Xuân Hương, thác Datanla và chợ đêm Đà Lạt.',
  package_info = '- Xe giường nằm khứ hồi\n- Khách sạn 3*\n- Vé thác Datanla\n- Ăn sáng buffet',
  guide_info = 'Hướng dẫn viên du lịch Tây Nguyên chuyên nghiệp, hỗ trợ 24/7.',
  note_info = 'Thời tiết lạnh về đêm, nên chuẩn bị áo ấm, mũ len, găng tay.',
  surcharge_info = '- Phụ thu cuối tuần: +10%\n- Phụ thu phòng đơn 300.000đ/đêm'
WHERE tour_id = 'T005';

-- Tour Hà Giang – Cao Nguyên Đá 4N3Đ
UPDATE tours SET
  schedule_info = JSON_OBJECT(
    'departure', '2026-01-31',
    'return', '2026-02-03',
    'base_price', '4.490.000 VND'
  ),
  experience_info = 'Chinh phục đèo Mã Pí Lèng, thăm cột cờ Lũng Cú, ngắm hoa tam giác mạch và ngủ homestay bản địa.',
  package_info = '- Xe du lịch đời mới\n- Hướng dẫn viên địa phương\n- Ăn 3 bữa/ngày\n- Ngủ homestay dân tộc H’Mông',
  guide_info = 'HDV sinh ra tại Hà Giang, hiểu rõ văn hóa vùng cao.',
  note_info = 'Đường đèo quanh co, nên mang thuốc chống say xe. Chuẩn bị pin dự phòng vì sóng yếu.',
  surcharge_info = '- Phụ thu Tết Âm lịch: +25%\n- Trẻ em dưới 5 tuổi miễn phí'
WHERE tour_id = 'T006';
