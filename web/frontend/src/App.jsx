import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import CreateProvided from "./features/management-provied/components/create-provied.jsx";
import AdminDashboard from "./features/management-admin/components/AdminDashboard.jsx";
import ProviderDashboard from "@/features/management-provied/components/ProviderDashboard";
import TourManager from "./features/management-provied/components/TourManager.jsx";
import Login from "./features/management-login/components/login.jsx";
import Register from "./features/management-login/components/register.jsx";
import Home from "./features/management-home/components/home.jsx";
import AI from "./features/AI/components/AI";
import ProtectedRoute from "@/components/ProtectedRoute";  // 🧱 thêm dòng này
import useAuthUserStore from "@/stores/useAuthUserStore"; // ✅ thêm dòng này
import PaymentPage from "./features/payments/components/PaymentPage.jsx"; // ✅ thêm dòng này


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { io } from "socket.io-client"; // 🟢 THÊM DÒNG NÀY
import "./App.css";

const queryClient = new QueryClient();

function App() {
  const { setAuthUser } = useAuthUserStore();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setAuthUser(JSON.parse(savedUser));
    }

    const socket = io("http://localhost:5000"); 
    socket.on("connect", () => {
      console.log("🟢 Kết nối socket thành công:", socket.id);
    });

socket.on("user_status_update", (data) => {
  console.log("🔔 Trạng thái user cập nhật:", data);

  const savedUser = localStorage.getItem("user");
  if (savedUser) {
    const parsedUser = JSON.parse(savedUser);
    parsedUser.status = data.status;

    localStorage.setItem("user", JSON.stringify(parsedUser));
    setAuthUser(parsedUser);
  }

  if (data.status !== "active") {
    alert("Tài khoản của bạn đã bị khóa. Bạn sẽ bị đăng xuất.");
    window.location.href = "/login";
  }
});


    socket.on("provider_status_update", (data) => {
      console.log("🔔 Trạng thái provider cập nhật:", data);
      alert("Thông tin nhà cung cấp đã thay đổi, vui lòng tải lại trang.");
      window.location.reload();
    });

    socket.on("disconnect", () => {
      console.warn("⚠️ Mất kết nối socket.");
    });
    return () => {
      socket.disconnect();
    };
  }, [setAuthUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Trang đăng nhập & đăng ký */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Trang admin - chỉ admin mới vào được */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/*  Trang nhà cung cấp */}
              <Route path="/provider-dashboard" element={<ProviderDashboard />} />

              {/* Các trang khác */}
              <Route path="/" element={<CreateProvided />} />
              <Route path="/ai" element={<AI />} />
               <Route path="/home"element={<Home />}/>
               <Route path="/payments" element={<PaymentPage />} />  
              <Route path="/home" element={<Home />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
