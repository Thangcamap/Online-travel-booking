const adminModel = require("../models/adminModel");
const { pool } = require("../../config/mysql");
const { notifyUserStatusChange, notifyProviderStatusChange, notifyPaymentStatusChange } = require("../../socket");

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
    
    // Thêm BASE_URL để tạo đường dẫn ảnh đầy đủ (nếu có payment_image)
    const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
    const payments = rows.map((p) => ({
      ...p,
      payment_image: p.payment_image && p.payment_image !== null && p.payment_image !== 'NULL'
        ? `${BASE_URL}/${String(p.payment_image).replace(/^\/+/, "")}`
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

    // Lấy thông tin payment hiện tại (status cũ và tour_id)
    const paymentInfo = await adminModel.getPaymentWithTour(id);
    
    if (!paymentInfo) {
      return res.status(404).json({ success: false, error: "Payment not found." });
    }

    const oldStatus = paymentInfo.current_status;
    const tour_id = paymentInfo.tour_id;
    const booking_id = paymentInfo.booking_id;

    console.log(`📊 Updating payment ${id}: ${oldStatus} -> ${status}`);

    // Cập nhật status payment
    const result = await adminModel.updatePaymentStatus(id, status);

    if (result.affectedRows === 0) {
      console.error(`❌ No rows affected when updating payment ${id}`);
      return res.status(404).json({ success: false, error: "Payment not found." });
    }

    console.log(`✅ Payment ${id} status updated successfully`);

    // 🔹 Xử lý available_slots của tour VÀ booking status:
    // - Khi user confirm payment: ĐÃ GIẢM slot (tạm thời), booking vẫn "pending" (status vẫn "unpaid", có payment_image)
    // - Nếu admin duyệt (unpaid -> paid): KHÔNG giảm slot nữa (đã giảm rồi) + CẬP NHẬT booking status = "confirmed" + thông báo user thành công
    // - Nếu admin từ chối (unpaid -> unpaid): CỘNG LẠI slot (vì đã giảm khi user confirm) + booking vẫn "pending" + thông báo user
    // - Nếu admin từ chối payment đã duyệt (paid -> unpaid): cộng lại slot + CẬP NHẬT booking status = "cancelled" + thông báo user
    
    if (oldStatus === 'unpaid' && status === 'paid') {
      // Admin duyệt payment -> slot đã được giảm khi user confirm, chỉ cần cập nhật booking status = "confirmed"
      console.log(`✅ Approved payment ${id}: Slot was already reduced when user confirmed. Updating booking status.`);
      
      // 🔹 Cập nhật booking status thành "confirmed" khi admin duyệt payment
      if (booking_id) {
        await pool.query(
          `UPDATE bookings SET status='confirmed', updated_at=NOW() WHERE booking_id=?`,
          [booking_id]
        );
        console.log(`✅ Updated booking ${booking_id} status to 'confirmed'`);
      }
      
      // 🔔 Gửi thông báo real-time cho user - THÀNH CÔNG
      if (paymentInfo && paymentInfo.user_id) {
        notifyPaymentStatusChange(paymentInfo.user_id, {
          payment_id: id,
          status: 'paid',
          tour_name: paymentInfo.tour_name,
          message: `✅ Thanh toán thành công! Tour "${paymentInfo.tour_name}" đã được admin duyệt. Đặt tour thành công!`
        });
      }
    } else if (oldStatus === 'unpaid' && status === 'unpaid') {
      // Admin từ chối payment chưa được duyệt -> cộng lại slot (vì đã giảm khi user confirm)
      // Xóa payment_image để user biết cần upload lại
      try {
        await pool.query(
          `UPDATE payments SET payment_image = NULL, updated_at = NOW() WHERE payment_id = ?`,
          [id]
        );
        console.log(`🗑️ Cleared payment_image for payment ${id}`);
      } catch (err) {
        console.error(`⚠️ Error clearing payment_image:`, err);
      }
      
      await adminModel.updateTourSlots(tour_id, +1);
      console.log(`❌ Rejected payment ${id}: Added 1 slot back to tour ${tour_id} (was reduced when user confirmed)`);
      
      // 🔔 Gửi thông báo real-time cho user - TỪ CHỐI
      if (paymentInfo && paymentInfo.user_id) {
        notifyPaymentStatusChange(paymentInfo.user_id, {
          payment_id: id,
          status: 'unpaid',
          tour_name: paymentInfo.tour_name,
          message: `⚠️ Thanh toán đã bị từ chối. Số lượng tour đã được hoàn trả. Vui lòng kiểm tra lại thông tin thanh toán và upload ảnh mới.`
        });
      }
    } else if (oldStatus === 'paid' && status === 'unpaid') {
      // Admin từ chối payment đã được duyệt -> cộng lại slot + cập nhật booking status = "cancelled"
      await adminModel.updateTourSlots(tour_id, +1);
      console.log(`✅ Rejected payment ${id}: Added 1 slot back to tour ${tour_id}`);
      
      // 🔹 Cập nhật booking status thành "cancelled" khi admin từ chối payment đã duyệt
      if (booking_id) {
        await pool.query(
          `UPDATE bookings SET status='cancelled', updated_at=NOW() WHERE booking_id=?`,
          [booking_id]
        );
        console.log(`✅ Updated booking ${booking_id} status to 'cancelled'`);
      }
      
      // 🔔 Gửi thông báo real-time cho user - TỪ CHỐI
      if (paymentInfo && paymentInfo.user_id) {
        notifyPaymentStatusChange(paymentInfo.user_id, {
          payment_id: id,
          status: 'unpaid',
          tour_name: paymentInfo.tour_name,
          message: `⚠️ Thanh toán đã bị từ chối. Số lượng tour đã được hoàn trả.`
        });
      }
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