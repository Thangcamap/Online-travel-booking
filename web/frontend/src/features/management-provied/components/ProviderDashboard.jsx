"use client";
import React, { useState, useEffect } from "react";
import { MapPin, TrendingUp, Users, Calendar, Plus, List } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import TourManagement from "../components/TourManagement";
import AddTourForm from "../components/AddTourForm";
import { getTours } from "../api/tours-api";

export default function ProviderDashboard() {
  const providerId = "prov_test001";
  const [tours, setTours] = useState([]);
  const [stats, setStats] = useState({
    totalTours: 0,
    activeTours: 0,
    totalBookings: 0,
    revenue: "0M",
  });

  const fetchTours = async () => {
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
      console.error("Lỗi tải tour:", err);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header giống admin */}
      <div className="bg-gradient-to-r from-orange-100 to-orange-200 border-b border-orange-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">PV</span>
            </div>
            <h1 className="text-3xl font-bold text-orange-700">
              AI-Travel Provider
            </h1>
          </div>
          <p className="text-orange-600 text-sm">
            Quản lý tour du lịch của bạn
          </p>
        </div>
      </div>

      {/* Nội dung chính */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            icon={<MapPin size={26} />}
            label="Tổng Tour"
            value={stats.totalTours}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp size={26} />}
            label="Tour Hoạt Động"
            value={stats.activeTours}
            color="green"
          />
          <StatCard
            icon={<Users size={26} />}
            label="Tổng Đặt Tour"
            value={stats.totalBookings}
            color="purple"
          />
          <StatCard
            icon={<Calendar size={26} />}
            label="Doanh Thu"
            value={stats.revenue}
            color="yellow"
          />
        </div>

        {/* Tabs điều hướng (thay cho page state) */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-md overflow-hidden">
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="w-full justify-start bg-orange-50 border-b border-orange-200 p-0 rounded-t-2xl">
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

            {/* Tab nội dung */}
            <div className="p-6 bg-gradient-to-b from-orange-50 to-white rounded-b-2xl">
              <TabsContent value="list">
                <h2 className="text-2xl font-semibold text-orange-600 mb-4">
                  Danh Sách Tour
                </h2>
                <TourManagement
                  providerId={providerId}
                  tours={tours}
                  refresh={fetchTours}
                />
              </TabsContent>

              <TabsContent value="add">
                <h2 className="text-2xl font-semibold text-green-600 mb-4">
                  Thêm Tour Mới
                </h2>
                <Card className="p-6">
                  <AddTourForm
                    providerId={providerId}
                    onAdded={() => fetchTours()}
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
