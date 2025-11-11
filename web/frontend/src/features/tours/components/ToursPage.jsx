import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Search, ArrowLeft } from "lucide-react";
import { Menu } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { fetchTours, fetchTourById } from "../api/tours-api";

import Logo2 from "@/assets/images/Logo2.png";
import HN1 from "@/assets/images/HN1.png";

export default function ToursPage() {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthUserStore();
  const { id } = useParams(); // 👉 nếu có /tours/:id thì lấy ID

  const [search, setSearch] = useState("");

  // 🧭 Fetch danh sách tour
  const {
    data: tours = [],
    isLoading: loadingTours,
    error: errorTours,
  } = useQuery({
    queryKey: ["tours"],
    queryFn: fetchTours,
    enabled: !id, // chỉ fetch khi không có id
  });

  // 🧭 Fetch chi tiết tour nếu có id
  const {
    data: tourDetail,
    isLoading: loadingDetail,
    error: errorDetail,
  } = useQuery({
    queryKey: ["tour", id],
    queryFn: () => fetchTourById(id),
    enabled: !!id, // chỉ fetch khi có id
  });

  // Lọc tour theo tìm kiếm
  const filteredTours = !search
    ? tours
    : tours.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
      );

  const handleLogout = () => {
    localStorage.removeItem("user");
    setAuthUser(null);
    navigate("/home");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 flex flex-col text-gray-800">
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

      {/* Nếu không có ID → danh sách tour */}
      {!id && (
        <>
          {/* SEARCH BAR */}
          <section className="bg-orange-100 py-6 shadow-inner">
            <div className="max-w-4xl mx-auto flex items-center gap-4 px-4">
              <Search className="text-orange-600" size={24} />
              <input
                type="text"
                placeholder="Tìm kiếm tour theo tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 p-3 rounded-lg border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </section>

          <main className="flex-1 container mx-auto px-6 py-12">
            <h2 className="text-3xl font-bold text-orange-700 mb-10 text-center">
              Danh sách Tour du lịch
            </h2>

            {loadingTours ? (
              <p className="text-center text-gray-500 italic">Đang tải tour...</p>
            ) : errorTours ? (
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
                Không tìm thấy tour nào.
              </p>
            )}
          </main>
        </>
      )}

      {/* Nếu có ID → hiển thị chi tiết tour */}
      {id && (
        <motion.div
          className="flex-1 container mx-auto px-6 py-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate("/tours")}
            className="flex items-center gap-2 text-orange-600 font-semibold hover:underline mb-8"
          >
            <ArrowLeft size={20} /> Quay lại danh sách
          </button>

          {loadingDetail ? (
            <p className="text-center text-gray-500">Đang tải chi tiết tour...</p>
          ) : errorDetail ? (
            <p className="text-center text-red-500">Không thể tải dữ liệu tour.</p>
          ) : tourDetail ? (
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
              <img
                src={tourDetail.image_url || HN1}
                alt={tourDetail.name}
                className="w-full h-[400px] object-cover"
              />
              <div className="p-8">
                <h1 className="text-4xl font-bold text-orange-600 mb-4">
                  {tourDetail.name}
                </h1>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {tourDetail.description}
                </p>
                <p className="text-blue-700 font-bold text-2xl mb-6">
                  Giá: {Number(tourDetail.price).toLocaleString()}₫
                </p>

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => navigate("/payments")}
                    className="px-6 py-3 bg-green-500 text-white rounded-full font-semibold shadow-md hover:bg-green-600"
                  >
                    💳 Đặt tour ngay
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => navigate("/tours")}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-full font-semibold shadow-md hover:bg-gray-400"
                  >
                    ↩️ Trở lại
                  </motion.button>
                </div>

                {tourDetail.itinerary?.length > 0 && (
                  <div className="mt-10">
                    <h2 className="text-2xl font-bold mb-4 text-orange-600">
                      📅 Lịch trình chi tiết
                    </h2>
                    <ul className="space-y-3">
                      {tourDetail.itinerary.map((day) => (
                        <li
                          key={day.day_number}
                          className="border p-4 rounded-xl bg-orange-50 shadow-sm"
                        >
                          <strong>Ngày {day.day_number}:</strong>{" "}
                          {day.title || "Chưa có tiêu đề"} <br />
                          <span className="text-gray-700">
                            {day.description || "Chưa có mô tả"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">Không tìm thấy tour.</p>
          )}
        </motion.div>
      )}

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white text-center py-6 mt-10">
        © 2025 AI-TRAVEL | Khám phá thế giới cùng bạn 🌏
      </footer>
    </div>
  );
}
