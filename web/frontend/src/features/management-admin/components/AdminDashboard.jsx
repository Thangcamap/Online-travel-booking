"use client";
import React, { useState } from "react";
import DashboardStats from "./DashboardStats";
import ManageUsers from "./ManageUsers";
import PendingProviders from "./PendingProviders";
//import { Users, Building2, LayoutDashboard, LogOut } from "lucide-react";
import ManagePayments from "./ManagePayments"; // ✅ thêm
import { Users, Building2, LayoutDashboard, LogOut, CreditCard } from "lucide-react"; // ✅ thêm icon

import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();

  const handleLogout = () => {
    // 🔸 Xóa token / session ở localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    // 🔸 Quay lại trang đăng nhập
    navigate("/login");
  };

  const menu = [
    { key: "dashboard", label: "Thống kê", icon: <LayoutDashboard className="w-5 h-5" /> },
    { key: "users", label: "Người dùng", icon: <Users className="w-5 h-5" /> },
    { key: "providers", label: "Nhà cung cấp", icon: <Building2 className="w-5 h-5" /> },
    { key: "payments", label: "Thanh toán", icon: <CreditCard className="w-5 h-5" /> }, // ✅ thêm tab mới
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50 to-white text-gray-800">
      {/* 🔹 Sidebar */}
      <aside className="w-64 bg-white/95 border-r shadow-md flex flex-col justify-between">
        <div>
          {/* Header logo */}
          <div className="px-6 py-5 border-b flex items-center gap-2">
            <div className="bg-orange-500 text-white font-bold rounded-md px-2 py-1">AI</div>
            <h1 className="font-bold text-lg text-orange-600">AI Travel Admin</h1>
          </div>

          {/* Menu */}
          <nav className="py-4 space-y-1">
            {menu.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left text-sm font-medium transition-all rounded-r-full ${
                  activeTab === item.key
                    ? "bg-orange-100 text-orange-700 border-l-4 border-orange-500"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div
                  className={`${
                    activeTab === item.key ? "text-orange-600" : "text-gray-500"
                  } transition`}
                >
                  {item.icon}
                </div>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 🔸 Nút đăng xuất */}
        <div className="px-6 py-4 border-t border-orange-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-start gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">© 2025 AI Travel</p>
        </div>
      </aside>

      {/* 🔸 Nội dung chính */}
      <main className="flex-1 px-10 py-8 overflow-y-auto">
        <header className="mb-8 flex items-center gap-3 border-b pb-4">
          <LayoutDashboard className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            {activeTab === "dashboard"
              ? "Tổng quan hệ thống"
              : activeTab === "users"
              ? "Quản lý người dùng"
              : activeTab === "providers" //Quang bổ xung 
              ? "Nhà cung cấp"  //quang sưa : ->?
              : "Quản lý thanh toán"} {/* ✅ thêm tiêu đề cho tab mới */}
          </h2>
        </header>

        <section className="bg-white/90 backdrop-blur-sm border border-orange-100 rounded-2xl shadow-sm p-6 animate-fade-in">
          {activeTab === "dashboard" && <DashboardStats />}
          {activeTab === "users" && <ManageUsers />}
          {activeTab === "providers" && <PendingProviders />}
          {activeTab === "payments" && <ManagePayments />} {/* ✅ hiển thị trang thanh toán */}
        </section>
      </main>
    </div>
  );
}
