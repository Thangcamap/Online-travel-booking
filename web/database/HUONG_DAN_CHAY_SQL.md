# 📖 HƯỚNG DẪN CHẠY SQL SCRIPT - HỆ THỐNG TÍCH ĐIỂM

File này hướng dẫn cách chạy file `create_points_system.sql` để khởi tạo hệ thống tích điểm.

---

## 🔍 THÔNG TIN DATABASE

Theo file cấu hình (`backend/config/mysql.js`):
- **Database**: `travel_booking`
- **Host**: `localhost`
- **Port**: `3306`
- **User**: `root`
- **Password**: `thang123` (hoặc password của bạn)

---

## 📋 CÁC CÁCH CHẠY SQL SCRIPT

### **Cách 1: MySQL Command Line (Terminal/CMD)**

#### Bước 1: Mở Terminal/CMD
- **Windows**: Nhấn `Win + R`, gõ `cmd`, nhấn Enter
- **Mac/Linux**: Mở Terminal

#### Bước 2: Kết nối MySQL
```bash
mysql -u root -p
```
Nhập password khi được yêu cầu (ví dụ: `thang123`)

#### Bước 3: Chọn database
```sql
USE travel_booking;
```

#### Bước 4: Chạy file SQL
```bash
source D:/Capston_1/Online-travel-booking/web/database/create_points_system.sql
```

**Hoặc copy toàn bộ nội dung file SQL và paste vào MySQL command line.**

#### Bước 5: Kiểm tra kết quả
```sql
-- Kiểm tra bảng đã được tạo
SHOW TABLES LIKE '%point%';

-- Kiểm tra trigger
SHOW TRIGGERS;

-- Kiểm tra function
SHOW FUNCTION STATUS WHERE Db = 'travel_booking';
```

---

### **Cách 2: MySQL Workbench (GUI - Khuyên dùng)**

#### Bước 1: Mở MySQL Workbench
- Mở ứng dụng MySQL Workbench
- Kết nối đến server MySQL (localhost)

#### Bước 2: Chọn database
- Click vào database `travel_booking` trong panel bên trái
- Hoặc chạy lệnh: `USE travel_booking;`

#### Bước 3: Mở file SQL
- Menu: **File** → **Open SQL Script**
- Chọn file: `Online-travel-booking/web/database/create_points_system.sql`

#### Bước 4: Chạy script
- Nhấn nút **⚡ Execute** (hoặc `Ctrl + Shift + Enter`)
- Hoặc chọn menu: **Query** → **Execute (All or Selection)**

#### Bước 5: Kiểm tra kết quả
- Xem tab **Output** ở dưới để kiểm tra lỗi
- Chạy query để kiểm tra:
```sql
SHOW TABLES LIKE '%point%';
```

---

### **Cách 3: phpMyAdmin (Web Interface)**

#### Bước 1: Mở phpMyAdmin
- Truy cập: `http://localhost/phpmyadmin`
- Đăng nhập với user `root` và password

#### Bước 2: Chọn database
- Click vào database `travel_booking` ở panel bên trái

#### Bước 3: Import file SQL
- Click tab **SQL** ở trên cùng
- Click nút **Choose File** hoặc **Import files**
- Chọn file: `create_points_system.sql`
- Click **Go** hoặc **Execute**

#### Bước 4: Kiểm tra kết quả
- Xem thông báo thành công
- Kiểm tra các bảng mới trong danh sách bảng

---

### **Cách 4: HeidiSQL (Windows)**

#### Bước 1: Mở HeidiSQL
- Kết nối đến MySQL server

#### Bước 2: Chọn database
- Click vào database `travel_booking` ở panel bên trái

#### Bước 3: Mở file SQL
- Menu: **File** → **Load SQL file**
- Chọn file: `create_points_system.sql`

#### Bước 4: Chạy script
- Nhấn `F9` hoặc click nút **Execute**

---

### **Cách 5: DBeaver (Multi-platform)**

#### Bước 1: Mở DBeaver
- Kết nối đến MySQL database `travel_booking`

#### Bước 2: Mở SQL Editor
- Right-click vào database → **SQL Editor** → **New SQL Script**
- Hoặc menu: **SQL Editor** → **New SQL Script**

#### Bước 3: Mở file SQL
- Menu: **File** → **Open File**
- Chọn file: `create_points_system.sql`

#### Bước 4: Chạy script
- Nhấn `Ctrl + Enter` hoặc click nút **Execute SQL Script**

---

## ✅ KIỂM TRA SAU KHI CHẠY

Sau khi chạy script thành công, kiểm tra các bảng và trigger đã được tạo:

```sql
-- 1. Kiểm tra bảng user_points
DESCRIBE user_points;

-- 2. Kiểm tra bảng point_transactions
DESCRIBE point_transactions;

-- 3. Kiểm tra trigger
SHOW TRIGGERS WHERE `Table` = 'payments';

-- 4. Kiểm tra function
SHOW FUNCTION STATUS WHERE Db = 'travel_booking' AND Name = 'get_user_points';

-- 5. Kiểm tra dữ liệu khởi tạo
SELECT COUNT(*) as total_users FROM user_points;
```

**Kết quả mong đợi:**
- ✅ Bảng `user_points` đã được tạo
- ✅ Bảng `point_transactions` đã được tạo
- ✅ Trigger `after_payment_paid` đã được tạo
- ✅ Function `get_user_points` đã được tạo
- ✅ Tất cả user hiện có đã được khởi tạo với 0 điểm

---

## ⚠️ XỬ LÝ LỖI

### Lỗi 1: "Database does not exist"
```sql
-- Tạo database nếu chưa có
CREATE DATABASE IF NOT EXISTS travel_booking;
USE travel_booking;
```

### Lỗi 2: "Access denied"
- Kiểm tra username và password trong file `mysql.js`
- Đảm bảo user có quyền CREATE, ALTER, TRIGGER

### Lỗi 3: "Table already exists"
- Script đã dùng `CREATE TABLE IF NOT EXISTS` nên an toàn
- Nếu muốn xóa và tạo lại:
```sql
DROP TABLE IF EXISTS point_transactions;
DROP TABLE IF EXISTS user_points;
DROP TRIGGER IF EXISTS after_payment_paid;
DROP FUNCTION IF EXISTS get_user_points;
```
Sau đó chạy lại script.

### Lỗi 4: "Trigger creation failed"
- Kiểm tra quyền của user MySQL:
```sql
SHOW GRANTS FOR 'root'@'localhost';
```
- Cần quyền: `TRIGGER`, `CREATE`, `ALTER`

---

## 🧪 TEST HỆ THỐNG

Sau khi chạy script, test hệ thống:

### Test 1: Kiểm tra trigger hoạt động
```sql
-- Giả sử có payment với ID 'PAY12345678'
-- Cập nhật status từ 'unpaid' sang 'paid'
UPDATE payments 
SET status = 'paid' 
WHERE payment_id = 'PAY12345678' AND status = 'unpaid';

-- Kiểm tra điểm đã được cộng chưa
SELECT * FROM user_points WHERE user_id = 'USER_ID_HERE';
SELECT * FROM point_transactions WHERE user_id = 'USER_ID_HERE' ORDER BY created_at DESC LIMIT 1;
```

### Test 2: Kiểm tra function
```sql
SELECT get_user_points('USER_ID_HERE') AS user_points;
```

---

## 📝 LƯU Ý

1. **Backup database trước khi chạy** (khuyến nghị):
   ```bash
   mysqldump -u root -p travel_booking > backup_before_points.sql
   ```

2. **Công thức tính điểm**: 
   - 1 điểm = 10,000 VND
   - Làm tròn xuống (FLOOR)
   - Ví dụ: 25,000 VND = 2 điểm

3. **Trigger tự động**:
   - Chỉ cộng điểm khi payment status thay đổi từ `unpaid` → `paid`
   - Không cộng lại nếu đã cộng rồi

4. **Điểm cho user cũ**:
   - Script tự động khởi tạo 0 điểm cho tất cả user hiện có
   - Nếu muốn cộng điểm cho các payment đã thanh toán trước đó, cần chạy script bổ sung

---

## 🆘 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra:
1. Logs trong MySQL error log
2. Console của backend (nếu đang chạy)
3. Kiểm tra quyền user MySQL
4. Đảm bảo database `travel_booking` đã tồn tại

---

**Chúc bạn thành công! 🎉**

