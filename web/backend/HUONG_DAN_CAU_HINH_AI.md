# 🤖 Hướng dẫn cấu hình LLM (OpenAI) cho AI Travel Assistant

## 📋 Bước 1: Lấy OpenAI API Key

1. Truy cập: https://platform.openai.com/
2. Đăng nhập hoặc tạo tài khoản mới
3. Vào **API Keys**: https://platform.openai.com/api-keys
4. Click **"Create new secret key"**
5. Đặt tên cho key (ví dụ: "AI Travel Assistant")
6. **Copy key ngay** (sẽ không hiển thị lại sau khi đóng)
7. ⚠️ **Lưu ý**: Key có dạng `sk-proj-...` hoặc `sk-...`

## 📋 Bước 2: Tạo file .env trong thư mục backend

1. Vào thư mục: `Online-travel-booking/web/backend/`
2. Tạo file `.env` (nếu chưa có)
3. Thêm dòng sau vào file `.env`:

```env
OPENAI_API_KEY=sk-proj-your-api-key-here
```

**Ví dụ:**
```env
OPENAI_API_KEY=sk-proj-abc123xyz789...
```

## 📋 Bước 3: Kiểm tra cài đặt package

Đảm bảo đã cài đặt package `openai`:

```bash
cd Online-travel-booking/web/backend
npm install openai
```

## 📋 Bước 4: Khởi động lại server

Sau khi thêm API key vào `.env`, khởi động lại backend server:

```bash
npm start
# hoặc nếu dùng nodemon
npm run dev
```

## ✅ Kiểm tra hoạt động

1. Mở trình duyệt và vào trang AI Chat
2. Đăng nhập vào tài khoản
3. Gửi một tin nhắn test: "Tư vấn tour du lịch Đà Nẵng"
4. Nếu AI trả lời được, nghĩa là đã cấu hình thành công! 🎉

## 🔧 Xử lý lỗi

### Lỗi: "API key not found"
- Kiểm tra file `.env` có đúng tên không
- Kiểm tra API key có đúng format không
- Đảm bảo file `.env` nằm trong thư mục `backend/`

### Lỗi: "Insufficient quota" hoặc "Rate limit exceeded"
- Kiểm tra tài khoản OpenAI có đủ credit không
- Có thể cần nạp tiền vào tài khoản OpenAI

### Lỗi: "Invalid API key"
- Kiểm tra lại API key đã copy đúng chưa
- Thử tạo API key mới

## 💰 Chi phí sử dụng

OpenAI tính phí theo số lượng tokens sử dụng:
- **GPT-4o-mini**: ~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens
- **GPT-4o**: ~$2.50 / 1M input tokens, ~$10.00 / 1M output tokens

Hệ thống ưu tiên dùng GPT-4o-mini (rẻ hơn) và chỉ fallback sang GPT-4o khi cần.

## 📝 Lưu ý bảo mật

⚠️ **QUAN TRỌNG**: 
- **KHÔNG** commit file `.env` lên Git
- File `.env` đã được thêm vào `.gitignore`
- Nếu cần chia sẻ, dùng `.env.example` với giá trị mẫu

## 🎯 Các model được sử dụng

- **GPT-4o-mini**: Model chính (rẻ, nhanh)
- **GPT-4o**: Model dự phòng (đắt hơn, chất lượng cao hơn)

