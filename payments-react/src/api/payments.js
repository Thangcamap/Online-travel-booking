import axios from 'axios'

// Trỏ đúng backend port 5000
const API_BASE = 'http://localhost:5000/api/payments'

export const fetchPayments = async () => {
  const res = await axios.get(API_BASE)
  // server trả về mảng JSON, ví dụ:
  // [
  //   {
  //     "payment_id": "PAY001",
  //     "user_name": "Quang1",
  //     "tour_name": "Tour Đà Nẵng 3N2Đ",
  //     "amount": "2500000.00",
  //     "method": "online",
  //     "status": "unpaid"
  //   }
  // ]
  return res.data
}

export const confirmPayment = async (id) => {
  const res = await axios.patch(`${API_BASE}/${id}/confirm`)
  return res.data
}

export const updatePayment = async (id, payload) => {
  const res = await axios.put(`${API_BASE}/${id}`, payload)
  return res.data
}

export const deletePayment = async (id) => {
  const res = await axios.delete(`${API_BASE}/${id}`)
  return res.data
}

export const fetchInvoice = async (id) => {
  const res = await axios.get(`${API_BASE}/${id}/invoice`)
  return res.data
}
