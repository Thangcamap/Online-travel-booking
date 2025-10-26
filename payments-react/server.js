const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

// Cấu hình kết nối MySQL
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '@Quang12345',
  database: 'online_travel'
};

const app = express();
app.use(cors());
app.use(express.json());

// helper mở connection
async function getConn() {
  return await mysql.createConnection(dbConfig);
}

// ------------------------------------
// TEST
// ------------------------------------
app.get('/', (req, res) => {
  res.json({ ok: true, msg: 'API is running 😎' });
});

// ------------------------------------
// 1. Lấy danh sách payment (dùng cho bảng list)
// ------------------------------------
app.get('/api/payments', async (req, res) => {
  let conn;
  try {
    conn = await getConn();

    const [rows] = await conn.execute(`
      SELECT 
        p.payment_id        AS payment_id,
        u.name              AS user_name,
        t.name              AS tour_name,
        p.amount            AS amount,
        p.method            AS method,
        p.status            AS status
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u    ON b.user_id = u.user_id
      JOIN tours t    ON b.tour_id = t.tour_id
      ORDER BY p.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('GET /api/payments error:', err);
    res.status(500).json({
      error: 'Server error',
      detail: String(err)
    });
  } finally {
    if (conn) conn.end();
  }
});

// ------------------------------------
// 2. Cập nhật payment (edit modal -> Lưu thay đổi)
// PUT /api/payments/:id
// body: { method: 'cash' | 'card' | 'online', amount: 123456 }
// ------------------------------------
app.put('/api/payments/:id', async (req, res) => {
  const { id } = req.params;
  const { method, amount } = req.body;

  if (!method || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  }

  let conn;
  try {
    conn = await getConn();

    // chạy UPDATE thật
    const [result] = await conn.execute(
      `
      UPDATE payments
      SET method = ?, amount = ?
      WHERE payment_id = ?
      `,
      [method, amount, id]
    );

    if (result.affectedRows === 0) {
      // không tìm thấy payment_id
      return res.status(404).json({ error: 'Payment không tồn tại' });
    }

    // lấy lại row sau update để FE nếu muốn dùng
    const [rows] = await conn.execute(
      `
      SELECT payment_id, amount, method, status, created_at
      FROM payments
      WHERE payment_id = ?
      `,
      [id]
    );

    res.json({
      ok: true,
      message: 'Cập nhật thành công',
      data: rows[0]
    });
  } catch (err) {
    console.error('PUT /api/payments/:id error:', err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật payment' });
  } finally {
    if (conn) conn.end();
  }
});

// ------------------------------------
// 3. Confirm thanh toán (QR -> Xác nhận đã thanh toán)
// PATCH /api/payments/:id/confirm
// logic: đổi status='paid', set confirmed_at = NOW()
// ------------------------------------
app.patch('/api/payments/:id/confirm', async (req, res) => {
  const { id } = req.params;

  let conn;
  try {
    conn = await getConn();

    const [result] = await conn.execute(
      `
      UPDATE payments
      SET status = 'paid',
          confirmed_at = NOW()
      WHERE payment_id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Payment không tồn tại' });
    }

    res.json({
      ok: true,
      message: `Payment ${id} confirmed`
    });
  } catch (err) {
    console.error('PATCH /api/payments/:id/confirm error:', err);
    res.status(500).json({ error: 'Lỗi server khi confirm payment' });
  } finally {
    if (conn) conn.end();
  }
});

// ------------------------------------
// 4. Xóa payment
// DELETE /api/payments/:id
// ------------------------------------
app.delete('/api/payments/:id', async (req, res) => {
  const { id } = req.params;

  let conn;
  try {
    conn = await getConn();

    const [result] = await conn.execute(
      `
      DELETE FROM payments
      WHERE payment_id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Payment không tồn tại' });
    }

    res.json({
      ok: true,
      message: `Đã xóa payment ${id}`
    });
  } catch (err) {
    console.error('DELETE /api/payments/:id error:', err);
    res.status(500).json({ error: 'Lỗi server khi xóa payment' });
  } finally {
    if (conn) conn.end();
  }
});

// ------------------------------------
// 5. Lấy invoice chi tiết
// GET /api/payments/:id/invoice
// Trả hóa đơn đầy đủ info join user / tour / provider
// ------------------------------------
app.get('/api/payments/:id/invoice', async (req, res) => {
  const { id } = req.params;

  let conn;
  try {
    conn = await getConn();

    // ví dụ invoice: join thêm provider + booking + tour
    const [rows] = await conn.execute(
      `
      SELECT
        p.payment_id,
        u.name            AS customer_name,
        u.email           AS email,
        u.phone_number    AS phone_number,

        t.name            AS tour_name,
        t.start_date      AS start_date,
        t.end_date        AS end_date,

        pr.name           AS provider_name,
        pr.email          AS provider_email,
        pr.phone_number   AS provider_phone,

        p.amount,
        p.method,
        p.status,
        p.created_at,
        p.confirmed_at
      FROM payments p
      JOIN bookings b   ON p.booking_id = b.booking_id
      JOIN users u      ON b.user_id = u.user_id
      JOIN tours t      ON b.tour_id = t.tour_id
      JOIN providers pr ON t.provider_id = pr.provider_id
      WHERE p.payment_id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy hóa đơn' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/payments/:id/invoice error:', err);
    res.status(500).json({ error: 'Lỗi server khi lấy invoice' });
  } finally {
    if (conn) conn.end();
  }
});

// ------------------------------------
// start server
// ------------------------------------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
