  import React, { useState } from "react";
  import { useQuery, useQueryClient } from "@tanstack/react-query";
  import { useNavigate } from "react-router-dom";
  import useAuthUserStore from "@/stores/useAuthUserStore";
  import { Menu } from "@headlessui/react";
  import { ChevronDown } from "lucide-react";
  import {
    fetchPayments,
    confirmPayment,
    updatePayment,
    deletePayment,
    fetchInvoice,
    uploadPaymentImage,
  } from "../api/payments";
  import { QrCode, FileText, Trash2, Edit2 } from "lucide-react";

  export default function PaymentPage() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { authUser: user } = useAuthUserStore();

    const { data: payments = [], isLoading, isError, error } = useQuery({
      queryKey: ["payments", user?.email],
      queryFn: () => fetchPayments(user?.email),
      enabled: !!user?.email,
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [current, setCurrent] = useState(null);
    const [payStatus, setPayStatus] = useState({ text: "", cls: "pending" });
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [invoice, setInvoice] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editData, setEditData] = useState({
      payment_id: "",
      method: "",
      amount: 0,
    });
    const [saving, setSaving] = useState(false);

    if (!user) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center w-[400px]">
            <h2 className="text-2xl font-bold text-orange-500 mb-4">
              ⚠️ Bạn chưa đăng nhập
            </h2>
            <p className="text-gray-600 mb-6">
              Vui lòng đăng nhập hoặc đăng ký để truy cập trang thanh toán.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
              >
                🔑 Đăng nhập
              </button>
              <button
                onClick={() => navigate("/register")}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
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

    const onConfirm = async () => {
      if (!current) return;
      try {
        await confirmPayment(current.payment_id);
        setPayStatus({ text: "✅ Thanh toán thành công!", cls: "text-green-600" });
        qc.invalidateQueries(["payments", user.email]);
        setTimeout(() => {
          closeModal();
          showInvoice(current.payment_id);
        }, 600);
      } catch (e) {
        console.error(e);
        alert("❌ Xảy ra lỗi khi xác nhận thanh toán!");
      }
    };

    const showInvoice = async (id) => {
      try {
        const data = await fetchInvoice(id);
        setInvoice(data);
        setInvoiceOpen(true);
      } catch (e) {
        console.error(e);
        alert("Không thể tải hóa đơn");
      }
    };

    const onEditOpen = (p) => {
      setEditData({
        payment_id: p.payment_id,
        method: p.method || "",
        amount: p.amount || 0,
      });
      setEditOpen(true);
    };

    const onEditSave = async () => {
      if (!editData.method) {
        alert("Vui lòng chọn phương thức thanh toán");
        return;
      }
      if (Number(editData.amount) <= 0) {
        alert("Số tiền phải > 0");
        return;
      }

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
        console.error(e);
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

    // ===== JSX UI =====
    return (
      <div className="card">
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              #invoicePrintArea, #invoicePrintArea * {
                visibility: visible;
              }
              #invoicePrintArea {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 30px;
              }
              .no-print { display: none !important; }
            }
          `}
        </style>

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate("/home")}
            className="btn btn-secondary flex items-center gap-1"
          >
            🏠 Quay lại Trang chủ
          </button>

          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">💳 Quản lý Thanh toán</h1>

            {/* Avatar + Dropdown Menu */}
            {user && (
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="flex items-center gap-2">
                  <img
                    src={user.avatar || "https://i.pravatar.cc/40"}
                    alt="avatar"
                    className="w-10 h-10 rounded-full border-2 border-orange-400"
                  />
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </Menu.Button>

                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white divide-y divide-gray-200 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-500">Đăng nhập với</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user.name || "Người dùng"}
                    </p>
                  </div>
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate("/profile")}
                          className={`${
                            active ? "bg-gray-100" : ""
                          } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        >
                          👤 Thông tin cá nhân
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate("/payments")}
                          className={`${
                            active ? "bg-gray-100" : ""
                          } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        >
                          💳 Thanh toán của tôi
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate("/provider-dashboard")}
                          className={`${
                            active ? "bg-gray-100" : ""
                          } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        >
                          🧭 Quản lý Tour
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => {
                            localStorage.removeItem("user");
                            navigate("/home");
                            window.location.reload();
                          }}
                          className={`${
                            active ? "bg-gray-100" : ""
                          } block w-full text-left px-4 py-2 text-sm text-red-600`}
                        >
                          🚪 Đăng xuất
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Menu>
            )}
          </div>
        </div>


        {/* Bảng giao dịch */}
        <div className="card">
          <h2 className="text-lg font-medium mb-3">Lịch sử giao dịch của bạn</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table">
              <thead>
                <tr className="border-b bg-orange-500 text-white">
                  <th className="py-2">Mã thanh toán</th>
                  <th>Tour</th>
                  <th>Số tiền</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6}>Đang tải...</td>
                  </tr>
                )}
                {!isLoading &&
                  !isError &&
                  payments.map((p) => (
                    <tr key={p.payment_id} className="border-b hover:bg-gray-50">
                      <td>{p.payment_id}</td>
                      <td>{p.tour_name}</td>
                      <td>{Number(p.amount).toLocaleString("vi-VN")}đ</td>
                      <td>{p.method}</td>
                      <td>
                        <span
                          className={
                            p.status === "paid"
                              ? "text-green-600"
                              : "text-yellow-600"
                          }
                        >
                          {p.status === "paid"
                            ? "✅ Đã thanh toán"
                            : "💳 Chưa thanh toán"}
                        </span>
                      </td>
                      <td className="space-x-2">
                        {p.status === "unpaid" ? (
                          <>
                            <button
                              className="btn btn-primary"
                              onClick={() => openModal(p)}
                            >
                              <QrCode size={14} /> Thanh toán
                            </button>
                            <button
                              className="btn btn-warning"
                              onClick={() => onEditOpen(p)}
                            >
                              <Edit2 size={14} /> Sửa
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => onDelete(p.payment_id)}
                            >
                              <Trash2 size={14} /> Xóa
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-success"
                            onClick={() => showInvoice(p.payment_id)}
                          >
                            <FileText size={14} /> In hóa đơn
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

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
                  if (!current.uploadFile) return alert("Vui lòng chọn ảnh thanh toán!");
                  try {
                    await uploadPaymentImage(current.payment_id, current.uploadFile);
                    setPayStatus({ text: "Ảnh đã gửi thành công, chờ xác minh...", cls: "text-yellow-600" });
                  } catch {
                    alert("❌ Lỗi khi tải ảnh lên!");
                  }
                }}
              >
                📤 Gửi ảnh xác minh
              </button>
              <button className="btn btn-success w-full mt-2" onClick={onConfirm}>
                ✅ Xác nhận đã thanh toán
              </button>
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
    );
  }
