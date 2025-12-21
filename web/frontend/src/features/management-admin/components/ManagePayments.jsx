"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllPayments, updatePaymentStatus } from "../api/admin";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ManagePayments() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [passwordModal, setPasswordModal] = useState({ open: false, action: null, payment: null });
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: getAllPayments,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });

  console.log("Admin Payments:", payments);

  const mutation = useMutation({
    mutationFn: ({ id, status }) => {
      console.log("Mutation called:", { id, status });
      return updatePaymentStatus(id, status);
    },
    onSuccess: (data, variables) => {
      console.log("Mutation success:", data, variables);
      qc.invalidateQueries(["admin-payments"]);
      setSuccessMsg(
        variables.status === "paid" 
          ? "Đã duyệt thanh toán thành công!" 
          : "Đã từ chối thanh toán và hoàn trả số lượng tour!"
      );
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      const errorMessage = error.response?.data?.error || error.message || "Lỗi không xác định";
      setErrorMsg("Lỗi khi cập nhật thanh toán: " + errorMessage);
      setTimeout(() => setErrorMsg(""), 5000);
    },
  });

  const handleVerifyAndUpdate = () => {
    const inputPassword = passwordInput.trim().toLowerCase();
    const correctPassword = "admin".toLowerCase();
    
    const normalizedInput = inputPassword.replace(/\s+/g, '');
    const normalizedCorrect = correctPassword.replace(/\s+/g, '');
    
    if (normalizedInput === normalizedCorrect) {
      mutation.mutate({
        id: passwordModal.payment.payment_id,
        status: passwordModal.action,
      });
      setPasswordInput("");
      setPasswordModal({ open: false, action: null, payment: null });
      setErrorMsg("");
    } else {
      setErrorMsg("Mật khẩu không đúng!");
      setTimeout(() => {
        setPasswordInput("");
        setErrorMsg("");
      }, 3000);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading)
    return <p style={{ textAlign: "center", marginTop: "20px" }}>Đang tải dữ liệu thanh toán...</p>;

  const unpaidPayments = payments.filter(p => p.status === "unpaid");
  const paidPayments = payments.filter(p => p.status === "paid");

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "15px" }}>
          <div style={{ backgroundColor: "#fef08a", padding: "10px 15px", borderRadius: "5px", fontWeight: "bold" }}>
            Chờ duyệt: {unpaidPayments.length}
          </div>
          <div style={{ backgroundColor: "#dcfce7", padding: "10px 15px", borderRadius: "5px", fontWeight: "bold" }}>
            Đã duyệt: {paidPayments.length}
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: "#dcfce7", border: "1px solid #86efac", color: "#15803d", padding: "15px", borderRadius: "5px", marginBottom: "20px" }}>
          {successMsg}
        </div>
      )}

      {payments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f3f4f6", borderRadius: "5px" }}>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Chưa có thanh toán nào trong hệ thống.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {payments.map((p) => (
            <div key={p.payment_id} style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "15px", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", marginBottom: "5px" }}>Mã</div>
                  <div style={{ fontWeight: "bold", color: "#1f2937" }}>{p.payment_id}</div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", marginBottom: "5px" }}>Khách hàng</div>
                  <div style={{ fontWeight: "bold", color: "#1f2937" }}>{p.user_name}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>{p.user_email}</div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", marginBottom: "5px" }}>Trạng thái</div>
                  <span style={{
                    padding: "5px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: p.status === "paid" ? "#dcfce7" : p.payment_image ? "#dbeafe" : "#fef08a",
                    color: p.status === "paid" ? "#15803d" : p.payment_image ? "#0c4a6e" : "#854d0e"
                  }}>
                    {p.status === "paid" ? "Đã duyệt" : p.payment_image ? "Chờ duyệt" : "Chưa thanh toán"}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", marginBottom: "5px" }}>Hành động</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {p.status === "unpaid" && p.payment_image && (
                      <button
                        style={{ backgroundColor: "#16a34a", color: "white", border: "none", padding: "6px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                        onClick={() => setPasswordModal({ open: true, action: "paid", payment: p })}
                        disabled={mutation.isPending}
                      >
                        Duyệt
                      </button>
                    )}
                    {p.status === "unpaid" && !p.payment_image && (
                      <span style={{ fontSize: "12px", color: "#9ca3af" }}>Chờ</span>
                    )}
                    {(p.status === "paid" || (p.status === "unpaid" && p.payment_image)) && (
                      <button
                        style={{ backgroundColor: "#dc2626", color: "white", border: "none", padding: "6px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                        onClick={() => setPasswordModal({ open: true, action: "unpaid", payment: p })}
                        disabled={mutation.isPending}
                      >
                        {p.status === "paid" ? "Hủy" : "Từ chối"}
                      </button>
                    )}
                    {p.payment_image && (
                      <button
                        style={{ backgroundColor: "#fed7aa", color: "#92400e", border: "none", padding: "6px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                        onClick={() => setSelected(p)}
                      >
                        Ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "15px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px", fontSize: "14px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", marginBottom: "5px" }}>Tour</div>
                  <div style={{ color: "#1f2937" }}>{p.tour_name}</div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", marginBottom: "5px" }}>Số tiền</div>
                  <div style={{ fontWeight: "bold", color: "#ea580c" }}>{Number(p.amount).toLocaleString("vi-VN")}đ</div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", marginBottom: "5px" }}>Phương thức</div>
                  <span style={{ backgroundColor: "#f3f4f6", padding: "3px 8px", borderRadius: "3px", fontSize: "12px" }}>
                    {p.method === "online" ? "Chuyển khoản" : p.method === "cash" ? "Tiền mặt" : "Thẻ"}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "bold", marginBottom: "5px" }}>Ngày tạo</div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>{formatDate(p.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, padding: "20px" }}>
          <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "30px", maxWidth: "500px", width: "100%" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px" }}>Ảnh xác minh thanh toán</h3>
            <img src={selected.payment_image} alt="Payment proof" style={{ borderRadius: "8px", maxHeight: "400px", width: "100%", objectFit: "contain" }} />
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button
                style={{ backgroundColor: "#e5e7eb", color: "#1f2937", border: "none", padding: "8px 20px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                onClick={() => setSelected(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordModal.open && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, padding: "20px" }}>
          <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "30px", maxWidth: "400px", width: "100%" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "15px" }}>Xác minh quyền quản trị</h3>
            <p style={{ color: "#6b7280", marginBottom: "10px", fontSize: "14px" }}>Vui lòng nhập mật khẩu admin để xác nhận hành động này.</p>
            
            {passwordModal.payment && (
              <div style={{ backgroundColor: "#f3f4f6", padding: "15px", borderRadius: "5px", marginBottom: "15px", fontSize: "14px" }}>
                <p><strong>Thanh toán:</strong> {passwordModal.payment.payment_id}</p>
                <p><strong>Khách hàng:</strong> {passwordModal.payment.user_name}</p>
                <p><strong>Hành động:</strong> 
                  <span style={{ color: passwordModal.action === "paid" ? "#15803d" : "#991b1b", fontWeight: "bold", marginLeft: "5px" }}>
                    {passwordModal.action === "paid" ? "Duyệt thanh toán" : "Từ chối thanh toán"}
                  </span>
                </p>
              </div>
            )}

            <input
              type="password"
              style={{ border: "1px solid #d1d5db", borderRadius: "5px", width: "100%", padding: "10px", marginBottom: "15px", fontSize: "14px", boxSizing: "border-box" }}
              placeholder="Nhập mật khẩu admin..."
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setErrorMsg("");
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleVerifyAndUpdate();
                }
              }}
            />

            {errorMsg && <p style={{ color: "#dc2626", fontSize: "14px", marginBottom: "15px" }}>{errorMsg}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                style={{ backgroundColor: "#e5e7eb", color: "#1f2937", border: "none", padding: "8px 20px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                onClick={() => setPasswordModal({ open: false, action: null, payment: null })}
              >
                Hủy
              </button>
              <button
                style={{ backgroundColor: "#ea580c", color: "white", border: "none", padding: "8px 20px", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                onClick={handleVerifyAndUpdate}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}