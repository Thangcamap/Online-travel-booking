const express = require("express");
const cors = require("cors");
const { pool } = require("./config/mysql");

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get("/", async (req, res) => {
  const t = await pool.query("SELECT 1 + 1 AS solution")
  console.log('The solution is: ', t[0][0].solution);
  res.send("🚀 Backend is running...");
});

// Auth routes
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Query user from database
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND password = ?', 
      [email, password]
    );
    
    if (users.length > 0) {
      const user = users[0];
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } else {
      res.json({
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      });
    }
  } catch (error) {
    res.json({
      success: false,
      error: 'Lỗi server'
    });
  }
});

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    
    // Check if user exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.json({
        success: false,
        error: 'Email đã được sử dụng'
      });
    }
    
    // Insert new user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role]
    );
    
    res.json({
      success: true,
      user: {
        id: result.insertId,
        name,
        email,
        role
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: 'Lỗi server'
    });
  }
});

// Tour routes
app.get('/tours', async (req, res) => {
  try {
    const [tours] = await pool.query('SELECT * FROM tours WHERE status = "approved"');
    res.json({ success: true, tours });
  } catch (error) {
    res.json({ success: false, error: 'Lỗi server' });
  }
});

app.post('/tours', async (req, res) => {
  try {
    const { title, description, price, duration, location, provider_id } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO tours (title, description, price, duration, location, provider_id, status) VALUES (?, ?, ?, ?, ?, ?, "pending")',
      [title, description, price, duration, location, provider_id]
    );
    
    res.json({
      success: true,
      tour: {
        id: result.insertId,
        title,
        description,
        price,
        duration,
        location,
        status: 'pending'
      }
    });
  } catch (error) {
    res.json({ success: false, error: 'Lỗi server' });
  }
});

// Booking routes
app.post('/bookings', async (req, res) => {
  try {
    const { user_id, tour_id, booking_date, guests, total_price } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO bookings (user_id, tour_id, booking_date, guests, total_price, status) VALUES (?, ?, ?, ?, ?, "pending")',
      [user_id, tour_id, booking_date, guests, total_price]
    );
    
    res.json({
      success: true,
      booking: {
        id: result.insertId,
        user_id,
        tour_id,
        booking_date,
        guests,
        total_price,
        status: 'pending'
      }
    });
  } catch (error) {
    res.json({ success: false, error: 'Lỗi server' });
  }
});

app.get('/bookings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [bookings] = await pool.query(
      'SELECT b.*, t.title, t.location FROM bookings b JOIN tours t ON b.tour_id = t.id WHERE b.user_id = ?',
      [userId]
    );
    res.json({ success: true, bookings });
  } catch (error) {
    res.json({ success: false, error: 'Lỗi server' });
  }
});

// AI Chat route (simple mock)
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Simple AI response logic (you can integrate with OpenAI API later)
    let response = "Xin chào! Tôi là AI assistant của SmartTour. Tôi có thể giúp bạn tìm kiếm tour phù hợp.";
    
    if (message.toLowerCase().includes('tour')) {
      response = "Tôi có thể giúp bạn tìm tour phù hợp. Bạn muốn đi đâu và khi nào?";
    } else if (message.toLowerCase().includes('giá')) {
      response = "Giá tour phụ thuộc vào điểm đến và thời gian. Bạn có thể xem chi tiết trong danh sách tour.";
    }
    
    res.json({
      success: true,
      response
    });
  } catch (error) {
    res.json({ success: false, error: 'Lỗi server' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});