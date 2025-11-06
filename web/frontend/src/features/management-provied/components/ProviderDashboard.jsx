"use client";
import React, { useState, useEffect } from "react";
import { Home, LogOut, Info, BarChart3, List, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import StatCard from "../components/StatCard";
import TourManagement from "../components/TourManagement";
import AddTourForm from "../components/AddTourForm";
import { getTours, getProviderByUser } from "../api/tours-api";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ProviderInfo from "../components/ProviderInfo";
import { socket } from "@/lib/socket";
import { toast } from "sonner";

export default function ProviderDashboard() {
  const [provider, setProvider] = useState(null);
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  const [accessError, setAccessError] = useState("");

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
          console.warn("⚠️ Không tìm thấy thông tin người dùng trong localStorage.");
          setLoading(false);
          return;
        }

        // 🟢 sửa: thêm setAccessError để biết lý do bị chặn
        if (user.status && user.status !== "active") {
          console.warn("🚫 Tài khoản người dùng đã bị khóa/tạm ngưng.");
          setAccessError("user_blocked");
          setProvider(null);
          setLoading(false);
          return;
        }

        const providerRes = await getProviderByUser(user.user_id);

        // 🟢 sửa: thêm phân loại lỗi
        if (!providerRes.exists) {
          console.warn("🚫 Người dùng chưa là nhà cung cấp tour. Truy cập bị chặn.");
          setAccessError("not_provider");
          setProvider(null);
          setLoading(false);
          return;
        }

        if (
          providerRes.provider.status !== "active" ||
          providerRes.provider.approval_status !== "approved"
        ) {
          console.warn("🚫 Nhà cung cấp không hoạt động hoặc chưa được duyệt.");
          setAccessError("provider_blocked");
          setProvider(null);
          setLoading(false);
          return;
        }

        setProvider(providerRes.provider);
        await fetchTours(providerRes.provider.provider_id);
      } catch (error) {
        console.error("❌ Lỗi khi tải provider:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);
    // Thiết lập socket realtime (khi provider đã có dữ liệu)
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.user_id) return;

    //  Kết nối socket
    socket.connect();
    socket.emit("join_user", user.user_id);
    console.log("✅ Joined socket room user_" + user.user_id);

    socket.on("account_status_changed", (newStatus) => {
      toast.error(`Tài khoản của bạn đã bị ${newStatus}`);
      setAccessError("user_blocked");
      localStorage.clear();
      setTimeout(() => (window.location.href = "/login"), 2000);
    });

    socket.on("provider_status_changed", (newStatus) => {
      toast.warning(`Trạng thái nhà cung cấp: ${newStatus}`);
      if (newStatus !== "active") {
        setAccessError("provider_blocked");
        setProvider(null);
      }
    });

    //  cleanup khi rời trang
    return () => {
      socket.off("account_status_changed");
      socket.off("provider_status_changed");
      socket.disconnect();
    };
  }, []);
  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-orange-600 font-medium">
        Đang tải dữ liệu...
      </div>
    );

  //  sửa: hiển thị thông báo khác nhau theo lý do bị chặn
  if (!provider)
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        {accessError === "user_blocked" && (
          <>
            <div className="text-3xl font-bold text-red-500 mb-3">
              🚫 Tài khoản người dùng đã bị khóa/tạm ngưng.
            </div>
            <p className="text-gray-600 mb-1">
              Vui lòng liên hệ quản trị viên để được mở khóa.
            </p>
          </>
        )}

        {accessError === "provider_blocked" && (
          <>
            <div className="text-3xl font-bold text-red-500 mb-3">
              🚫 Nhà cung cấp không hoạt động hoặc chưa được duyệt.
            </div>
            <p className="text-gray-600 mb-1">
              Vui lòng chờ duyệt hoặc liên hệ hỗ trợ để kích hoạt lại.
            </p>
          </>
        )}

        {(accessError === "not_provider" || !accessError) && (
          <>
            <div className="text-3xl font-bold text-red-500 mb-3">
              🚫 Truy cập bị chặn
            </div>
            <p className="text-gray-600 mb-1">
              Bạn cần trở thành{" "}
              <span className="font-medium">nhà cung cấp tour</span> để truy cập trang này.
            </p>
            <Link to="/">
              <Button className="bg-orange-600 text-white hover:bg-orange-700">
                Đăng ký ngay
              </Button>
            </Link>
          </>
        )}
      </div>
    );

  const providerId = provider?.provider_id;

  const handleLogout = () => {
    localStorage.clear();
    socket.disconnect();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-gray-50">
      {/* SIDEBAR */}
      <aside className="bg-white border-r border-gray-200 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">
              Quản Lý Nhà Cung Cấp Tour
            </h2>
            <p className="text-sm text-gray-500">Dashboard</p>
          </div>

          {/* Profile */}
          <div className="flex flex-col items-center mt-6">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl">
              {provider?.company_name?.charAt(0)?.toUpperCase() || "P"}
            </div>
            <p className="mt-2 font-semibold text-gray-800">{provider?.company_name}</p>
            <p className="text-sm text-gray-500">{provider?.email}</p>
          </div>

          {/* Menu */}
          <nav className="mt-6 px-4 space-y-1">
            {[
              { key: "info", label: "Thông tin", icon: <Info size={18} /> },
              { key: "manage", label: "Quản lý tour", icon: <List size={18} /> },
              { key: "add", label: "Thêm tour", icon: <Plus size={18} /> },
              { key: "stats", label: "Thống kê", icon: <BarChart3 size={18} /> },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === item.key
                    ? "bg-orange-100 text-orange-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t mt-4 px-4 py-3 space-y-2">
          <Link
            to="/home"
            className="flex items-center gap-2 text-gray-700 hover:text-orange-600"
          >
            <Home size={18} /> Trang chủ
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="p-8 overflow-y-auto">
        {activeTab === "info" && (
          <div>
            <ProviderInfo providerId={provider?.provider_id} />
          </div>
        )}

        {activeTab === "manage" && (
          <div>
            <h1 className="text-2xl font-semibold text-orange-600 mb-4">
              Quản lý Tour
            </h1>
            <TourManagement
              providerId={providerId}
              tours={tours}
              refresh={() => fetchTours(providerId)}
            />
          </div>
        )}

        {activeTab === "add" && (
          <div>
            <h1 className="text-2xl font-semibold text-green-600 mb-4">
              Thêm Tour Mới
            </h1>
            <Card className="p-6 border border-green-100 shadow-sm bg-white">
              <AddTourForm
                providerId={providerId}
                onAdded={() => fetchTours(providerId)}
              />
            </Card>
          </div>
        )}

        {activeTab === "stats" && (
          <div>
            <h1 className="text-2xl font-semibold text-orange-600 mb-4">
              Thống kê
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                label="Tổng Tour"
                value={stats.totalTours}
                color="blue"
                icon={<List size={24} />}
              />
              <StatCard
                label="Tour hoạt động"
                value={stats.activeTours}
                color="green"
                icon={<BarChart3 size={24} />}
              />
              <StatCard
                label="Đặt Tour"
                value={stats.totalBookings}
                color="purple"
                icon={<Info size={24} />}
              />
              <StatCard
                label="Doanh thu"
                value={stats.revenue}
                color="yellow"
                icon={<BarChart3 size={24} />}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
