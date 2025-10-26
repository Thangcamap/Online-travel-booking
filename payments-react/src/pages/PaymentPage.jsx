import React, { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import {
  fetchPayments,
  confirmPayment,
  updatePayment,
  deletePayment,
  fetchInvoice
} from '../api/payments'
import { QrCode, FileText, Trash2, Edit2 } from 'lucide-react'

export default function PaymentPage(){
  const qc = useQueryClient()

  const { data: payments = [], isLoading, isError, error } = useQuery(
    'payments',
    fetchPayments
  )

  // ----- Modal Thanh toán (QR) -----
  const [modalOpen, setModalOpen] = useState(false)
  const [current, setCurrent] = useState(null)
  const [payStatus, setPayStatus] = useState({text:'', cls:'pending'})

  // ----- Modal Hóa đơn (Invoice) -----
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [invoice, setInvoice] = useState(null)

  // ----- Modal Sửa (Edit Payment) -----
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState({
    payment_id: '',
    method: '',
    amount: 0,
    // status: 'unpaid', // bật nếu API cho sửa trạng thái
  })
  const [saving, setSaving] = useState(false)

  // ===== Functions =====

  // mở modal QR thanh toán
  const openModal = (p) => {
    setCurrent(p)
    setPayStatus({text:'⏳ Đang chờ thanh toán...', cls:'pending'})
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  // xác nhận đã thanh toán
  const onConfirm = async () => {
    if(!current) return
    try{
      await confirmPayment(current.payment_id)
      setPayStatus({text:'✅ Thanh toán thành công!', cls:'paid'})
      qc.invalidateQueries('payments')

      // mở hóa đơn sau khi xác nhận
      setTimeout(()=>{
        closeModal()
        showInvoice(current.payment_id)
      }, 600)
    }catch(e){
      console.error(e)
      alert('Xảy ra lỗi khi xác nhận')
    }
  }

  // tải hóa đơn
  const showInvoice = async (id) => {
    try{
      const data = await fetchInvoice(id)
      setInvoice(data)
      setInvoiceOpen(true)
    }catch(e){
      console.error(e)
      alert('Không thể tải hóa đơn')
    }
  }

  // mở modal sửa
  const onEditOpen = (p) => {
    setEditData({
      payment_id: p.payment_id,
      method: p.method || '',
      amount: p.amount || 0,
      // status: p.status || 'unpaid',
    })
    setEditOpen(true)
  }

  // lưu chỉnh sửa
  const onEditSave = async () => {
    // validate
    if (!editData.method) {
      alert('Vui lòng chọn phương thức thanh toán')
      return
    }
    if (Number(editData.amount) <= 0) {
      alert('Số tiền phải > 0')
      return
    }

    try{
      setSaving(true)

      await updatePayment(editData.payment_id, {
        method: editData.method,
        amount: Number(editData.amount),
        // status: editData.status, // nếu backend support
      })

      alert('✅ Cập nhật thành công')
      setEditOpen(false)
      qc.invalidateQueries('payments')
    }catch(e){
      console.error(e)
      alert('❌ Không thể sửa: ' + (e.response?.data?.error || e.message))
    }finally{
      setSaving(false)
    }
  }

  // xóa payment
  const onDelete = async (id) => {
    if(!confirm('Bạn có chắc muốn xóa hóa đơn này?')) return
    try{
      await deletePayment(id)
      alert('✅ Xóa hóa đơn thành công')
      qc.invalidateQueries('payments')
    }catch(e){
      alert('❌ Không thể xóa: ' + (e.response?.data?.error || e.message))
    }
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold mb-4">Quản lý Thanh toán</h1>

      <div className="card">
        <h2 className="text-lg font-medium mb-3">Lịch sử giao dịch</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table">
            <thead>
              <tr className="border-b">
                <th className="py-2">Mã thanh toán</th>
                <th>Khách hàng</th>
                <th>Tour</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7}>Đang tải...</td></tr>
              )}

              {!isLoading && isError && (
                <tr><td colSpan={7} className="text-red-600">
                  Lỗi tải dữ liệu: {String(error)}
                </td></tr>
              )}

              {!isLoading && !isError && payments.length === 0 && (
                <tr><td colSpan={7}>Không có hóa đơn</td></tr>
              )}

              {!isLoading && !isError && payments.length > 0 && payments.map(p => (
                <tr key={p.payment_id} className="border-b">
                  <td className="py-2">{p.payment_id}</td>
                  <td>{p.user_name}</td>
                  <td>{p.tour_name}</td>
                  <td>{Number(p.amount).toLocaleString('vi-VN')}đ</td>
                  <td>{p.method}</td>
                  <td>
                    <span className={p.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}>
                      {p.status === 'paid'
                        ? '✅ Đã thanh toán'
                        : '💳 Chưa thanh toán'}
                    </span>
                  </td>
                  <td className="space-x-2">
                    {p.status === 'unpaid' ? (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={()=>openModal(p)}
                        >
                          <div className="flex items-center gap-1">
                            <QrCode size={14}/> <span>Thanh toán</span>
                          </div>
                        </button>

                        <button
                          className="btn btn-warning"
                          onClick={()=>onEditOpen(p)}
                        >
                          <div className="flex items-center gap-1">
                            <Edit2 size={14}/> <span>Sửa</span>
                          </div>
                        </button>

                        <button
                          className="btn btn-danger"
                          onClick={()=>onDelete(p.payment_id)}
                        >
                          <div className="flex items-center gap-1">
                            <Trash2 size={14}/> <span>Xóa</span>
                          </div>
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-success"
                        onClick={()=>showInvoice(p.payment_id)}
                      >
                        <div className="flex items-center gap-1">
                          <FileText size={14}/> <span>Xem hóa đơn</span>
                        </div>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thanh toán */}
      {modalOpen && current && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black opacity-30"
            onClick={closeModal}
          ></div>

          <div className="bg-white rounded-lg shadow p-6 w-full max-w-md z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Thanh toán QR</h3>
              <button className="text-gray-500" onClick={closeModal}>✖</button>
            </div>

            <p><b>Khách hàng:</b> {current.user_name}</p>
            <p><b>Tour:</b> {current.tour_name}</p>
            <p><b>Số tiền:</b> {Number(current.amount).toLocaleString('vi-VN')}đ</p>

            <div className="qr my-4 flex justify-center">
              <img
                src={`https://img.vietqr.io/image/970436-9392723042-qr_only.png?amount=${current.amount}&addInfo=ThanhToan_${current.payment_id}`}
                alt="QR"
              />
            </div>

            <div className="space-y-2">
              <button className="btn btn-primary w-full" onClick={onConfirm}>
                Xác nhận đã thanh toán
              </button>

              <div
                id="payStatus"
                className={`status-box ${payStatus.cls}`}
              >
                {payStatus.text}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hóa đơn */}
      {invoiceOpen && invoice && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black opacity-30"
            onClick={()=>setInvoiceOpen(false)}
          ></div>

          <div className="bg-white rounded-lg shadow p-6 w-full max-w-lg z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">🧾 Hóa đơn Thanh toán</h3>
              <button
                className="text-gray-500"
                onClick={()=>setInvoiceOpen(false)}
              >✖</button>
            </div>

            <div id="invoiceBox" className="text-sm space-y-1">
              <p><b>Mã thanh toán:</b> {invoice.payment_id}</p>
              <p><b>Khách hàng:</b> {invoice.customer_name} ({invoice.email}, {invoice.phone_number})</p>
              <p><b>Tour:</b> {invoice.tour_name} ({invoice.start_date} → {invoice.end_date})</p>
              <p><b>Nhà cung cấp:</b> {invoice.provider_name} ({invoice.provider_email}, {invoice.provider_phone})</p>
              <p><b>Số tiền:</b> {Number(invoice.amount).toLocaleString('vi-VN')}đ</p>
              <p><b>Phương thức:</b> {invoice.method}</p>
              <p><b>Trạng thái:</b> {invoice.status === 'paid' ? '✅ Đã thanh toán' : '❌ Chưa thanh toán'}</p>
              <p><b>Ngày tạo đơn:</b> {new Date(invoice.created_at).toLocaleString('vi-VN')}</p>
              <p><b>Ngày thanh toán:</b> {invoice.confirmed_at
                ? new Date(invoice.confirmed_at).toLocaleString('vi-VN')
                : 'Chưa thanh toán'}</p>
            </div>

            <div className="mt-4">
              <button className="btn btn-primary" onClick={()=>window.print()}>
                In hóa đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa thanh toán */}
      {editOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* click ra ngoài để đóng */}
          <div
            className="absolute inset-0 bg-black opacity-30"
            onClick={()=>setEditOpen(false)}
          ></div>

          <div className="bg-white rounded-lg shadow p-6 w-full max-w-md z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">✏️ Sửa thanh toán</h3>
              <button
                className="text-gray-500"
                onClick={()=>setEditOpen(false)}
              >✖</button>
            </div>

            <div className="space-y-4 text-sm">
              {/* ID thanh toán (readonly) */}
              <div>
                <label className="block font-medium mb-1">
                  Mã thanh toán
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 bg-gray-100"
                  value={editData.payment_id}
                  disabled
                />
              </div>

              {/* Phương thức thanh toán */}
              <div>
                <label className="block font-medium mb-1">
                  Phương thức
                </label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editData.method}
                  onChange={e=>setEditData(d=>({ ...d, method: e.target.value }))}
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="card">Thẻ</option>
                  <option value="online">Chuyển khoản / QR</option>
                </select>
              </div>

              {/* Số tiền */}
              <div>
                <label className="block font-medium mb-1">
                  Số tiền (VND)
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={editData.amount}
                  onChange={e=>setEditData(d=>({ ...d, amount: e.target.value }))}
                />
              </div>

              {/* Nếu backend cho sửa trạng thái thì mở block này và thêm vào editData/status */}
              {/*
              <div>
                <label className="block font-medium mb-1">
                  Trạng thái
                </label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editData.status}
                  onChange={e=>setEditData(d=>({ ...d, status: e.target.value }))}
                >
                  <option value="paid">Đã thanh toán</option>
                  <option value="unpaid">Chưa thanh toán</option>
                </select>
              </div>
              */}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                className="btn btn-secondary"
                onClick={()=>setEditOpen(false)}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                className="btn btn-primary"
                onClick={onEditSave}
                disabled={saving}
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
