import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchTourById, fetchTours } from "../api/tours-api";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { Calendar, MapPin, ArrowLeft, Star, Users } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import UserChat from "@/features/chat/components/UserChat";
import ReviewModal from "@/features/reviews/components/ReviewModal";
import { getTourReviews } from "@/features/reviews/api/reviews-api";
import StarRating from "@/components/StarRating";
import { fetchPayments } from "@/features/payments/api/payments";
import { fetchBookingsByUser } from "../api/bookings-api";
import { api } from "@/lib/api-client";




const API_BASE = "http://localhost:5000/api";

const TourDetailPage = () => {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUserStore();

  const [guestCount, setGuestCount] = useState({ adults: 1, children: 0, infants: 0 });
  const [selectedPackage, setSelectedPackage] = useState(null);
  // const [selectedDate, setSelectedDate] = useState("");
  const [activeTab, setActiveTab] = useState("include");
  const [openGallery, setOpenGallery] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviews, setReviews] = useState([]);



  const { data: tour, isLoading, error } = useQuery({
    queryKey: ["tour", tourId],
    queryFn: () => fetchTourById(tourId),
  });

  // Fetch reviews
  const { data: reviewsData } = useQuery({
    queryKey: ["tourReviews", tourId],
    queryFn: async () => {
      const res = await getTourReviews(tourId);
      return res;
    },
    enabled: !!tourId,
  });

  // Fetch user bookings to check if tour is paid
  const { data: userBookingsData } = useQuery({
    queryKey: ["userBookings", authUser?.user_id],
    queryFn: async () => {
      if (!authUser?.user_id) return { success: false, bookings: [] };
      try {
        const res = await api.get(`/bookings/user/${authUser.user_id}`);
        return res.data;
      } catch (err) {
        console.error("Error fetching bookings:", err);
        return { success: false, bookings: [] };
      }
    },
    enabled: !!authUser?.user_id,
  });

  // Fetch user payments to check payment status
  const { data: userPayments = [] } = useQuery({
    queryKey: ["userPayments", authUser?.user_id, authUser?.email],
    queryFn: () => fetchPayments(authUser?.email, authUser?.user_id),
    enabled: !!(authUser?.email || authUser?.user_id),
    refetchOnMount: true,
  });

  React.useEffect(() => {
    if (reviewsData?.success) {
      setReviews(reviewsData.reviews || []);
    }
  }, [reviewsData]);

  // Kiểm tra xem user đã thanh toán tour này chưa
  const hasPaidForTour = () => {
    if (!authUser || !tourId) return false;
    
    const bookings = userBookingsData?.bookings || [];
    if (!bookings.length || !userPayments.length) return false;
    
    // Tìm booking cho tour này
    const tourBooking = bookings.find(booking => booking.tour_id === tourId);
    if (!tourBooking) return false;
    
    // Tìm payment cho booking này với status = 'paid'
    const payment = userPayments.find(p => p.booking_id === tourBooking.booking_id);
    
    // Chỉ cho phép đánh giá nếu:
    // 1. Có payment với status = 'paid'
    // 2. Booking status = 'completed' (tùy chọn, có thể bỏ qua nếu không cần)
    return payment && payment.status === "paid";
  };

  const canReview = hasPaidForTour();
  //  Hàm định dạng ngày
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  //  useEffect: đồng bộ ngày chọn với tour hiển thị
  // React.useEffect(() => {
  //   if (selectedDate && tour?.start_date && tour?.end_date) {
  //     const start = new Date(tour.start_date);
  //     const end = new Date(tour.end_date);
  //     const duration = (end - start) / (1000 * 60 * 60 * 24);

  //     const newEnd = new Date(selectedDate);
  //     newEnd.setDate(newEnd.getDate() + duration);

  //     // Cập nhật tạm thời ngày trong tour (chỉ để hiển thị)
  //     tour.start_date = selectedDate;
  //     tour.end_date = newEnd.toISOString().split("T")[0];
  //   }
  // }, [selectedDate]);

  const { data: allTours = [] } = useQuery({
    queryKey: ["allTours"],
    queryFn: fetchTours,
  });

  const relatedTours = allTours.filter((t) => t.tour_id !== tourId).slice(0, 6);

  const basePrice = selectedPackage?.price || tour?.price || 0;
  const totalPrice =
    basePrice * (guestCount.adults + guestCount.children * 0.7 + guestCount.infants * 0.3);

  // // Tính minDate (hôm nay + 2 ngày)
  // const getMinDate = () => {
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0); // Reset về 00:00:00
  //   const minDate = new Date(today);
  //   minDate.setDate(today.getDate() + 2); // Thêm 2 ngày
  //   return minDate.toISOString().split("T")[0];
  // };

  // const minDate = getMinDate();

  // const validateDate = () => {
  //   if (!selectedDate) {
  //     console.log(" No date selected");
  //     return false;
  //   }

  //   // Reset time về 00:00:00 cho cả hai ngày để so sánh chính xác
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);
    
  //   const chosen = new Date(selectedDate);
  //   chosen.setHours(0, 0, 0, 0);

  //   // Tính số ngày chênh lệch (số nguyên)
  //   const diffTime = chosen.getTime() - today.getTime();
  //   const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  //   console.log(" Date validation:", {
  //     today: today.toISOString().split("T")[0],
  //     chosen: selectedDate,
  //     diffDays,
  //     isValid: diffDays >= 2,
  //   });

  //   // Phải chọn ngày >= hôm nay + 2 ngày
  //   return diffDays >= 2;
  // };

  const handleBookTour = async () => {
    if (!authUser || !authUser.user_id) {
      alert("Vui lòng đăng nhập để đặt tour!");
      navigate("/login");
      return;
    }

    // if (!validateDate()) {
    //   const today = new Date();
    //   today.setHours(0, 0, 0, 0);
    //   const minAllowedDate = new Date(today);
    //   minAllowedDate.setDate(today.getDate() + 2);
      
    //   alert(
    //     ` Ngày khởi hành phải cách hôm nay ít nhất 2 ngày!\n\n` +
    //     `Hôm nay: ${today.toLocaleDateString("vi-VN")}\n` +
    //     `Ngày sớm nhất có thể đặt: ${minAllowedDate.toLocaleDateString("vi-VN")}\n` +
    //     `Bạn đã chọn: ${selectedDate ? new Date(selectedDate).toLocaleDateString("vi-VN") : "Chưa chọn"}`
    //   );
    //   return;
    // }

    try {
      const payload = {
        user_id: authUser.user_id,
        tour_id: tour.tour_id,
        total_price: totalPrice,
        // start_date: selectedDate,
        start_date: tour.start_date,
        status: "pending",
      };

      console.log(" Booking payload:", payload);
      
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log(" Booking response:", data);
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Lỗi khi đặt tour");
      }

      alert("🎉 Đặt tour thành công! Đang chuyển đến trang thanh toán...");
      
      // Chuyển đến ProfilePage với tab "payments" active
      setTimeout(() => {
        navigate(`/profile?tab=payments`);
      }, 500);
    } catch (err) {
      console.error(" Lỗi khi đặt tour:", err);
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
    
    {/* 🔹 NAVBAR */}
    <Navbar />
    <div className="pt-6"></div>

    {/* 🔹 Tên Tour */}
<div className="max-w-6xl mx-auto px-6 mt-4">
  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
    {tour.name}
  </h1>
</div>
      {/* 🏞 Banner */}
<div className="max-w-6xl mx-auto px-6 mt-6">
  <div className="grid grid-cols-4 gap-3 rounded-xl overflow-hidden">
    {/* Ảnh lớn */}
    <div
      className="col-span-2 row-span-2 cursor-pointer"
      onClick={() => setOpenGallery(true)}
    >
      <img
        src={(tour.images?.length > 0 ? tour.images[0] : tour.image_url)}
        className="w-full h-[420px] object-cover rounded-xl"
      />
    </div>

    {/* Ảnh nhỏ bên phải */}
    {(tour.images?.length > 1 ? tour.images.slice(1, 5) : [])
      .map((img, index) => (
        <div
          key={index}
          className="h-[200px] cursor-pointer relative"
          onClick={() => setOpenGallery(true)}
        >
          <img src={img} className="w-full h-full object-cover rounded-xl" />

          {/* 🔹 Overlay "Xem tất cả" ở ảnh cuối */}
          {index === 3 && tour.images.length > 5 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center 
            text-white font-semibold text-lg rounded-xl">
               Xem tất cả hình ảnh
            </div>
          )}
        </div>
      ))}
  </div>
</div>


      {/*  Nội dung chính */}
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột trái */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Thông tin chi tiết</h2>
          <p className="text-gray-700 mb-5">{tour.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5 text-orange-500" />
              {/* <span><b>Khởi hành:</b> {formatDate(selectedDate || tour.start_date)}</span> */}
              <span><b>Khởi hành:</b> {formatDate(tour.start_date)}</span>

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
              <b>Giá:</b>{" "}
              <span className="text-orange-600 font-semibold">
                {Number(basePrice).toLocaleString()} {tour.currency || "VND"}
              </span>
            </div>
            {tour.available_slots !== undefined && tour.available_slots !== null && (
              <div className="flex items-center gap-2 text-gray-700 sm:col-span-2">
                <Users className="w-5 h-5 text-orange-500" />
                <span>
                  <b>Số vé còn lại:</b>{" "}
                  <span className={`font-semibold ${
                    tour.available_slots === 0 
                      ? "text-red-600" 
                      : tour.available_slots <= 5 
                      ? "text-orange-600" 
                      : "text-green-600"
                  }`}>
                    {tour.available_slots} vé
                  </span>
                  {tour.available_slots === 0 && (
                    <span className="ml-2 text-red-600 text-sm font-semibold">(Hết chỗ)</span>
                  )}
                  {tour.available_slots > 0 && tour.available_slots <= 5 && (
                    <span className="ml-2 text-orange-600 text-sm font-semibold">(Sắp hết)</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/*  Gói ưu đãi */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-orange-600 mb-3"> Lựa chọn gói ưu đãi</h3>
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

          {/*  Lịch trình chi tiết */}
          <div className="mt-10">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Lịch trình chi tiết
            </h3>

            {/*  Kiểm tra cả tour.itineraries lẫn booking.itineraries */}
            {((tour.itineraries && tour.itineraries.length > 0) ||
              (tour.booking_itineraries && tour.booking_itineraries.length > 0)) ? (
              <div className="space-y-4">
                {(tour.itineraries || tour.booking_itineraries).map((day, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-5 bg-white border border-orange-200 rounded-xl shadow-sm hover:shadow-lg transition"
                  >
                    <h4 className="text-lg font-semibold text-orange-600 mb-2">
                       Ngày {day.day_number}: {day.title}
                    </h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {day.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Chưa có lịch trình chi tiết cho tour này.
              </p>
            )}
          </div>

          {/* Reviews Section */}
          <div className="mt-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  Đánh giá từ khách hàng
                </h3>
                {reviews.length > 0 && (() => {
                  const avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
                  return (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <StarRating 
                          rating={avgRating} 
                          totalReviews={reviews.length}
                          showReviews={true}
                          size={20}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {reviews.length} {reviews.length === 1 ? 'đánh giá' : 'đánh giá'}
                      </span>
                    </div>
                  );
                })()}
              </div>
              {authUser && (
                <>
                  {canReview ? (
                    <button
                      onClick={() => setReviewModalOpen(true)}
                      className="px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <Star className="w-5 h-5" />
                      Viết đánh giá
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        alert(" Bạn chỉ có thể đánh giá tour sau khi đã thanh toán!\n\nVui lòng thanh toán tour trước khi đánh giá.");
                        navigate("/profile?tab=payments");
                      }}
                      className="px-5 py-2.5 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed transition font-semibold flex items-center gap-2"
                      title="Bạn cần thanh toán tour trước khi đánh giá"
                    >
                      <Star className="w-5 h-5" />
                      Viết đánh giá (Cần thanh toán)
                    </button>
                  )}
                </>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  Chưa có đánh giá nào cho tour này.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Hãy là người đầu tiên chia sẻ trải nghiệm của bạn!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <motion.div
                    key={review.review_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <img
                          src={
                            review.user_avatar ||
                            review.avatar_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user_name || "User")}&background=ff6b35&color=fff&size=128`
                          }
                          alt={review.user_name}
                          className="w-14 h-14 rounded-full border-2 border-orange-200 object-cover"
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-lg mb-1">
                              {review.user_name || "Người dùng"}
                            </h4>
                            <div className="flex items-center gap-3">
                              <StarRating
                                rating={review.rating}
                                showReviews={false}
                                size={18}
                              />
                              <span className="text-sm text-gray-500">
                                {new Date(review.created_at).toLocaleDateString(
                                  "vi-VN",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                              {review.updated_at && 
                               review.updated_at !== review.created_at && (
                                <span className="text-xs text-gray-400 italic">
                                  (Đã chỉnh sửa)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {review.comment ? (
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {review.comment}
                          </p>
                        ) : (
                          <p className="text-gray-400 italic text-sm">
                            Không có nhận xét
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/*  Cột phải */}
        <div className="bg-white p-6 rounded-2xl shadow-md h-fit sticky top-20">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Thông tin đặt tour</h3>

          {/* Hiển thị số vé còn lại */}
          {tour.available_slots !== undefined && tour.available_slots !== null && (
            <div className={`mb-4 p-3 rounded-lg border-2 ${
              tour.available_slots === 0 
                ? "bg-red-50 border-red-300" 
                : tour.available_slots <= 5 
                ? "bg-orange-50 border-orange-300" 
                : "bg-green-50 border-green-300"
            }`}>
              <div className="flex items-center gap-2">
                <Users className={`w-5 h-5 ${
                  tour.available_slots === 0 
                    ? "text-red-600" 
                    : tour.available_slots <= 5 
                    ? "text-orange-600" 
                    : "text-green-600"
                }`} />
                <div>
                  <p className={`font-semibold ${
                    tour.available_slots === 0 
                      ? "text-red-700" 
                      : tour.available_slots <= 5 
                      ? "text-orange-700" 
                      : "text-green-700"
                  }`}>
                    {tour.available_slots === 0 
                      ? " Hết chỗ" 
                      : tour.available_slots <= 5 
                      ? ` Còn ${tour.available_slots} vé (Sắp hết)` 
                      : ` Còn ${tour.available_slots} vé`}
                  </p>
                  {tour.available_slots > 0 && tour.available_slots <= 5 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Nhanh tay đặt ngay để không bỏ lỡ!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ngày đi */}
          {/* <label className="font-medium text-gray-700 block mb-1"> Chọn ngày khởi hành:</label>
          <input
            type="date"
            value={selectedDate}
            min={minDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full mb-4"
            disabled={tour.available_slots === 0}
          /> */}
          <div className="mb-4">
            <p className="text-sm text-gray-500">Ngày khởi hành</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatDate(tour.start_date)}
            </p>
          </div>

          <p className="text-3xl font-bold text-orange-600 mb-2">
            {basePrice.toLocaleString("vi-VN")} {tour.currency || "VND"}
          </p>
          <p className="text-gray-500 mb-4">Áp dụng cho 1 khách • Bao gồm vé, khách sạn & HDV</p>

          {/*  Số lượng người */}
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
            disabled={tour.available_slots === 0}
            className={`w-full py-3 mt-4 rounded-lg font-semibold transition ${
              tour.available_slots === 0
                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}
          >
            {tour.available_slots === 0 ? "Hết chỗ" : "Đặt Tour Ngay"}
          </button>
          {authUser && (
  <button
    onClick={() => setOpenChat(true)}
    className="w-full bg-white border border-orange-500 text-orange-600 py-3 mt-3 rounded-lg font-semibold hover:bg-orange-50 transition"
  >
     Chat với nhà cung cấp tour
  </button>
)}
        </div>
      </div>

       {/* Gợi ý tour khác
      <div className="max-w-6xl mx-auto px-6 mt-10 mb-20">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6"> Gợi ý tour khác</h2>
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
      </div> */}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-8">
        © {new Date().getFullYear()} AI-TRAVEL. All rights reserved.
      </div>

{openChat && (
  <div className="fixed bottom-20 right-6 bg-white rounded-xl shadow-lg w-96 h-[450px] border z-50 flex flex-col">
    
    {/* Header */}
    <div className="bg-orange-500 p-3 text-white flex justify-between items-center rounded-t-xl">
      <span className="font-semibold"> Chat với nhà cung cấp tour</span>
      <button onClick={() => setOpenChat(false)} className="font-bold text-lg">
        ✖
      </button>
    </div>

    {/* Chat Component */}
    <div className="flex-1 overflow-hidden">
<UserChat 
  tour_id={tourId}
  user_id={authUser?.user_id}
  provider_id={tour?.provider_id}
/>

    </div>
  </div>
)}

      {/* Review Modal */}
      {authUser && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          tour_id={tourId}
          user_id={authUser.user_id}
          tour_name={tour?.name}
        />
      )}

    </div>
  );
};

export default TourDetailPage;
