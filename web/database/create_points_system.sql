-- ===========================================================
-- HỆ THỐNG TÍCH ĐIỂM
-- ===========================================================
-- Tạo bảng lưu điểm của user
-- ===========================================================

USE travel_booking;

-- Bảng lưu tổng điểm của user
CREATE TABLE IF NOT EXISTS user_points (
  user_id VARCHAR(16) PRIMARY KEY,
  total_points INT DEFAULT 0 NOT NULL,
  available_points INT DEFAULT 0 NOT NULL,  -- Điểm có thể dùng (trừ đi điểm đã dùng)
  lifetime_points INT DEFAULT 0 NOT NULL,   -- Tổng điểm đã tích được trong đời
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_points_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng lưu lịch sử giao dịch điểm
CREATE TABLE IF NOT EXISTS point_transactions (
  transaction_id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(16) NOT NULL,
  points INT NOT NULL,  -- Số điểm (dương = cộng, âm = trừ)
  transaction_type ENUM('earned', 'used', 'expired', 'refunded') NOT NULL,
  source_type ENUM('booking', 'promotion', 'manual', 'redemption') DEFAULT 'booking',
  source_id VARCHAR(64),  -- ID của booking/payment/promotion
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transaction_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================================
-- TRIGGER: Tự động cộng điểm khi payment status = 'paid'
-- ===========================================================

DELIMITER $$

-- Trigger sau khi update payment status thành 'paid'
DROP TRIGGER IF EXISTS after_payment_paid$$
CREATE TRIGGER after_payment_paid
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  -- Chỉ xử lý khi status thay đổi từ 'unpaid' sang 'paid'
  IF OLD.status = 'unpaid' AND NEW.status = 'paid' THEN
    DECLARE v_user_id VARCHAR(16);
    DECLARE v_amount DECIMAL(10,2);
    DECLARE v_points INT;
    DECLARE v_transaction_id VARCHAR(32);
    
    -- Lấy user_id từ booking
    SELECT user_id INTO v_user_id
    FROM bookings
    WHERE booking_id = NEW.booking_id;
    
    -- Lấy amount từ payment
    SET v_amount = NEW.amount;
    
    -- Tính điểm: 1 điểm = 10,000 VND (có thể điều chỉnh)
    -- Làm tròn xuống
    SET v_points = FLOOR(v_amount / 10000);
    
    -- Chỉ cộng điểm nếu >= 1 điểm
    IF v_points >= 1 AND v_user_id IS NOT NULL THEN
      -- Tạo transaction_id
      SET v_transaction_id = CONCAT('PT', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), LPAD(FLOOR(RAND() * 10000), 4, '0'));
      
      -- Thêm transaction
      INSERT INTO point_transactions (
        transaction_id,
        user_id,
        points,
        transaction_type,
        source_type,
        source_id,
        description
      ) VALUES (
        v_transaction_id,
        v_user_id,
        v_points,
        'earned',
        'booking',
        NEW.payment_id,
        CONCAT('Tích điểm từ thanh toán tour: ', v_points, ' điểm (', v_amount, ' VND)')
      );
      
      -- Cập nhật user_points
      INSERT INTO user_points (user_id, total_points, available_points, lifetime_points)
      VALUES (v_user_id, v_points, v_points, v_points)
      ON DUPLICATE KEY UPDATE
        total_points = total_points + v_points,
        available_points = available_points + v_points,
        lifetime_points = lifetime_points + v_points;
    END IF;
  END IF;
END$$

DELIMITER ;

-- ===========================================================
-- FUNCTION: Lấy điểm của user
-- ===========================================================

DELIMITER $$

DROP FUNCTION IF EXISTS get_user_points$$
CREATE FUNCTION get_user_points(p_user_id VARCHAR(16))
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE v_points INT DEFAULT 0;
  
  SELECT COALESCE(available_points, 0) INTO v_points
  FROM user_points
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_points, 0);
END$$

DELIMITER ;

-- ===========================================================
-- Khởi tạo điểm cho các user hiện có (nếu chưa có)
-- ===========================================================

INSERT INTO user_points (user_id, total_points, available_points, lifetime_points)
SELECT user_id, 0, 0, 0
FROM users
WHERE user_id NOT IN (SELECT user_id FROM user_points)
ON DUPLICATE KEY UPDATE user_id = user_id;

