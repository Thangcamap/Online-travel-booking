const adminModel = require("../models/adminModel");
const { notifyUserStatusChange, notifyProviderStatusChange } = require("../../socket");

// ======================== PROVIDER ==========================
exports.getPendingProviders = async (req, res) => {
  try {
    const providers = await adminModel.getPendingProviders();
    res.json({ success: true, providers });
  } catch (error) {
    console.error("❌ Error fetching pending providers:", error);
    res.status(500).json({ success: false, error: "Server error." });
  }
};

exports.getAllProviders = async (req, res) => {
  try {
    const providers = await adminModel.getAllProviders();
    res.json({ success: true, providers });
  } catch (error) {
    console.error("❌ Error fetching all providers:", error);
    res.status(500).json({ success: false, error: "Server error fetching providers." });
  }
};

exports.approveProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' hoặc 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    await adminModel.updateProviderApprovalStatus(id, status);
    notifyProviderStatusChange(id, status);

    res.json({ success: true, message: `Provider ${status} successfully.` });
  } catch (error) {
    console.error("❌ Error updating provider approval:", error);
    res.status(500).json({ success: false, error: "Server error updating approval." });
  }
};

// ======================== USER ==========================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await adminModel.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ success: false, error: "Server error fetching users." });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active', 'inactive', 'suspended'

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    // Cập nhật user trước
    await adminModel.updateUserStatus(id, status);

    if (status !== "active") {
      // Khi khóa user: khóa luôn provider & tour
      await adminModel.updateProviderStatusByUserId(id, 'suspended');
      await adminModel.updateTourAvailabilityByUserId(id, 0);
    } else {
      // Khi mở lại user: mở luôn provider & tour nếu có
      await adminModel.updateProviderStatusByUserIdWithApproval(id, 'active');
      await adminModel.updateTourAvailabilityByUserIdWithApproval(id, 1);
    }

    // Lấy danh sách tất cả provider thuộc user đó
    const providers = await adminModel.getProvidersByUserId(id);

    // Gửi socket update cho từng provider_id
    for (const provider of providers) {
      notifyProviderStatusChange(provider.provider_id, status);
    }
    notifyUserStatusChange(id, status);

    res.json({ success: true, message: `User and related data updated to ${status}` });
  } catch (error) {
    console.error("❌ Error updating user status:", error);
    res.status(500).json({ success: false, error: "Server error updating user status." });
  }
};

// ======================== TOUR ==========================
exports.getAllTours = async (req, res) => {
  try {
    const tours = await adminModel.getAllToursWithRevenue();
    res.json({ success: true, tours });
  } catch (error) {
    console.error("❌ Error fetching tours:", error);
    res.status(500).json({ success: false, error: "Server error fetching tours." });
  }
};

// ======================== PAYMENT ==========================
exports.getAllPayments = async (req, res) => {
  try {
    const rows = await adminModel.getAllPayments();
    
    // Thêm BASE_URL để tạo đường dẫn ảnh đầy đủ
    const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
    const payments = rows.map((p) => ({
      ...p,
      payment_image: p.payment_image
        ? `${BASE_URL}/${p.payment_image.replace(/^\/+/, "")}`
        : null,
    }));

    res.json({ success: true, payments });
  } catch (error) {
    console.error("❌ Error fetching payments:", error);
    res.status(500).json({ success: false, error: "Server error fetching payments." });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "paid" hoặc "unpaid"

    if (!['paid', 'unpaid'].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const result = await adminModel.updatePaymentStatus(id, status);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Payment not found." });
    }

    res.json({
      success: true,
      message: `Payment ${id} updated to ${status}.`,
    });
  } catch (error) {
    console.error("❌ Error updating payment status:", error);
    res.status(500).json({ success: false, error: "Server error updating payment status." });
  }
};

exports.getPaymentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await adminModel.getPaymentDetail(id);

    if (!payment) {
      return res.status(404).json({ success: false, error: "Payment not found" });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error("❌ Error fetching payment detail:", error);
    res.status(500).json({ success: false, error: "Server error fetching payment detail." });
  }
};