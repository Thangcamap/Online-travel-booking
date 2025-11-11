import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchTourById, fetchTours } from "../api/tours-api";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { Calendar, MapPin, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const API_BASE = "http://localhost:5000/api";

const TourDetailPage = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUserStore();

  const [guestCount, setGuestCount] = useState({ adults: 1, children: 0, infants: 0 });
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [activeTab, setActiveTab] = useState("include");

  const { data: tour, isLoading, error } = useQuery({
    queryKey: ["tour", tourId],
    queryFn: () => fetchTourById(tourId),
  });
  // 🧩 Hàm định dạng ngày
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // 🧭 useEffect: đồng bộ ngày chọn với tour hiển thị
  React.useEffect(() => {
    if (selectedDate && tour?.start_date && tour?.end_date) {
      const start = new Date(tour.start_date);
      const end = new Date(tour.end_date);
      const duration = (end - start) / (1000 * 60 * 60 * 24);

      const newEnd = new Date(selectedDate);
      newEnd.setDate(newEnd.getDate() + duration);

      // Cập nhật tạm thời ngày trong tour (chỉ để hiển thị)
      tour.start_date = selectedDate;
      tour.end_date = newEnd.toISOString().split("T")[0];
    }
  }, [selectedDate]);

  const { data: allTours = [] } = useQuery({
    queryKey: ["allTours"],
    queryFn: fetchTours,
  });

  const relatedTours = allTours.filter((t) => t.tour_id !== tourId).slice(0, 6);

  const basePrice = selectedPackage?.price || tour?.price || 0;
  const totalPrice =
    basePrice * (guestCount.adults + guestCount.children * 0.7 + guestCount.infants * 0.3);

  const today = new Date();
  const minDate = new Date(today.setDate(today.getDate() + 2)).toISOString().split("T")[0];

  const validateDate = () => {
    if (!selectedDate) return false;
    const today = new Date();
    const chosen = new Date(selectedDate);
    const diffDays = Math.ceil((chosen - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 2;
  };

  const handleBookTour = async () => {
    if (!authUser || !authUser.user_id) {
      alert("Vui lòng đăng nhập để đặt tour!");
      navigate("/login");
      return;
    }

    if (!validateDate()) {
      alert("⛔ Ngày khởi hành phải trước ít nhất 2 ngày!");
      return;
    }

    try {
      const payload = {
        user_id: authUser.user_id,
        tour_id: tour.tour_id,
        quantity: guestCount.adults + guestCount.children + guestCount.infants,
        total_price: totalPrice,
        start_date: selectedDate,
        status: "pending",
      };

      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Lỗi khi đặt tour");

      alert("🎉 Đặt tour thành công! Đang chuyển đến trang thanh toán...");
      navigate(`/payments?booking_id=${data.booking_id}`);
    } catch (err) {
      console.error("❌ Lỗi khi đặt tour:", err);
      alert("Đặt tour thất bại. Vui lòng thử lại!");
    }
  };

  if (isLoading)
    return <div className="text-center py-16 text-gray-500 text-lg">Đang tải thông tin tour...</div>;
  if (error)
    return <div className="text-center py-16 text-red-500">Lỗi tải dữ liệu: {error.message}</div>;
  if (!tour)
    return <div className="text-center py-16 text-gray-500">Không tìm thấy tour này.</div>;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 🔙 Quay lại */}
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/tours" className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium">
          <ArrowLeft size={20} /> Quay lại danh sách Tour
        </Link>
      </div>

      {/* 🏞 Banner */}
      <div className="relative w-full h-[420px]">
        <img src={tour.image_url || "/src/assets/images/default-tour.jpg"} alt={tour.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <h1 className="absolute bottom-6 left-8 text-4xl font-bold text-white drop-shadow-lg">{tour.name}</h1>
      </div>

      {/* 📄 Nội dung chính */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột trái */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Thông tin chi tiết</h2>
          <p className="text-gray-700 mb-5">{tour.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5 text-orange-500" />
              <span><b>Khởi hành:</b> {formatDate(selectedDate || tour.start_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5 text-orange-500" />
              <span><b>Kết thúc:</b> {formatDate(tour.end_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5 text-orange-500" />
              <span><b>Mã tour:</b> {tour.tour_id}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              💰 <b>Giá:</b>{" "}
              <span className="text-orange-600 font-semibold">
                {Number(basePrice).toLocaleString()} {tour.currency || "VND"}
              </span>
            </div>
          </div>

          {/* 🎁 Gói ưu đãi */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-orange-600 mb-3">🎁 Lựa chọn gói ưu đãi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: "basic", name: "Gói Cơ Bản", desc: "Dành cho khách tự túc", price: tour.price },
                { id: "plus", name: "Gói Tiêu Chuẩn", desc: "Bao gồm HDV & ăn sáng", price: tour.price * 1.1 },
                { id: "vip", name: "Gói Cao Cấp", desc: "Phòng VIP + quà lưu niệm", price: tour.price * 1.3 },
              ].map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`p-4 border rounded-xl cursor-pointer hover:shadow-lg transition ${
                    selectedPackage?.id === pkg.id ? "border-orange-500 bg-orange-50" : "border-gray-200"
                  }`}
                >
                  <h4 className="font-semibold text-lg text-gray-800">{pkg.name}</h4>
                  <p className="text-sm text-gray-600 mb-1">{pkg.desc}</p>
                  <p className="text-orange-600 font-bold">{pkg.price.toLocaleString("vi-VN")}đ</p>
                </div>
              ))}
            </div>
          </div>

          {/* 📋 Thông tin cần lưu ý */}
          <div className="mt-10">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">📘 Thông tin cần lưu ý</h3>
            <div className="flex gap-3 mb-4 border-b overflow-x-auto scrollbar-hide">
              {[
                { key: "schedule_info", label: "🗓️ Lịch khởi hành & Giá tour" },
                { key: "experience_info", label: "🌄 Trải nghiệm thú vị" },
                { key: "package_info", label: "🎁 Tour trọn gói bao gồm" },
                { key: "guide_info", label: "🧭 Hướng dẫn viên" },
                { key: "note_info", label: "📝 Lưu ý" },
                { key: "surcharge_info", label: "💰 Phụ phí" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-2 border-b-2 ${
                    activeTab === tab.key
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500"
                  } font-medium transition`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-gray-50 border p-4 rounded-lg leading-relaxed text-gray-700 whitespace-pre-line">
              {activeTab === "schedule_info" && (
                <>
                  <p><b>Khởi hành:</b> {formatDate(selectedDate || tour.schedule_info?.departure)}</p>
                  <p><b>Kết thúc:</b> {formatDate(tour.end_date)}</p>
                  <p><b>Giá cơ bản:</b> {tour.schedule_info?.base_price}</p>
                </>
              )}
              {activeTab === "experience_info" && <p>{tour.experience_info}</p>}
              {activeTab === "package_info" && <p>{tour.package_info}</p>}
              {activeTab === "guide_info" && <p>{tour.guide_info}</p>}
              {activeTab === "note_info" && <p>{tour.note_info}</p>}
              {activeTab === "surcharge_info" && <p>{tour.surcharge_info}</p>}
            </div>
          </div>
        </div>
        {/* 🧾 Cột phải */}
        <div className="bg-white p-6 rounded-2xl shadow-md h-fit sticky top-20">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Thông tin đặt tour</h3>

          {/* Ngày đi */}
          <label className="font-medium text-gray-700 block mb-1">📅 Chọn ngày khởi hành:</label>
          <input
            type="date"
            value={selectedDate}
            min={minDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full mb-4"
          />

          <p className="text-3xl font-bold text-orange-600 mb-2">
            {basePrice.toLocaleString("vi-VN")} {tour.currency || "VND"}
          </p>
          <p className="text-gray-500 mb-4">Áp dụng cho 1 khách • Bao gồm vé, khách sạn & HDV</p>

          {/* 👨‍👩‍👧 Số lượng người */}
          <div className="space-y-3 mb-6">
            {[
              { key: "adults", label: "Người lớn", sub: "> 10 tuổi", min: 1 },
              { key: "children", label: "Trẻ em", sub: "2 - 10 tuổi", min: 0 },
              { key: "infants", label: "Trẻ nhỏ", sub: "< 2 tuổi", min: 0 },
            ].map((type) => (
              <div key={type.key} className="flex justify-between items-center border rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-800">{type.label}</p>
                  <p className="text-xs text-gray-500">{type.sub}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setGuestCount((prev) => ({
                        ...prev,
                        [type.key]: Math.max(type.min, prev[type.key] - 1),
                      }))
                    }
                    className="w-8 h-8 rounded-full border flex items-center justify-center text-lg text-gray-600 hover:bg-orange-100"
                  >
                    –
                  </button>
                  <span className="w-6 text-center font-semibold">{guestCount[type.key]}</span>
                  <button
                    onClick={() =>
                      setGuestCount((prev) => ({ ...prev, [type.key]: prev[type.key] + 1 }))
                    }
                    className="w-8 h-8 rounded-full border flex items-center justify-center text-lg text-gray-600 hover:bg-orange-100"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tổng giá */}
          <div className="border-t pt-3 text-lg font-semibold text-gray-800">
            Tổng giá tour:{" "}
            <span className="text-orange-600">
              {totalPrice.toLocaleString("vi-VN")} {tour.currency || "VND"}
            </span>
          </div>

          <button
            onClick={handleBookTour}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 mt-4 rounded-lg font-semibold transition"
          >
            Đặt Tour Ngay
          </button>
        </div>
      </div>

      {/* 🌴 Gợi ý tour khác */}
      <div className="max-w-6xl mx-auto px-6 mt-10 mb-20">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">🌴 Gợi ý tour khác</h2>
        <motion.div
          className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
          animate={{ x: [0, -200, 0] }}
          transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        >
          {relatedTours.map((t) => (
            <div
              key={t.tour_id}
              className="min-w-[280px] bg-gray-50 rounded-xl shadow-md hover:shadow-xl transition p-3 cursor-pointer"
              onClick={() => navigate(`/tours/${t.tour_id}`)}
            >
              <img src={t.image_url} alt={t.name} className="h-40 w-full object-cover rounded-lg" />
              <h4 className="text-orange-600 font-semibold mt-3">{t.name}</h4>
              <p className="text-gray-600 text-sm line-clamp-2">{t.description}</p>
              <p className="text-blue-700 font-bold mt-2">{Number(t.price).toLocaleString()}đ</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-8">
        © {new Date().getFullYear()} AI-TRAVEL. All rights reserved.
      </div>
    </div>
  );
};

export default TourDetailPage;
