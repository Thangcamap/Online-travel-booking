"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { getAllPayments, updatePaymentStatus } from "../api/admin";
import { getAllPayments, confirmPayment } from "../api/admin";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2, XCircle, Image as ImageIcon, Lock } from "lucide-react";
import { useState } from "react";

export default function ManagePayments() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [passwordModal, setPasswordModal] = useState({ open: false, action: null, payment: null });
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: getAllPayments,
  });

  // const mutation = useMutation({
  //   mutationFn: ({ id, status }) => updatePaymentStatus(id, status),
  //   onSuccess: () => qc.invalidateQueries(["admin-payments"]),
  // });
  const mutation = useMutation({
    mutationFn: ({ id }) => confirmPayment(id),
    onSuccess: () => qc.invalidateQueries(["admin-payments"]),
  });




  // const handleVerifyAndUpdate = () => {
  //   if (passwordInput.trim() === "admin") {
  //     mutation.mutate({
  //       id: passwordModal.payment.payment_id,
  //       status: passwordModal.action,
  //     });
  //     setPasswordInput("");
  //     setPasswordModal({ open: false, action: null, payment: null });
  //     setErrorMsg("");
  //   } else {
  //     setErrorMsg("❌ Mật khẩu không đúng! Vui lòng thử lại.");
  //   }
  // };
  const handleVerifyAndUpdate = () => {
    if (passwordInput.trim() !== "admin") {
      setErrorMsg("❌ Mật khẩu không đúng!");
      return;
    }

    if (
      passwordModal.action === "rejected" &&
      !rejectReason.trim()
    ) {
      setErrorMsg("❌ Vui lòng nhập lý do hủy!");
      return;
    }

    mutation.mutate({
      id: passwordModal.payment.payment_id,
      status: passwordModal.action,
      reject_reason:
        passwordModal.action === "rejected" ? rejectReason : null,
    });

    setPasswordInput("");
    setRejectReason("");
    setPasswordModal({ open: false, action: null, payment: null });
    setErrorMsg("");
  };


  if (isLoading)
    return <p className="text-center text-muted-foreground">Đang tải dữ liệu thanh toán...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">💳 Quản lý Thanh toán</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border rounded-lg bg-white">
          <thead className="bg-orange-500 text-white">
            <tr>
              <th className="px-3 py-2">Mã thanh toán</th>
              <th>Khách hàng</th>
              <th>Tour</th>
              <th>Số tiền</th>
              <th>Phương thức</th>
              <th>Trạng thái</th>
              <th>Ảnh</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.payment_id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">{p.payment_id}</td>
                <td>{p.user_name}</td>
                <td>{p.tour_name}</td>
                <td>{Number(p.amount).toLocaleString("vi-VN")}đ</td>
                {/* <td>{p.method}</td>
                <td className={p.status === "paid" ? "text-green-600" : "text-yellow-600"}>
                  {p.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                </td> */}
                <td
                  className={
                    p.status === "paid"
                      ? "text-green-600"
                      : p.status === "pending"
                      ? "text-orange-600"
                      : p.status === "rejected"
                      ? "text-red-600"
                      : "text-gray-500"
                  }
                >
                  {p.status === "unpaid" && "Chưa thanh toán"}
                  {p.status === "pending" && "⏳ Chờ duyệt"}
                  {p.status === "paid" && "✅ Đã thanh toán"}
                  {p.status === "rejected" && "❌ Bị từ chối"}
                </td>
                <td>
                  {p.payment_image ? (
                    <button
                      className="btn btn-secondary text-xs flex items-center gap-1"
                      onClick={() => setSelected(p)}
                    >
                      <ImageIcon size={14} /> Xem ảnh
                    </button>
                  ) : (
                    <span className="text-gray-400 italic">Không có</span>
                  )}
                </td>
                <td className="flex gap-2">
                  {/* <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() =>
                      setPasswordModal({ open: true, action: "paid", payment: p })
                    }
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Duyệt
                  </Button> */}
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={!p.payment_image || p.status !== "pending"}
                    onClick={() =>
                      setPasswordModal({ open: true, action: "paid", payment: p })
                    }
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Duyệt
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      // setPasswordModal({ open: true, action: "unpaid", payment: p })
                      setPasswordModal({ open: true, action: "rejected", payment: p })
                    }
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Hủy
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {/* 🔒 Modal xác minh mật khẩu admin */}
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
            <p className="text-sm text-gray-600 mb-4">
              Vui lòng nhập mật khẩu admin để xác nhận hành động này.
            </p>
            <input
              type="password"
              className="border rounded w-full p-2 mb-2"
              placeholder="Nhập mật khẩu..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
            {passwordModal.action === "rejected" && (
              <textarea
                className="border rounded w-full p-2 mb-2 text-sm"
                placeholder="Nhập lý do hủy thanh toán..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            )}

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
