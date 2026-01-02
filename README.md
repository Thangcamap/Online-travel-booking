#     Online-travel-booking 
# chạy tạo lớp kết nối database
# tải MYSQL bản 8.x sau đó tạo server connenction(connection name tùy chỉnh) chọn cổng 3306, user root, password(ấn vào "store in vault" đặt mk phải đúng là "thang123" nếu không thì phải tự đổi mk trong code)
# cd web/backend
# npm install
# npm run seed

# setup để lưu trữ dữ liệu bằng tiếng việt có dấu 
# chạy các câu lệnh sau trong mysql
SET foreign_key_checks = 0;
# gỡ bỏ các khóa chính và phụ để setup


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

# tạo lại các khóa đã gỡ trước đó
SET foreign_key_checks = 1;




# chạy câu lênh sau để tạo tài khoản admin ban đầu
admin@gmail.com 
password: admin
tài khoản đăng nhập để vào trang admin

INSERT INTO users (user_id, name, email, password, phone_number, role)
VALUES ('ADM001', 'Admin', 'admin@gmail.com', '$2b$10$hs40kZ1tOuUqu.WSCoOISuXA8cEov661oM2HcV2w8ZH2bS51vjMFC', '0999999999', 'admin');

INSERT INTO admins (admin_id, user_id)
VALUES ('A001', 'ADM001');


# chạy backend 
cd web/backend
npm start    
# chạy frontend   
 cd web/frontend
 npm run dev 
 # chạy project chạy cả backend lẫn frontend truy cập link ở frontend    
