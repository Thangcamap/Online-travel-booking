import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import CreateProvided from "./features/management-provied/components/create-provied.jsx";
import AdminDashboard from "./features/management-admin/components/AdminDashboard.jsx";
import TourManager from "./features/management-provied/components/TourManager.jsx";
import Login from "./features/management-login/components/login.jsx";
import Register from "./features/management-login/components/register.jsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";

// Khởi tạo QueryClient
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              {/* Test giao diện đăng ký Provider */}
              <Route path="/" element={<CreateProvided />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              {/* <Route path="/provider/tours" element={<TourManager />} /> */}
              <Route path="/provider/tours" element={<TourManager providerId="prov_test001" />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
