-- Bảng người dùng chung (user, provider, admin)
CREATE TABLE users (
  user_id VARCHAR(16) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
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
  provider_id VARCHAR(16) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  description TEXT,
  email VARCHAR(255),
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
  tour_id VARCHAR(16) PRIMARY KEY,
  provider_id VARCHAR(16) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'VND',
  start_date DATE,
  end_date DATE,
  available_slots INT DEFAULT 0,              -- 🆕 số chỗ còn lại
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tour_provider FOREIGN KEY (provider_id) REFERENCES tour_providers(provider_id) ON DELETE CASCADE
);

-- Bảng ảnh
CREATE TABLE images (
  image_id VARCHAR(16) PRIMARY KEY,
  entity_type ENUM('tour', 'provider', 'user') NOT NULL,
  entity_id VARCHAR(32) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  -- Không dùng FOREIGN KEY vì entity_type khác nhau
);

-- Bảng bookings
CREATE TABLE bookings (
  booking_id VARCHAR(16) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL,
  tour_id VARCHAR(16) NOT NULL,
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  check_in_time TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

-- Bảng đánh giá
CREATE TABLE reviews (
  review_id VARCHAR(16) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL,
  tour_id VARCHAR(16) NOT NULL,
  rating TINYINT,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_review_tour FOREIGN KEY (tour_id) REFERENCES tours(tour_id) ON DELETE CASCADE
);

-- Bảng gợi ý từ AI
CREATE TABLE ai_recommendations (
  rec_id VARCHAR(16) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL,
  preferences TEXT,
  suggested_tours TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
