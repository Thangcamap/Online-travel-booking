import React from "react";
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

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Trang đăng nhập & đăng ký */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* ✅ Trang admin - chỉ admin mới vào được */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              {/* Trang public hoặc test */}
               <Route path="/provider-dashboard" element={<ProviderDashboard />} />
              <Route path="/" element={<CreateProvided />} />
              <Route path="/ai" element={<AI />} />
               <Route path="/home"element={<Home />}/>

            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
