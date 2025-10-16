import React, { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { fetchPayments, confirmPayment, updatePayment, deletePayment, fetchInvoice } from '../api/payments'
import { ChevronDown, QrCode, FileText, Trash2, Edit2 } from 'lucide-react'

export default function PaymentPage(){
  const qc = useQueryClient()
  const { data: payments = [], isLoading } = useQuery('payments', fetchPayments)
  const [modalOpen, setModalOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [current, setCurrent] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [payStatus, setPayStatus] = useState({text:'', cls:'pending'})

  const openModal = (p) => {
    setCurrent(p)
    setPayStatus({text:'⏳ Đang chờ thanh toán...', cls:'pending'})
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const onConfirm = async () => {
    if(!current) return
    try{
      await confirmPayment(current.payment_id)
      setPayStatus({text:'✅ Thanh toán thành công!', cls:'paid'})
      qc.invalidateQueries('payments')
      setTimeout(()=>{ closeModal(); showInvoice(current.payment_id) }, 600)
    }catch(e){
      console.error(e)
      alert('Xảy ra lỗi khi xác nhận')
    }
  }

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

  const onEdit = async (id) => {
    const newMethod = prompt('Nhập phương thức mới (cash, card, online):')
    if(!newMethod) return
    const newAmount = prompt('Nhập số tiền mới:', '0')
    try{
      await updatePayment(id, { method: newMethod, amount: Number(newAmount) })
      alert('✅ Sửa hóa đơn thành công')
      qc.invalidateQueries('payments')
    }catch(e){
      alert('❌ Không thể sửa: ' + (e.response?.data?.error || e.message))
    }
  }

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
              {isLoading ? <tr><td colSpan={7}>Đang tải...</td></tr> :
                payments.map(p => (
                <tr key={p.payment_id} className="border-b">
                  <td className="py-2">{p.payment_id}</td>
                  <td>{p.user_name}</td>
                  <td>{p.tour_name}</td>
                  <td>{Number(p.amount).toLocaleString('vi-VN')}đ</td>
                  <td>{p.method}</td>
                  <td>
                    <span className={p.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}>
                      {p.status === 'paid' ? '✅ Đã thanh toán' : '💳 Chưa thanh toán'}
                    </span>
                  </td>
                  <td>
                    {p.status === 'unpaid' ? (
                      <>
                        <button className="btn btn-primary mr-2" onClick={()=>openModal(p)}><QrCode size={14}/> Thanh toán</button>
                        <button className="btn btn-warning mr-2" onClick={()=>onEdit(p.payment_id)}><Edit2 size={14}/> Sửa</button>
                        <button className="btn btn-danger" onClick={()=>onDelete(p.payment_id)}><Trash2 size={14}/> Xóa</button>
                      </>
                    ) : (
                      <button className="btn btn-success" onClick={()=>showInvoice(p.payment_id)}><FileText size={14}/> Xem hóa đơn</button>
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
          <div className="absolute inset-0 bg-black opacity-30" onClick={closeModal}></div>
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-md z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Thanh toán QR</h3>
              <button className="text-gray-500" onClick={closeModal}>✖</button>
            </div>
            <p><b>Khách hàng:</b> {current.user_name}</p>
            <p><b>Tour:</b> {current.tour_name}</p>
            <p><b>Số tiền:</b> {Number(current.amount).toLocaleString('vi-VN')}đ</p>
            <div className="qr my-4 flex justify-center">
              <img src={`https://img.vietqr.io/image/970436-9392723042-qr_only.png?amount=${current.amount}&addInfo=ThanhToan_${current.payment_id}`} alt="QR" />
            </div>
            <div>
              <button className="btn btn-primary" onClick={onConfirm}>Xác nhận đã thanh toán</button>
              <div id="payStatus" className={`status-box ${payStatus.cls}`}>{payStatus.text}</div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOpen && invoice && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={()=>setInvoiceOpen(false)}></div>
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-lg z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">🧾 Hóa đơn Thanh toán</h3>
              <button className="text-gray-500" onClick={()=>setInvoiceOpen(false)}>✖</button>
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
              <p><b>Ngày thanh toán:</b> {invoice.confirmed_at ? new Date(invoice.confirmed_at).toLocaleString('vi-VN') : 'Chưa thanh toán'}</p>
            </div>
            <div className="mt-4">
              <button className="btn btn-primary" onClick={()=>window.print()}>In hóa đơn</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
