import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { Menu } from "@headlessui/react";
import { ChevronDown, QrCode, FileText, Trash2, Edit2 } from "lucide-react";
import {
  fetchPayments,
  // confirmPayment,
  updatePayment,
  deletePayment,
  fetchInvoice,
  uploadPaymentImage,
} from "../api/payments";

export default function PaymentPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { authUser: user } = useAuthUserStore();

  const { data: payments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["payments", user?.user_id, user?.email],
    queryFn: () => fetchPayments(user?.email, user?.user_id),
    enabled: !!(user?.email || user?.user_id),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Refetch khi component mount để đảm bảo có dữ liệu mới nhất
  useEffect(() => {
    if (user?.user_id || user?.email) {
      console.log("🔄 Refetching payments for:", user?.user_id || user?.email);
      refetch();
    }
  }, [user?.user_id, user?.email, refetch]);

  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [payStatus, setPayStatus] = useState({ text: "", cls: "pending" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ payment_id: "", method: "", amount: 0 });
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-[400px]">
          <h2 className="text-2xl font-bold text-orange-500 mb-4">⚠️ Bạn chưa đăng nhập</h2>
          <p className="text-gray-600 mb-6">
            Vui lòng đăng nhập hoặc đăng ký để truy cập trang thanh toán.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition"
            >
              🔑 Đăng nhập
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
            >
              📝 Đăng ký
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Functions =====
  const openModal = (p) => {
    setCurrent(p);
    setPayStatus({ text: "⏳ Đang chờ thanh toán...", cls: "text-yellow-500" });
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  // const onConfirm = async () => {
  //   if (!current) return;
  //   try {
  //     console.log("📝 Confirming payment:", current.payment_id);
  //     const result = await confirmPayment(current.payment_id);
  //     console.log("✅ Payment confirmed:", result);
  //     setPayStatus({ text: "✅ Thanh toán thành công!", cls: "text-green-600" });
  //     qc.invalidateQueries(["payments", user?.user_id, user?.email]);
  //     setTimeout(() => {
  //       closeModal();
  //       showInvoice(current.payment_id);
  //     }, 600);
  //   } catch (error) {
  //     console.error("❌ Error confirming payment:", error);
  //     console.error("❌ Error response:", error.response?.data);
  //     alert(`❌ Lỗi khi xác nhận thanh toán!\n\n${error.response?.data?.error || error.message || "Vui lòng thử lại."}`);
  //   }
  // };

  const showInvoice = async (id) => {
    try {
      const data = await fetchInvoice(id);
      setInvoice(data);
      setInvoiceOpen(true);
    } catch {
      alert("Không thể tải hóa đơn");
    }
  };

  const onEditOpen = (p) => {
    setEditData({ payment_id: p.payment_id, method: p.method || "", amount: p.amount || 0 });
    setEditOpen(true);
  };

  const onEditSave = async () => {
    if (!editData.method) return alert("Vui lòng chọn phương thức thanh toán");
    if (Number(editData.amount) <= 0) return alert("Số tiền phải > 0");
    try {
      setSaving(true);
      await updatePayment(editData.payment_id, {
        method: editData.method,
        amount: Number(editData.amount),
      });
      alert("✅ Cập nhật thành công");
      setEditOpen(false);
      qc.invalidateQueries(["payments", user.email]);
    } catch (e) {
      alert("❌ Không thể sửa: " + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa hóa đơn này?")) return;
    try {
      await deletePayment(id);
      alert("✅ Xóa hóa đơn thành công");
      qc.invalidateQueries(["payments", user.email]);
    } catch (e) {
      alert("❌ Không thể xóa: " + (e.response?.data?.error || e.message));
    }
  };

  // ===== UI =====
  return (
    <div
      className="relative min-h-screen pb-16 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80')",
      }}
    >
      {/* Overlay làm mờ để chữ dễ đọc */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>

      {/* Nội dung chính */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center px-6 py-4">
            <button
              onClick={() => navigate("/home")}
              className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold transition"
            >
              🏠 Trang chủ
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                💳 Quản lý Thanh toán
              </h1>
              {user && (
                <Menu as="div" className="relative inline-block text-left">
                  <Menu.Button className="flex items-center gap-2">
                    <img
                      src={user.avatar || "https://i.pravatar.cc/40"}
                      className="w-10 h-10 rounded-full border-2 border-orange-400"
                      alt="avatar"
                    />
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-500">Xin chào</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {user.name || "Người dùng"}
                      </p>
                    </div>
                    <div className="py-1">
                      <Menu.Item>
                        <button
                          onClick={() => navigate("/profile")}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          👤 Hồ sơ cá nhân
                        </button>
                      </Menu.Item>
                      <Menu.Item>
                        <button
                          onClick={() => navigate("/payments")}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          💳 Thanh toán của tôi
                        </button>
                      </Menu.Item>
                      <Menu.Item>
                        <button
                          onClick={() => {
                            localStorage.removeItem("user");
                            navigate("/home");
                            window.location.reload();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          🚪 Đăng xuất
                        </button>
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Menu>
              )}
            </div>
          </div>
        </header>

        {/* === Content === */}
        <main className="container mx-auto px-6 mt-8">
          {isLoading ? (
            <div className="text-center text-gray-500">⏳ Đang tải dữ liệu...</div>
          ) : isError ? (
            <div className="text-center text-red-500">❌ Lỗi khi tải thanh toán</div>
          ) : payments.length === 0 ? (
            <div className="text-center text-gray-600 mt-10">
              💤 Bạn chưa có giao dịch nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {payments.map((p) => (
                <div
                  key={p.payment_id}
                  className="bg-white shadow-md hover:shadow-xl rounded-2xl overflow-hidden transition-all duration-300 border border-gray-100 hover:-translate-y-1"
                >
                  <img
                    src={p.image_url || "/src/assets/images/default-tour.jpg"}
                    alt={p.tour_name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-lg text-gray-800">
                        {p.tour_name}
                      </h3>
                      <span
                        className={`text-sm px-2 py-1 rounded-full ${
                          p.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {/* {p.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"} */}
                        {p.status === "unpaid" && "Chưa thanh toán"}
                        {p.status === "pending" && "⏳ Chờ admin duyệt"}
                        {p.status === "paid" && "✅ Đã thanh toán"}
                        {p.status === "rejected" && "❌ Bị từ chối"}
                      </span>
                      {p.status === "rejected" && p.reject_reason && (
                        <p className="text-sm text-red-600 mt-2">
                          ❗ Lý do bị từ chối: {p.reject_reason}
                        </p>
                      )}

                    </div>

                    <p className="text-sm text-gray-600">Mã: {p.payment_id}</p>
                    <p className="text-sm text-gray-600">
                      Số tiền:{" "}
                      <span className="text-orange-500 font-semibold">
                        {Number(p.amount).toLocaleString("vi-VN")}đ
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Phương thức: {p.method || "—"}
                    </p>

                      <div className="flex justify-end gap-2 mt-4">
                        {p.status === "unpaid" && (
                          <button
                            onClick={() => openModal(p)}
                            className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-1 text-sm"
                          >
                            Thanh toán
                          </button>
                        )}

                        {p.status === "pending" && (
                          <span className="text-sm text-orange-600 font-medium">
                            ⏳ Đang chờ admin duyệt
                          </span>
                        )}

                        {p.status === "rejected" && (
                          <span className="text-sm text-red-600 font-medium">
                            ❌ Thanh toán bị từ chối
                          </span>
                        )}

                        {p.status === "paid" && (
                          <button
                            onClick={() => showInvoice(p.payment_id)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1 text-sm"
                          >
                            Hóa đơn
                          </button>
                        )}
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        {/* === Modal Thanh toán QR === */}
        {modalOpen && current && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black opacity-30" onClick={closeModal}></div>
            <div className="bg-white rounded-lg shadow p-6 w-full max-w-md z-10">
              <h3 className="text-lg font-semibold mb-3">Thanh toán QR</h3>
              <p><b>Tour:</b> {current.tour_name}</p>
              <p><b>Số tiền:</b> {Number(current.amount).toLocaleString("vi-VN")}đ</p>

              <div className="qr my-4 flex justify-center">
                <img
                  src={`https://img.vietqr.io/image/970436-9392723042-qr_only.png?amount=${current.amount}&addInfo=ThanhToan_${current.payment_id}`}
                  alt="QR"
                  className="rounded shadow-md"
                />
              </div>

              <label className="block text-sm font-medium mb-1">📷 Ảnh xác minh thanh toán:</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setCurrent((prev) => ({ ...prev, uploadFile: e.target.files?.[0] || null }))
                }
                className="border p-2 rounded w-full"
              />
              {current.uploadFile && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={URL.createObjectURL(current.uploadFile)}
                    alt="preview"
                    className="w-32 h-32 rounded border object-cover"
                  />
                </div>
              )}
              <button
                className="btn btn-primary w-full mt-3"
                onClick={async () => {
                  if (!current.uploadFile) {
                    alert("Vui lòng chọn ảnh thanh toán!");
                    return;
                  }
                  try {
                    // 1️⃣ Upload ảnh
                    await uploadPaymentImage(current.payment_id, current.uploadFile);

                    setPayStatus({
                      text: "⏳ Đã gửi ảnh, chờ admin duyệt",
                      cls: "text-yellow-600",
                    });


                    qc.invalidateQueries(["payments", user?.user_id, user?.email]);

                  } catch (e) {
                    alert("❌ Lỗi khi gửi xác minh thanh toán");
                  }
                }}
              >
                📤 Gửi ảnh xác minh
              </button>

              {/* <button className="btn btn-success w-full mt-2" onClick={onConfirm}>
                ✅ Xác nhận đã thanh toán
              </button> */}
              {payStatus.text && <div className={`mt-2 text-sm ${payStatus.cls}`}>{payStatus.text}</div>}
            </div>
          </div>
        )}

        {/* === Modal Sửa thanh toán === */}
        {editOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div
              className="absolute inset-0 bg-black opacity-30"
              onClick={() => setEditOpen(false)}
            ></div>
            <div className="bg-white rounded-lg shadow p-6 w-full max-w-md z-10">
              <h3 className="text-lg font-semibold mb-3">✏️ Sửa thanh toán</h3>

              {/* Phương thức thanh toán */}
              <label className="block font-medium mb-1">Phương thức thanh toán</label>
              <select
                className="w-full border rounded px-2 py-1 mb-3"
                value={editData.method}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, method: e.target.value }))
                }
              >
                <option value="">-- Chọn phương thức --</option>
                <option value="cash">Tiền mặt</option>
                <option value="card">Thẻ</option>
                <option value="online">Chuyển khoản / QR</option>
              </select>

              {/* Số tiền (chỉ xem, không sửa) */}
              <label className="block font-medium mb-1">Số tiền (không thể chỉnh)</label>
              <input
                type="text"
                value={Number(editData.amount).toLocaleString("vi-VN") + "đ"}
                readOnly
                className="border rounded px-2 py-1 w-full bg-gray-100 text-gray-500 cursor-not-allowed"
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditOpen(false)}
                >
                  Hủy
                </button>
                
                <button
                  className="btn btn-primary"
                  onClick={onEditSave}
                  disabled={saving}
                >
                  {saving ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* === Modal In hóa đơn chuẩn A4 === */}
        {invoiceOpen && invoice && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div
              className="absolute inset-0 bg-black opacity-30"
              onClick={() => setInvoiceOpen(false)}
            ></div>

            <div
              id="invoicePrintArea"
              className="bg-white rounded-lg shadow-lg p-10 w-full max-w-3xl z-10"
            >
              {/* HEADER - LOGO & BRAND */}
              <div className="flex justify-between items-center border-b pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <img
                    src="/src/assets/images/Logo2.png"
                    alt="AI-Travel Logo"
                    className="w-16 h-16 object-contain"
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-orange-600">AI-TRAVEL</h1>
                    <p className="text-sm text-gray-600">
                      Công ty TNHH Du Lịch AI Travel<br />
                      <span className="text-gray-500">Hotline: 1900 1999</span>
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p><b>Ngày in:</b> {new Date().toLocaleDateString("vi-VN")}</p>
                  <p><b>Mã hóa đơn:</b> {invoice.payment_id}</p>
                </div>
              </div>

              {/* THÔNG TIN KHÁCH HÀNG */}
              <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
                <div>
                  <h2 className="text-lg font-semibold mb-2 text-orange-600">
                    👤 Thông tin khách hàng
                  </h2>
                  <p><b>Tên:</b> {invoice.customer_name || user?.name}</p>
                  <p><b>Email:</b> {invoice.email || user?.email}</p>
                  <p><b>Số điện thoại:</b> {invoice.phone_number || "—"}</p>
                  <p><b>Phương thức:</b> {invoice.method}</p>
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2 text-orange-600">
                    🧭 Thông tin Tour
                  </h2>
                  <p><b>Tên tour:</b> {invoice.tour_name}</p>
                  <p><b>Thời gian:</b> {invoice.start_date} → {invoice.end_date}</p>
                  <p><b>Nhà cung cấp:</b> {invoice.provider_name}</p>
                  <p><b>Email NCC:</b> {invoice.provider_email}</p>
                </div>
              </div>

              {/* TỔNG THANH TOÁN */}
              <div className="border-t border-b py-3 mb-4 text-center">
                <p className="text-lg font-bold">
                  Tổng thanh toán:{" "}
                  <span className="text-orange-600">
                    {Number(invoice.amount).toLocaleString("vi-VN")}đ
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Trạng thái:{" "}
                  {invoice.status === "paid"
                    ? "✅ Đã thanh toán"
                    : "💳 Chưa thanh toán"}
                </p>
              </div>

              {/* KÝ TÊN */}
              <div className="grid grid-cols-2 text-center text-sm mt-8">
                <div>
                  <b>Khách hàng</b>
                  <p>(Ký và ghi rõ họ tên)</p>
                  <div className="h-16"></div>
                  <p>{invoice.customer_name || user?.name}</p>
                </div>
                <div>
                  <b>Đại diện AI Travel</b>
                  <p>(Ký tên, đóng dấu)</p>
                  <div className="h-16"></div>
                  <p>Nguyễn Văn Quang</p>
                </div>
              </div>

              {/* FOOTER */}
              <div className="text-center text-xs text-gray-500 mt-8">
                <p>Ngày xác nhận: {new Date(invoice.updated_at).toLocaleString("vi-VN")}</p>
                <p>Địa chỉ: 123 Trần Phú, Đà Nẵng | Website: www.aitravel.vn</p>
              </div>

              <div className="text-center mt-6 no-print">
                <button
                  className="btn btn-primary"
                  onClick={() => window.print()}
                >
                  🖨️ In hóa đơn (PDF)
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
    </div>
  );
}