import axios from 'axios'
const API_BASE = 'http://localhost:3000/api/payments'

export const fetchPayments = async () => {
  const res = await axios.get(API_BASE)
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
