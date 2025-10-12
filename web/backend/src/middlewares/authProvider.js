import { pool } from "../config/mysql.js";
import responseHandler from "../utils/response.js";

const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

/**
 * 🧩 Middleware kiểm tra quyền của provider
 * - Nếu user đã đăng ký và được admin duyệt -> cho phép tiếp tục
 * - Nếu đang chờ duyệt hoặc bị từ chối -> chặn lại
 */
const authProvider =
  (allowedStatus = [APPROVAL_STATUS.APPROVED]) =>
  async (req, res, next) => {
    try {
      // ⚙️ Lấy user_id từ middleware xác thực user (authUser)
      const userId = req.user?.user_id || req.body?.user_id || req.query?.user_id;

      if (!userId) {
        return responseHandler.forbidden(res, undefined, "Unauthorized — thiếu user_id");
      }

      // 🔍 Kiểm tra provider tương ứng với user_id
      const [rows] = await pool.query(
        "SELECT provider_id, approval_status FROM tour_providers WHERE user_id = ? LIMIT 1",
        [userId]
      );

      if (rows.length === 0) {
        return responseHandler.forbidden(
          res,
          undefined,
          "Bạn chưa đăng ký làm nhà cung cấp tour."
        );
      }

      const provider = rows[0];

      // ❌ Nếu provider chưa được duyệt hoặc bị từ chối
      if (!allowedStatus.includes(provider.approval_status)) {
        const message =
          provider.approval_status === APPROVAL_STATUS.PENDING
            ? "Tài khoản của bạn đang chờ admin phê duyệt."
            : "Tài khoản nhà cung cấp của bạn đã bị từ chối.";
        return responseHandler.forbidden(res, undefined, message);
      }

      // ✅ Thành công -> gắn provider_id để route khác dùng
      req.providerId = provider.provider_id;

      console.log("✅ Provider hợp lệ:", provider.provider_id);
      next();
    } catch (err) {
      console.error("❌ Lỗi ở middleware authProvider:", err);
      return responseHandler.internalServerError(res);
    }
  };

export { authProvider, APPROVAL_STATUS };
