-- Bảng người dùng chung (user, provider, admin)
CREATE TABLE users (
  user_id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  avatar_url VARCHAR(255),
  role ENUM('user', 'provider', 'admin') NOT NULL DEFAULT 'user',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng địa chỉ dùng chung
CREATE TABLE addresses (
  address_id VARCHAR(16) PRIMARY KEY,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng nhà cung cấp tour (provider)
CREATE TABLE tour_providers (
  provider_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  description TEXT,
  email VARCHAR(191),
  phone_number VARCHAR(20),
  logo_url VARCHAR(255),
  cover_url VARCHAR(255),
  address_id VARCHAR(16),
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_provider_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_provider_address FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE SET NULL
);

-- Bảng admin (dành riêng cho user có role = 'admin')
CREATE TABLE admins (
  admin_id VARCHAR(16) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL UNIQUE,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Bảng tour
CREATE TABLE tours (
  tour_id VARCHAR(32) PRIMARY KEY,
  provider_id VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'VND',
  start_date DATE,
  end_date DATE,
  available_slots INT DEFAULT 0,              --  số chỗ còn lại
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tour_provider FOREIGN KEY (provider_id) REFERENCES tour_providers(provider_id) ON DELETE CASCADE
);

-- Bảng ảnh
CREATE TABLE images (
  image_id VARCHAR(16) PRIMARY KEY,
  entity_type ENUM('tour', 'provider', 'user') NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  -- Không dùng FOREIGN KEY vì entity_type khác nhau
);

-- Bảng bookings
DROP TABLE IF EXISTS bookings;
CREATE TABLE bookings (
  booking_id VARCHAR(16) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL,
  tour_id VARCHAR(32) NOT NULL,

  -- =============================
  -- Thông tin snapshot của tour tại thời điểm đặt
  -- =============================
  tour_name VARCHAR(255) NOT NULL,             -- Tên tour tại thời điểm đặt
  provider_name VARCHAR(255),                  -- Tên nhà cung cấp tour
  start_date DATE,                             -- Ngày bắt đầu tour
  end_date DATE,                               -- Ngày kết thúc tour
  price DECIMAL(12,2),                         -- Giá tour tại thời điểm đặt
  currency VARCHAR(5) DEFAULT 'VND',           -- Loại tiền (mặc định VND)

  -- =============================
  -- Thông tin đặt chỗ
  -- =============================
  quantity INT DEFAULT 1,                      -- Số lượng vé
  total_price DECIMAL(12,2) DEFAULT 0,         -- Tổng tiền (price * quantity)
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  check_in_time TIMESTAMP NULL DEFAULT NULL,

  -- =============================
  -- Thông tin snapshot người đặt
  -- =============================
  customer_name VARCHAR(100),                  -- Tên khách hàng (lưu tại thời điểm đặt)
  customer_email VARCHAR(191),                 -- Email khách hàng
  customer_phone VARCHAR(20),                  -- Số điện thoại khách hàng

  -- =============================
  -- Thông tin chi tiết của tour tại thời điểm đặt
  -- (bổ sung mới để hiển thị phần "Thông tin cần lưu ý")
  -- =============================
  schedule_info TEXT NULL,                     -- Lịch trình tổng quan (JSON)
  experience_info TEXT NULL,                   -- Mô tả trải nghiệm chính
  package_info TEXT NULL,                      -- Gói dịch vụ bao gồm
  guide_info TEXT NULL,                        -- Thông tin hướng dẫn viên
  note_info TEXT NULL,                         -- Lưu ý khi đi tour
  surcharge_info TEXT NULL,                    -- Phụ thu, chi phí thêm

  -- =============================
  -- Thông tin hệ thống
  -- =============================
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- =============================
  -- Ràng buộc khóa ngoại
  -- =============================
  CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_tour FOREIGN KEY (tour_id) REFERENCES tours(tour_id) ON DELETE CASCADE
);


-- Bảng thanh toán
CREATE TABLE payments (
  payment_id VARCHAR(16) PRIMARY KEY,
  booking_id VARCHAR(16) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('cash', 'card', 'online') NOT NULL,
  status ENUM('unpaid', 'paid') DEFAULT 'unpaid',
  payment_image VARCHAR(255) NULL,       --  Ảnh hóa đơn / chứng từ thanh toán
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

-- Bảng đánh giá
CREATE TABLE reviews (
  review_id VARCHAR(16) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL,
  tour_id VARCHAR(32) NOT NULL,
  rating TINYINT,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_review_tour FOREIGN KEY (tour_id) REFERENCES tours(tour_id) ON DELETE CASCADE
);

CREATE TABLE ai_messages (
  message_id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE tour_itineraries (
  itinerary_id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id VARCHAR(32) NOT NULL,
  day_number INT NOT NULL,                   -- Ngày thứ mấy của tour
  title VARCHAR(255),                        -- Tên tiêu đề (ví dụ: "Tham quan Hà Nội")
  description TEXT,                          -- Nội dung chi tiết (ăn, ở, đi lại...)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_id) REFERENCES tours(tour_id) ON DELETE CASCADE
);


-- Trigger tự động sinh booking_id
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

-- Trigger tự động tính total_price và lưu toàn bộ snapshot
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
  DECLARE sched TEXT;
  DECLARE exp TEXT;
  DECLARE pack TEXT;
  DECLARE guide TEXT;
  DECLARE note TEXT;
  DECLARE surcharge TEXT;

  SELECT name, price, start_date, end_date,
         schedule_info, experience_info, package_info, guide_info, note_info, surcharge_info
    INTO t_name, t_price, s_date, e_date,
         sched, exp, pack, guide, note, surcharge
  FROM tours
  WHERE tour_id = NEW.tour_id;

  SELECT tp.company_name INTO p_name
  FROM tour_providers tp
  JOIN tours t ON t.provider_id = tp.provider_id
  WHERE t.tour_id = NEW.tour_id;

  SELECT name, email, phone_number INTO u_name, u_email, u_phone
  FROM users
  WHERE user_id = NEW.user_id;

  SET NEW.tour_name = t_name;
  SET NEW.provider_name = p_name;
  SET NEW.price = t_price;
  SET NEW.start_date = s_date;
  SET NEW.end_date = e_date;
  SET NEW.total_price = t_price * IFNULL(NEW.quantity, 1);

  SET NEW.customer_name = u_name;
  SET NEW.customer_email = u_email;
  SET NEW.customer_phone = u_phone;

  SET NEW.schedule_info = sched;
  SET NEW.experience_info = exp;
  SET NEW.package_info = pack;
  SET NEW.guide_info = guide;
  SET NEW.note_info = note;
  SET NEW.surcharge_info = surcharge;
END;
//
DELIMITER ;