"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllPayments, updatePaymentStatus } from "../api/admin";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2, XCircle, Image as ImageIcon, Lock, Calendar } from "lucide-react";
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
    refetchInterval: 5000, // Tự động refresh mỗi 5 giây để cập nhật payment mới
  });

  // Debug: Log payments để kiểm tra
  console.log(" Admin Payments:", payments);
  console.log(" Payments with image:", payments.filter(p => p.payment_image));
  console.log(" Unpaid payments with image:", payments.filter(p => p.status === "unpaid" && p.payment_image));

  const mutation = useMutation({
    mutationFn: ({ id, status }) => {
      console.log(" Mutation called:", { id, status });
      return updatePaymentStatus(id, status);
    },
    onSuccess: (data, variables) => {
      console.log(" Mutation success:", data, variables);
      qc.invalidateQueries(["admin-payments"]);
      setSuccessMsg(
        variables.status === "paid" 
          ? " Đã duyệt thanh toán thành công!" 
          : " Đã từ chối thanh toán và hoàn trả số lượng tour!"
      );
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (error) => {
      console.error(" Mutation error:", error);
      const errorMessage = error.response?.data?.error || error.message || "Lỗi không xác định";
      setErrorMsg(" Lỗi khi cập nhật thanh toán: " + errorMessage);
      setTimeout(() => setErrorMsg(""), 5000);
    },
  });

  const handleVerifyAndUpdate = () => {
    // So sánh password (case-insensitive và trim whitespace)
    const inputPassword = passwordInput.trim().toLowerCase();
    const correctPassword = "admin".toLowerCase();
    
    // Debug: Log để kiểm tra
    console.log(" Password check:", {
      input: `"${inputPassword}"`,
      inputLength: inputPassword.length,
      correct: `"${correctPassword}"`,
      correctLength: correctPassword.length,
      match: inputPassword === correctPassword,
      inputCharCodes: inputPassword.split('').map(c => c.charCodeAt(0)),
      correctCharCodes: correctPassword.split('').map(c => c.charCodeAt(0))
    });
    
    // So sánh chính xác hơn: loại bỏ tất cả whitespace và so sánh
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
      setErrorMsg(` Mật khẩu không đúng! (Gợi ý: mật khẩu là "admin")`);
      // Clear password input sau 3 giây để user có thể nhập lại
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
    return <p className="text-center text-muted-foreground">Đang tải dữ liệu thanh toán...</p>;

  const unpaidPayments = payments.filter(p => p.status === "unpaid");
  const paidPayments = payments.filter(p => p.status === "paid");

  return (
    <div className="space-y-6">
      {/* <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold"> Quản lý Thanh toán</h2>
        <div className="flex gap-4 text-sm">
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-semibold">
            Chờ duyệt: {unpaidPayments.length}
          </div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
            Đã duyệt: {paidPayments.length}
          </div>
        </div>
      </div> */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
          Quản lý Thanh toán
          </h2>
        </div>

        <div className="flex gap-3">
          <div className="bg-yellow-100 text-yellow-800 px-5 py-3 rounded-lg text-base font-semibold shadow-sm">
             Chờ duyệt: {unpaidPayments.length}
          </div>
          <div className="bg-yellow-100 text-yellow-800 px-5 py-3 rounded-lg text-base font-semibold shadow-sm">
             Đã duyệt: {paidPayments.length}
          </div>
        </div>
      </div>


      {successMsg && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          {successMsg}
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">Chưa có thanh toán nào trong hệ thống.</p>
        </div>
      ) : (
        <div className="w-full">
          <table className="w-full text-base border rounded-xl bg-white table-auto shadow-sm">
            <thead className="bg-orange-500 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-base font-semibold w-[8%]">Mã</th>
                <th className="px-4 py-3 font-mono text-sm">Khách hàng</th>
                <th className="px-2 py-2 text-left w-[18%]">Tour</th>
                <th className="px-2 py-2 text-right w-[10%]">Số tiền</th>
                <th className="px-2 py-2 text-left w-[10%]">Phương thức</th>
                <th className="px-2 py-2 text-left w-[10%]">Ngày tạo</th>
                <th className="px-2 py-2 text-center w-[15%]">Trạng thái</th>
                <th className="px-2 py-2 text-center w-[7%]">Ảnh</th>
                <th className="px-2 py-2 text-center w-[10%]">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.payment_id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-base font-semibold text-gray-800">{p.payment_id}</td>
                  <td className="px-2 py-2">
                    <div>
                      <div className="font-semibold text-base truncate" title={p.user_name}>{p.user_name}</div>
                      <div className="text-sm text-gray-500 truncate" title={p.user_email}>{p.user_email}</div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="truncate" title={p.tour_name}>
                      {p.tour_name}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-orange-600 whitespace-nowrap">
                    {Number(p.amount).toLocaleString("vi-VN")}đ
                  </td>
                  <td className="px-2 py-2">
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs whitespace-nowrap">
                      {p.method === "online" ? "Chuyển khoản" : p.method === "cash" ? "Tiền mặt" : "Thẻ"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{formatDate(p.created_at)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${
                        p.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : p.payment_image
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                      title={p.status === "paid" 
                        ? " Đã duyệt" 
                        : p.payment_image 
                        ? " Đã chuyển khoản (Chờ admin duyệt)" 
                        : " Chưa thanh toán"}
                    >
                      {p.status === "paid" 
                        ? " Đã duyệt" 
                        : p.payment_image 
                        ? " Chờ duyệt" 
                        : " Chưa thanh toán"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {p.payment_image ? (
                      <button
                        className="text-orange-600 hover:text-orange-700 text-xs flex items-center gap-1 mx-auto"
                        onClick={() => setSelected(p)}
                        title="Xem ảnh thanh toán"
                      >
                        <ImageIcon size={12} /> Ảnh
                      </button>
                    ) : (
                      <span className="text-gray-400 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      {p.status === "unpaid" && p.payment_image && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg"
                          onClick={() =>
                            setPasswordModal({ open: true, action: "paid", payment: p })
                          }
                          disabled={mutation.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Duyệt
                        </Button>
                      )}
                      {p.status === "unpaid" && !p.payment_image && (
                        <span className="text-xs text-gray-400 italic">Chờ</span>
                      )}
                      {/* Nút từ chối: hiển thị khi payment đã được duyệt (paid) hoặc đang chờ duyệt (unpaid + có ảnh) */}
                      {(p.status === "paid" || (p.status === "unpaid" && p.payment_image)) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs px-2 py-1"
                          onClick={() =>
                            setPasswordModal({ open: true, action: "unpaid", payment: p })
                          }
                          disabled={mutation.isPending}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> {p.status === "paid" ? "Hủy" : "Từ chối"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🔹 Modal xem ảnh thanh toán */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setSelected(null)}
          ></div>
          <div className="bg-white p-4 rounded-lg shadow-lg z-10 max-w-lg">
            <h3 className="text-lg font-semibold mb-3">📷 Ảnh xác minh thanh toán</h3>
            <img
              src={selected.payment_image}
              alt="Payment proof"
              className="rounded-lg shadow-md max-h-[400px] mx-auto"
            />
            <div className="text-center mt-4">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/*  Modal xác minh mật khẩu admin */}
      {passwordModal.open && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setPasswordModal({ open: false, action: null, payment: null })}
          ></div>
          <div className="bg-white p-6 rounded-lg shadow-lg z-10 max-w-md w-full">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-orange-500" />
              Xác minh quyền quản trị
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Vui lòng nhập mật khẩu admin để xác nhận hành động này.
            </p>
            <p className="text-xs text-orange-600 mb-3 bg-orange-50 p-2 rounded">
               Gợi ý: Mật khẩu là <strong>"admin"</strong> (không phải mật khẩu đăng nhập)
            </p>
            {passwordModal.payment && (
              <div className="bg-gray-50 p-3 rounded mb-3 text-sm">
                <p><strong>Thanh toán:</strong> {passwordModal.payment.payment_id}</p>
                <p><strong>Khách hàng:</strong> {passwordModal.payment.user_name}</p>
                <p><strong>Tour:</strong> {passwordModal.payment.tour_name}</p>
                <p><strong>Hành động:</strong> 
                  <span className={passwordModal.action === "paid" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {passwordModal.action === "paid" ? "  Duyệt thanh toán" : " ❌ Từ chối thanh toán (sẽ hoàn trả số lượng tour)"}
                  </span>
                </p>
              </div>
            )}
            <input
              type="password"
              className="border rounded w-full p-2 mb-2"
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
            {errorMsg && <p className="text-red-600 text-sm mb-2">{errorMsg}</p>}
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="secondary"
                onClick={() =>
                  setPasswordModal({ open: false, action: null, payment: null })
                }
              >
                Hủy
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleVerifyAndUpdate}
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
