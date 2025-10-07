// src/features/management-provied/api/create-provider.js

// Fake API tạo provider (chỉ log ra console)
export const createProvider = async (data) => {
  console.log("📦 Fake API - Provider created:", data);
  // Giả lập độ trễ
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: "Provider created successfully (mock)",
        data,
      });
    }, 1000);
  });
};

// Fake API upload ảnh provider
export const uploadProviderImage = async (file) => {
  console.log("🖼️ Fake API - Image uploaded:", file.name);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        url: URL.createObjectURL(file),
        message: "Image uploaded successfully (mock)",
      });
    }, 800);
  });
};
