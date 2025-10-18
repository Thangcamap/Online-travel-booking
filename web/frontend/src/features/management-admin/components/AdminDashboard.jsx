"use client";
import React from "react";
import PendingProviders from "./PendingProviders";
import ManageUsers from "./ManageUsers";
import DashboardStats from "./DashboardStats";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Building2 } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-100 to-orange-200 border-b border-orange-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <h1 className="text-3xl font-bold text-orange-700">AI-Travel Admin</h1>
          </div>
          <p className="text-orange-600 text-sm">Quản lý nền tảng du lịch thông minh</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <DashboardStats />

        {/* Tabs Section */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-md overflow-hidden">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="w-full justify-start bg-orange-50 border-b border-orange-200 p-0 rounded-t-2xl">
              <TabsTrigger
                value="users"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-100 px-6 py-4 gap-2 text-gray-800 transition-all duration-200"
              >
                <Users className="w-4 h-4" />
                <span>Quản lý người dùng</span>
              </TabsTrigger>
              <TabsTrigger
                value="providers"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:bg-orange-100 px-6 py-4 gap-2 text-gray-800 transition-all duration-200"
              >
                <Building2 className="w-4 h-4" />
                <span>Nhà cung cấp chờ duyệt</span>
              </TabsTrigger>
            </TabsList>

            {/* Content */}
            <div className="p-6 bg-gradient-to-b from-orange-50 to-white rounded-b-2xl">
              <TabsContent value="users" className="mt-0">
                <ManageUsers />
              </TabsContent>

              <TabsContent value="providers" className="mt-0">
                <PendingProviders />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
