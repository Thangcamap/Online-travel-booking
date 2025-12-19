import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { Menu } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { fetchTours } from "../api/tours-api";

import Logo2 from "@/assets/images/Logo2.png";
import HN1 from "@/assets/images/HN1.png";
import Banner from "./BannerTours.jpg";



export default function ToursPage() {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthUserStore();

  // Các ô lọc tìm kiếm
  const [search, setSearch] = useState("");
  const [departure, setDeparture] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: tours = [], isLoading, error } = useQuery({
    queryKey: ["tours"],
    queryFn: fetchTours,
  });

  // Hàm lọc tour
  const filteredTours = tours.filter((t) => {
    const keyword = search.toLowerCase();
    const matchesKeyword =
      !search ||
      t.name?.toLowerCase().includes(keyword) ||
      t.description?.toLowerCase().includes(keyword);
    const matchesDeparture =
      !departure ||
      t.description?.toLowerCase().includes(departure.toLowerCase());
    const matchesPrice =
      !priceFilter ||
      (priceFilter === "low" && t.price < 1000000) ||
      (priceFilter === "medium" && t.price >= 1000000 && t.price <= 4000000) ||
      (priceFilter === "high" && t.price > 4000000);
    const matchesDate =
      !dateFilter ||
      (t.start_date &&
        new Date(t.start_date).toISOString().split("T")[0] === dateFilter);

    return matchesKeyword && matchesDeparture && matchesPrice && matchesDate;
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    setAuthUser(null);
    navigate("/home");
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-800">
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/home")}
          >
            <img src={Logo2} alt="logo" className="w-10 h-10" />
            <span className="text-2xl font-bold text-orange-500 hover:text-orange-600">
              AI-TRAVEL
            </span>
          </div>

          <nav className="hidden sm:flex gap-6 text-gray-700 font-medium">
            <Link to="/home" className="hover:text-orange-500">
              Home
            </Link>
            <Link to="/tours" className="text-orange-600 font-semibold">
              Tours
            </Link>
            <Link to="/about" className="hover:text-orange-500">
              About
            </Link>
            <Link to="/payments" className="hover:text-orange-500">
              Payments
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {!authUser ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-orange-500 font-semibold hover:text-white hover:bg-orange-500 rounded-lg border border-orange-500 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition"
                >
                  Register
                </Link>
              </>
            ) : (
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="flex items-center gap-2">
                  <img
                    src={authUser.avatar || "https://i.pravatar.cc/40"}
                    className="w-10 h-10 rounded-full border-2 border-orange-400"
                    alt="avatar"
                  />
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl ring-1 ring-black ring-opacity-5">
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-500">Xin chào</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {authUser.name}
                    </p>
                  </div>
                  <div className="py-1">
                    <Menu.Item>
                      <button
                        onClick={() => navigate("/profile")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        👤 Hồ sơ cá nhân
                      </button>
                    </Menu.Item>
                    <Menu.Item>
                      <button
                        onClick={() => navigate("/payments")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        💳 Thanh toán của tôi
                      </button>
                    </Menu.Item>
                    <Menu.Item>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        🚪 Đăng xuất
                      </button>
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Menu>
            )}
          </div>
        </div>
      </header>

      {/* 🏞️ BANNER + FORM */}
      <section
        className="relative h-[80vh] flex flex-col justify-center items-center text-center text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${Banner})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 w-full max-w-6xl px-6">
          <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">
            Hơn 1000+ Tour, Khám Phá Ngay
          </h1>
          <p className="text-lg text-gray-200 mb-10">
            Giá tốt – hỗ trợ 24/7 – khắp nơi
          </p>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white/95 p-6 rounded-2xl shadow-2xl text-gray-700">
            {/* Ô 1: từ khóa */}
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-3 col-span-2">
              <Search className="text-orange-600 mr-2" />
              <input
                type="text"
                placeholder="Bạn muốn đi đâu?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-lg focus:outline-none"
              />
            </div>

            {/* Ô 2: ngày khởi hành */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-orange-400"
            />

            {/* Ô 3: nơi khởi hành */}
            <input
              type="text"
              placeholder="Khởi hành từ..."
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-orange-400"
            />

            {/* Ô 4: giá */}
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-3 text-lg focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Mức giá</option>
              <option value="low">Dưới 1 triệu</option>
              <option value="medium">1 - 4 triệu</option>
              <option value="high">Trên 4 triệu</option>
            </select>

            {/* Nút tìm kiếm */}
            <button className="bg-orange-500 text-white font-semibold text-lg rounded-lg py-3 hover:bg-orange-600 transition">
              Tìm kiếm
            </button>
          </div>
        </div>
      </section>

      {/* 📋 KẾT QUẢ CHỈ HIỆN KHI CÓ TÌM KIẾM */}
      {(search || priceFilter || dateFilter || departure) && (
        <motion.main
          className="flex-1 container mx-auto px-6 py-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-orange-700 mb-10 text-center">
            Kết quả tìm kiếm ({filteredTours.length})
          </h2>

          {isLoading ? (
            <p className="text-center text-gray-500 italic">Đang tải tour...</p>
          ) : error ? (
            <p className="text-center text-red-500">Lỗi tải dữ liệu tour.</p>
          ) : filteredTours.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {filteredTours.map((tour) => (
                <motion.div
                  key={tour.tour_id}
                  whileHover={{ scale: 1.03 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition cursor-pointer"
                  onClick={() => navigate(`/tours/${tour.tour_id}`)}
                >
                  <img
                    src={tour.image_url || HN1}
                    alt={tour.name}
                    className="w-full h-56 object-cover"
                  />
                  <div className="p-5 text-center">
                    <h3 className="text-lg font-semibold text-orange-600">
                      {tour.name}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {tour.description}
                    </p>
                    <p className="mt-3 font-bold text-blue-700">
                      {Number(tour.price).toLocaleString()}₫
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 italic">
              Không tìm thấy tour nào phù hợp.
            </p>
          )}
        </motion.main>
      )}

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white text-center py-6 mt-10">
        © 2025 AI-TRAVEL | Khám phá thế giới cùng bạn 🌏
      </footer>
    </div>
  );
}
