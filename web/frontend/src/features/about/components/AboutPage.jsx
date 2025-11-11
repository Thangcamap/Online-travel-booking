import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Globe2,
  CreditCard,
  Users,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import { Menu } from "@headlessui/react";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { api } from "@/lib/api-client"; // ✅ dùng chung như Home.jsx

import HN1 from "@/assets/images/HN1.png";
import Logo1 from "@/assets/images/Logo1.png";
import Logo2 from "@/assets/images/Logo2.png";
import travelVideo from "./video.mp4";


export default function AboutPage() {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthUserStore();
  const [about, setAbout] = useState(null);
  const [stats, setStats] = useState({ users: 0, tours: 0, payments: 0 });
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [error, setError] = useState(null);

  // 🧭 Scroll event
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 🌍 Fetch dữ liệu từ backend (giống Home)
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.get("/about");
        setAbout(res.data);

        // gọi thêm thống kê
        const [userRes, payRes] = await Promise.all([
          api.get("/admins/stats").catch(() => ({ data: { users: 1200 } })),
          api.get("/payments").catch(() => ({ data: { data: [] } })),
        ]);

        setStats({
          users: userRes.data.users || 1200,
          tours: res.data?.tours?.length || 0,
          payments: payRes.data.data?.length || 0,
        });
      } catch (err) {
        console.error("❌ Lỗi tải dữ liệu About:", err);
        setError("Không thể tải dữ liệu từ máy chủ.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 🔹 Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    setAuthUser(null);
    navigate("/home");
    window.location.reload();
  };

  return (
    <div
      className="relative min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-gray-800 overflow-hidden"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1600&q=80')",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>

      {/* Header */}
      <header className="relative z-10 bg-white/90 backdrop-blur-md shadow-sm sticky top-0">
        <div className="container mx-auto flex justify-between items-center px-6 py-4">
          <div
            className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold cursor-pointer"
            onClick={() => navigate("/home")}
          >
            🌏 AI-TRAVEL
          </div>

          <nav className="hidden sm:flex gap-6 text-gray-700 font-medium">
            <Link to="/home" className="hover:text-orange-500">Home</Link>
            <Link to="/tours" className="hover:text-orange-500">Tours</Link>
            <Link to="/about" className="text-orange-600 font-semibold">About</Link>
            <Link to="/payments" className="hover:text-orange-500">Payments</Link>
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
                      {authUser.name || "Người dùng"}
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

      {/* CONTENT */}
      <div className="relative z-10">
        {/* HERO */}
        <section
          className="relative h-[600px] flex flex-col justify-center items-center text-center"
          style={{
            backgroundImage: `url(${HN1})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/80" />
          <motion.div
            className="relative z-10 px-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <img src={Logo1} alt="AI-TRAVEL" className="w-36 mx-auto mb-6 drop-shadow-lg" />
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-2xl">
              {about?.title || "ONLINE BOOKING TRAVEL"}
            </h1>
            <p className="text-white/90 text-lg max-w-2xl mx-auto">
              {about?.subtitle || "Khám phá – Trải nghiệm – Kết nối"}
            </p>
          </motion.div>
        </section>

        {/* GIỚI THIỆU */}
        <section className="max-w-6xl mx-auto text-center py-20 px-6">
          <h2 className="text-3xl font-bold text-orange-600 mb-6">Giới thiệu</h2>
          {loading ? (
            <p className="text-gray-500 italic">Đang tải thông tin...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <>
              <p className="text-gray-600 max-w-3xl mx-auto mb-8 text-lg leading-relaxed">
                {about?.description}
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                {(about?.highlights || []).map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl border border-orange-100 transition-all"
                  >
                    <h3 className="font-semibold text-orange-600 text-lg mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* STATS */}
        <section className="bg-white py-16 shadow-inner">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 text-center gap-10">
            {[
              { label: "Khách hàng", value: stats.users, icon: <Users size={32} /> },
              { label: "Tour hiện có", value: stats.tours, icon: <Globe2 size={32} /> },
              { label: "Giao dịch", value: stats.payments, icon: <CreditCard size={32} /> },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="p-8 bg-gradient-to-b from-orange-100 to-orange-50 rounded-2xl shadow-md hover:shadow-xl transition-all"
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-orange-600 flex justify-center mb-3">{item.icon}</div>
                <h3 className="text-3xl font-bold text-blue-700">
                  {loading ? "..." : item.value.toLocaleString()}
                </h3>
                <p className="text-gray-600 mt-2">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </section>
        {/* 🏖️ TOUR NỔI BẬT */}
        <section className="py-20 bg-gradient-to-b from-white to-orange-50 relative overflow-hidden">
          <h2 className="text-3xl font-bold text-center text-orange-700 mb-12">
            Tour nổi bật
          </h2>

          {loading ? (
            <p className="text-center text-gray-500 italic">Đang tải danh sách tour...</p>
          ) : about?.tours?.length > 0 ? (
            <div className="relative w-full overflow-hidden">
              <motion.div
                className="flex gap-8 px-10"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  duration: 40, // thời gian chạy 1 vòng (tăng lên nếu muốn chậm hơn)
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {/* Lặp 2 lần để tạo hiệu ứng vô hạn */}
                {[...about.tours, ...about.tours].map((tour, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className="w-[300px] bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer flex-shrink-0 hover:shadow-2xl transition-all"
                    onClick={() => navigate(`/tours/${tour.tour_id}`)}
                  >
                    <img
                      src={tour.image_url || HN1}
                      alt={tour.name}
                      className="w-full h-52 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="p-4 text-center">
                      <h3 className="text-xl font-semibold text-orange-600">{tour.name}</h3>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {tour.description}
                      </p>
                      <p className="mt-3 font-bold text-blue-700">
                        {tour.price?.toLocaleString()}₫
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Gradient che hai bên cho đẹp */}
              <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-orange-50 to-transparent pointer-events-none"></div>
              <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-orange-50 to-transparent pointer-events-none"></div>
            </div>
          ) : (
            <p className="text-center text-gray-500 italic">
              Không có tour nào được tìm thấy.
            </p>
          )}
        </section>
        {/* PHẢN HỒI */}
        <section className="bg-gradient-to-r from-blue-50 via-white to-orange-50 py-20">
          <h2 className="text-3xl font-bold text-center text-blue-700 mb-10">Phản hồi khách hàng</h2>
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 px-6">
            {[
              { name: "Minh Anh", content: "Tour Đà Nẵng tuyệt vời! Dịch vụ chu đáo, thanh toán nhanh." },
              { name: "Ngọc Bảo", content: "Hỗ trợ 24/7, giao diện dễ dùng, tour phong phú." },
              { name: "Hoàng Long", content: "Thanh toán VietQR rất tiện! Sẽ tiếp tục đặt tour." },
            ].map((fb, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.03 }}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg border border-gray-100"
              >
                <MessageCircle className="text-orange-500 mx-auto mb-3" size={32} />
                <p className="text-gray-600 italic">“{fb.content}”</p>
                <h4 className="text-blue-700 font-semibold mt-3">{fb.name}</h4>
              </motion.div>
            ))}
          </div>
        </section>

        {/* HƯỚNG DẪN THANH TOÁN */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-20">
          <h2 className="text-3xl font-bold text-center text-blue-700 mb-12">Hướng dẫn thanh toán</h2>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 px-8 items-center">
            <motion.ol
              className="list-decimal pl-6 space-y-4 text-gray-700 text-lg leading-relaxed"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <li>Chọn tour yêu thích và nhấn “Đặt tour ngay”.</li>
              <li>Nhập thông tin cá nhân & chọn phương thức thanh toán.</li>
              <li>Kiểm tra hóa đơn được tạo tự động.</li>
              <li>Thanh toán qua thẻ, chuyển khoản hoặc VietQR.</li>
              <li>Nhận xác nhận qua email sau khi thanh toán thành công.</li>
            </motion.ol>

            <motion.img
              src={Logo2}
              alt="Payment illustration"
              className="rounded-2xl shadow-lg w-[85%] mx-auto"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
            />
          </div>

          <div className="flex justify-center mt-8">
            <motion.div
              className="relative w-[90%] md:w-[70%] lg:w-[60%] rounded-2xl overflow-hidden shadow-2xl border-4 border-orange-300"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <video
                controls
                autoPlay
                loop
                muted
                className="w-full h-auto rounded-2xl"
                poster="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80"
              >
                <source src={travelVideo} type="video/mp4" />
                Trình duyệt của bạn không hỗ trợ video.
              </video>
            </motion.div>
          </div>
        </section>

        {/* SCROLL TOP */}
        {showScrollTop && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 bg-orange-500 text-white p-3 rounded-full shadow-lg hover:bg-orange-600 transition-all z-50"
          >
            <ArrowUp size={22} />
          </motion.button>
        )}

        {/* FOOTER */}
        <footer className="mt-20 py-6 bg-gray-900 text-white text-center text-sm">
          © 2025 AI-TRAVEL | Khám phá thế giới cùng bạn 🌏
        </footer>
      </div>
    </div>
  );
}
