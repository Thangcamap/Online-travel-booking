"use client";
import React, { useState, useEffect } from "react";
import { MapPin, TrendingUp, Users, Calendar, Plus, List } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import StatCard from "../components/StatCard";
import TourManagement from "../components/TourManagement";
import AddTourForm from "../components/AddTourForm";
import { getTours, getProviderByUser } from "../api/tours-api";

export default function ProviderDashboard() {
  const [provider, setProvider] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTours: 0,
    activeTours: 0,
    totalBookings: 0,
    revenue: "0M",
  });

  const fetchTours = async (providerId) => {
    try {
      const res = await getTours(providerId);
      if (res.data.success) {
        const list = res.data.tours;
        setTours(list);
        setStats({
          totalTours: list.length,
          activeTours: list.filter((t) => t.available).length,
          totalBookings: 0,
          revenue: "0M",
        });
      }
    } catch (err) {
      console.error("❌ Lỗi tải tour:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user?.user_id) {
          setLoading(false);
          return;
        }

        const providerRes = await getProviderByUser(user.user_id);
        if (!providerRes.exists) {
          alert("Bạn chưa đăng ký làm nhà cung cấp tour (provider).");
          setLoading(false);
          return;
        }

        if (providerRes.provider.approval_status !== "approved") {
          alert(
            "Tài khoản provider của bạn đang chờ admin phê duyệt.\nBạn chưa thể sử dụng chức năng quản lý tour."
          );
          setProvider(providerRes.provider);
          setLoading(false);
          return;
        }

        setProvider(providerRes.provider);
        await fetchTours(providerRes.provider.provider_id);
        setLoading(false);
      } catch (error) {
        console.error("❌ Lỗi khi tải provider:", error);
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-orange-600 font-medium text-lg">
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!provider || provider.approval_status !== "approved") {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <div className="bg-orange-100 border border-orange-300 p-6 rounded-xl shadow-sm">
          <h2 className="text-2xl font-semibold text-orange-700 mb-2">
            🚫 Không thể truy cập trang quản lý tour
          </h2>
          <p className="text-orange-600">
            {provider
              ? "Tài khoản provider của bạn đang chờ phê duyệt."
              : "Bạn chưa đăng ký làm nhà cung cấp (provider)."}
          </p>
        </div>
      </div>
    );
  }

  const providerId = provider.provider_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white text-gray-800">
      {/* Header */}
      <div className="bg-white/90 border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-base">AI</span>
            </div>
            <h1 className="text-2xl font-bold text-orange-600">
              AI-Travel 
            </h1>
          </div>
          <p className="text-orange-500 text-sm">Quản lý tour du lịch của bạn</p>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            icon={<MapPin size={24} />}
            label="Tổng Tour"
            value={stats.totalTours}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp size={24} />}
            label="Tour Hoạt Động"
            value={stats.activeTours}
            color="green"
          />
          <StatCard
            icon={<Users size={24} />}
            label="Tổng Đặt Tour"
            value={stats.totalBookings}
            color="purple"
          />
          <StatCard
            icon={<Calendar size={24} />}
            label="Doanh Thu"
            value={stats.revenue}
            color="yellow"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white/90 border border-orange-100 rounded-2xl shadow-md overflow-hidden backdrop-blur-sm">
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="w-full justify-start bg-orange-50 border-b border-orange-100 p-0 rounded-t-2xl">
              <TabsTrigger
                value="list"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-100 px-6 py-4 gap-2 text-gray-800 transition-all duration-200"
              >
                <List className="w-4 h-4" />
                <span>Danh Sách Tour</span>
              </TabsTrigger>
              <TabsTrigger
                value="add"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:text-green-600 data-[state=active]:bg-green-50 px-6 py-4 gap-2 text-gray-800 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Tour Mới</span>
              </TabsTrigger>
            </TabsList>

            <div className="p-6 bg-gradient-to-b from-orange-50 to-white rounded-b-2xl">
              <TabsContent value="list">
                <h2 className="text-2xl font-semibold text-orange-600 mb-4">
                  Danh Sách Tour
                </h2>
                <TourManagement
                  providerId={providerId}
                  tours={tours}
                  refresh={() => fetchTours(providerId)}
                />
              </TabsContent>

              <TabsContent value="add">
                <h2 className="text-2xl font-semibold text-green-600 mb-4">
                  Thêm Tour Mới
                </h2>
                <Card className="p-6 border border-orange-100 shadow-sm">
                  <AddTourForm
                    providerId={providerId}
                    onAdded={() => fetchTours(providerId)}
                  />
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
