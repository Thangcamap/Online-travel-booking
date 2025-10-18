"use client";
import React from "react";
import { Users, Building2, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllUsers, getAllProviders } from "../api/admin";

export default function DashboardStats() {
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: getAllUsers });
  const { data: providers } = useQuery({ queryKey: ["providers"], queryFn: getAllProviders });

  const totalUsers = users?.length || 0;
  const totalProviders = providers?.length || 0;
  const approvedProviders = providers?.filter((p) => p.approval_status === "approved").length || 0;
  const pendingProviders = providers?.filter((p) => p.approval_status === "pending").length || 0;

  const stats = [
    { label: "Tổng người dùng", value: totalUsers, icon: Users, color: "bg-red-100 text-red-600" },
    { label: "Nhà cung cấp", value: totalProviders, icon: Building2, color: "bg-blue-100 text-blue-600" },
    { label: "Đã duyệt", value: approvedProviders, icon: CheckCircle, color: "bg-green-100 text-green-600" },
    { label: "Chờ duyệt", value: pendingProviders, icon: Clock, color: "bg-yellow-100 text-yellow-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
          <div className={`w-12 h-12 flex items-center justify-center rounded-lg ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <h3 className="text-2xl font-bold">{value.toLocaleString()}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
