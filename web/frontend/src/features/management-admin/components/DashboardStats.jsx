"use client";
import React from "react";
import { Users, Building2, MapPin, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllUsers, getAllProviders, getAllTours } from "../api/admin";

export default function DashboardStats() {
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: getAllUsers });
  const { data: providers } = useQuery({ queryKey: ["providers"], queryFn: getAllProviders });
  const { data: tours } = useQuery({ queryKey: ["tours"], queryFn: getAllTours });

  const totalUsers = users?.length || 0;
  const totalProviders = providers?.length || 0;
  const totalTours = tours?.length || 0;
  const totalRevenue =
    tours?.reduce((sum, t) => sum + (Number(t.total_revenue) || 0), 0) || 0;

  const stats = [
    { label: "Tổng người dùng", value: totalUsers, icon: Users, color: "bg-orange-100 text-orange-600" },
    { label: "Nhà cung cấp", value: totalProviders, icon: Building2, color: "bg-blue-100 text-blue-600" },
    { label: "Tổng tour", value: totalTours, icon: MapPin, color: "bg-green-100 text-green-600" },
    {
      label: "Tổng doanh thu",
      value: totalRevenue.toLocaleString("vi-VN") + " ₫",
      icon: DollarSign,
      color: "bg-yellow-100 text-yellow-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition p-5 cursor-pointer"
        >
          <div className={`w-12 h-12 flex items-center justify-center rounded-lg ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <h3 className="text-2xl font-semibold text-gray-800">{value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
