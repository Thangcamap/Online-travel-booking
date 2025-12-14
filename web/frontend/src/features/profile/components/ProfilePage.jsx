import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuthUserStore from "@/stores/useAuthUserStore";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api-client";
import { socket } from "@/lib/socket";
import { Calendar, MapPin, DollarSign, Package, Star, Gift, TrendingUp, MessageSquare, QrCode, FileText, Trash2, Edit2, CreditCard, Award, Sparkles } from "lucide-react";
import ReviewModal from "@/features/reviews/components/ReviewModal";
import StarRating from "@/components/StarRating";
import { getUserPoints, getPointTransactions } from "@/features/points/api/points-api";
import { getUserReviews, getUserReviewForTour } from "@/features/reviews/api/reviews-api";
import {
  fetchPayments,
  confirmPayment,
  updatePayment,
  deletePayment,
  fetchInvoice,
  uploadPaymentImage,
} from "@/features/payments/api/payments";

// Helper function to format date
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { authUser } = useAuthUserStore();
  
  // Đọc tab từ query param, mặc định là "bookings"
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "bookings"); // bookings, payments, points, reviews
  
  // Cập nhật activeTab khi URL thay đổi
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["bookings", "payments", "points", "reviews"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Lắng nghe payment status change từ socket
  useEffect(() => {
    const handlePaymentApproved = (event) => {
      const paymentData = event.detail;
      console.log("💳 Payment approved event received:", paymentData);
      
      // Invalidate queries để refresh data
      qc.invalidateQueries(["payments", authUser?.user_id, authUser?.email]);
      qc.invalidateQueries(["userBookings", authUser?.user_id]);
      qc.invalidateQueries(["userPoints", authUser?.user_id]);
      
      // Tự động chuyển sang tab payments nếu đang ở tab khác
      if (activeTab !== "payments") {
        setActiveTab("payments");
        navigate("/profile?tab=payments", { replace: true });
      }
    };

    const handlePaymentRejected = (event) => {
      const paymentData = event.detail;
      console.log("💳 Payment rejected event received:", paymentData);
      
      // Invalidate queries để refresh data
      qc.invalidateQueries(["payments", authUser?.user_id, authUser?.email]);
      qc.invalidateQueries(["userBookings", authUser?.user_id]);
      
      // Tự động chuyển sang tab payments nếu đang ở tab khác
      if (activeTab !== "payments") {
        setActiveTab("payments");
        navigate("/profile?tab=payments", { replace: true });
      }
    };

    window.addEventListener("payment_approved", handlePaymentApproved);
    window.addEventListener("payment_rejected", handlePaymentRejected);
    
    return () => {
      window.removeEventListener("payment_approved", handlePaymentApproved);
      window.removeEventListener("payment_rejected", handlePaymentRejected);
    };
  }, [qc, authUser?.user_id, authUser?.email, activeTab, navigate]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTourForReview, setSelectedTourForReview] = useState(null);
  
  // Payment modals
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(null);
  const [payStatus, setPayStatus] = useState({ text: "", cls: "pending" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ payment_id: "", method: "", amount: 0 });
  const [saving, setSaving] = useState(false);
  const [bookingReviews, setBookingReviews] = useState({}); // Lưu reviews cho từng booking

  // Fetch user bookings
  const { data: bookingsData, isLoading, isError, error, refetch: refetchBookings } = useQuery({
    queryKey: ["userBookings", authUser?.user_id],
    queryFn: async () => {
      if (!authUser?.user_id) {
        console.log("⚠️ No user_id, returning empty bookings");
        return { success: false, bookings: [] };
      }
      console.log("📝 Fetching bookings for user:", authUser.user_id);
      try {
        const res = await api.get(`/bookings/user/${authUser.user_id}`);
        console.log("✅ Bookings response:", res.data);
        return res.data;
      } catch (err) {
        console.error("❌ Error fetching bookings:", err);
        console.error("❌ Error response:", err.response?.data);
        throw err;
      }
    },
    enabled: !!authUser?.user_id,
    retry: 1,
  });

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ["payments", authUser?.user_id, authUser?.email],
    queryFn: () => fetchPayments(authUser?.email, authUser?.user_id),
    enabled: !!(authUser?.email || authUser?.user_id),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch user points
  const { data: pointsData } = useQuery({
    queryKey: ["userPoints", authUser?.user_id],
    queryFn: async () => {
      if (!authUser?.user_id) return { success: false, points: { available_points: 0, lifetime_points: 0 } };
      return await getUserPoints(authUser.user_id);
    },
    enabled: !!authUser?.user_id,
    refetchOnMount: true,
  });

  // Fetch point transactions
  const { data: transactionsData } = useQuery({
    queryKey: ["pointTransactions", authUser?.user_id],
    queryFn: async () => {
      if (!authUser?.user_id) return { success: false, transactions: [] };
      return await getPointTransactions(authUser.user_id, 10);
    },
    enabled: !!authUser?.user_id,
  });

  // Fetch user reviews
  const { data: reviewsData } = useQuery({
    queryKey: ["userReviews", authUser?.user_id],
    queryFn: async () => {
      if (!authUser?.user_id) return { success: false, reviews: [] };
      return await getUserReviews(authUser.user_id, 50);
    },
    enabled: !!authUser?.user_id,
  });

  const bookings = bookingsData?.bookings || [];
  const points = pointsData?.points || { available_points: 0, lifetime_points: 0, total_points: 0 };
  const transactions = transactionsData?.transactions || [];
  const reviews = reviewsData?.reviews || [];

  // Phân loại bookings: unpaid payments → "Thanh toán", paid payments → "Lịch sử đặt tour"
  const unpaidPayments = useMemo(() => payments.filter(p => p.status === "unpaid"), [payments]);
  const paidPayments = useMemo(() => payments.filter(p => p.status === "paid"), [payments]);
  
  // Bookings đã thanh toán (có payment status = 'paid')
  const paidBookings = useMemo(() => {
    return bookings.filter(booking => {
      const payment = payments.find(p => p.booking_id === booking.booking_id);
      return payment && payment.status === "paid";
    });
  }, [bookings, payments]);

  // Fetch review cho từng booking tour (sau khi paidBookings đã được định nghĩa)
  useEffect(() => {
    const fetchBookingReviews = async () => {
      if (!authUser?.user_id || !paidBookings.length) return;
      
      const reviewsMap = {};
      for (const booking of paidBookings) {
        try {
          const reviewData = await getUserReviewForTour(authUser.user_id, booking.tour_id);
          if (reviewData.success && reviewData.review) {
            reviewsMap[booking.booking_id] = reviewData.review;
          }
        } catch (error) {
          console.error(`Error fetching review for booking ${booking.booking_id}:`, error);
        }
      }
      setBookingReviews(reviewsMap);
    };

    if (paidBookings.length > 0 && authUser?.user_id) {
      fetchBookingReviews();
    }
  }, [paidBookings, authUser?.user_id]);

  // Bookings chưa thanh toán (có payment status = 'unpaid' hoặc chưa có payment)
  const unpaidBookings = useMemo(() => {
    return bookings.filter(booking => {
      const payment = payments.find(p => p.booking_id === booking.booking_id);
      return !payment || payment.status === "unpaid";
    });
  }, [bookings, payments]);

  const handleReview = (booking) => {
    // Chỉ cho phép đánh giá khi payment đã thanh toán
    const payment = payments.find(p => p.booking_id === booking.booking_id);
    if (!payment || payment.status !== "paid") {
      alert("⚠️ Bạn chỉ có thể đánh giá tour sau khi đã thanh toán!");
      return;
    }
    
    setSelectedTourForReview({
      tour_id: booking.tour_id,
      tour_name: booking.tour_name,
    });
    setReviewModalOpen(true);
  };

  // Payment handlers
  const openPaymentModal = (payment) => {
    setCurrentPayment(payment);
    setPayStatus({ text: "⏳ Đang chờ thanh toán...", cls: "text-yellow-500" });
    setModalOpen(true);
  };

  const closePaymentModal = () => {
    setModalOpen(false);
    setCurrentPayment(null);
  };

  const onConfirmPayment = async () => {
    if (!currentPayment) return;
    
    // 🔹 Kiểm tra: phải có ảnh thanh toán trước khi confirm
    if (!currentPayment.uploadFile && !currentPayment.payment_image) {
      alert("⚠️ Vui lòng upload ảnh xác minh thanh toán trước khi gửi xác nhận!");
      return;
    }

    try {
      // Nếu có file mới upload nhưng chưa gửi lên server, upload trước
      if (currentPayment.uploadFile) {
        console.log("📤 Uploading payment image first...");
        await uploadPaymentImage(currentPayment.payment_id, currentPayment.uploadFile);
        console.log("✅ Payment image uploaded");
        // Refresh payment data để có payment_image mới nhất
        await qc.refetchQueries(["payments", authUser?.user_id, authUser?.email]);
      }

      // Kiểm tra lại payment_image sau khi upload (nếu có)
      const updatedPayments = await fetchPayments(authUser?.email, authUser?.user_id);
      const updatedPayment = updatedPayments.find(p => p.payment_id === currentPayment.payment_id);
      
      if (!updatedPayment?.payment_image && !currentPayment.payment_image) {
        alert("⚠️ Vui lòng đợi ảnh được upload xong trước khi gửi xác nhận!");
        return;
      }

      console.log("📝 Confirming payment:", currentPayment.payment_id);
      const result = await confirmPayment(currentPayment.payment_id);
      console.log("✅ Payment confirmed:", result);
      
      setPayStatus({ text: "✅ Đã gửi xác nhận thanh toán! Đang chờ admin duyệt...", cls: "text-blue-600" });
      qc.invalidateQueries(["payments", authUser?.user_id, authUser?.email]);
      qc.invalidateQueries(["userBookings", authUser?.user_id]);
      
      setTimeout(() => {
        closePaymentModal();
        // Không tự động mở invoice vì chưa được admin duyệt
      }, 1500);
    } catch (error) {
      console.error("❌ Error confirming payment:", error);
      alert(`❌ Lỗi khi xác nhận thanh toán!\n\n${error.response?.data?.error || error.message || "Vui lòng thử lại."}`);
    }
  };

  const showInvoice = async (id) => {
    try {
      const data = await fetchInvoice(id);
      setInvoice(data);
      setInvoiceOpen(true);
    } catch {
      alert("Không thể tải hóa đơn");
    }
  };

  const onEditPaymentOpen = (payment) => {
    setEditData({ payment_id: payment.payment_id, method: payment.method || "", amount: payment.amount || 0 });
    setEditOpen(true);
  };

  const onEditPaymentSave = async () => {
    if (!editData.method) return alert("Vui lòng chọn phương thức thanh toán");
    if (Number(editData.amount) <= 0) return alert("Số tiền phải > 0");
    try {
      setSaving(true);
      await updatePayment(editData.payment_id, {
        method: editData.method,
        amount: Number(editData.amount),
      });
      alert("✅ Cập nhật thành công");
      setEditOpen(false);
      qc.invalidateQueries(["payments", authUser?.user_id, authUser?.email]);
    } catch (e) {
      alert("❌ Không thể sửa: " + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const onDeletePayment = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa hóa đơn này?")) return;
    try {
      await deletePayment(id);
      alert("✅ Xóa hóa đơn thành công");
      qc.invalidateQueries(["payments", authUser?.user_id, authUser?.email]);
    } catch (e) {
      alert("❌ Không thể xóa: " + (e.response?.data?.error || e.message));
    }
  };

  // Xác định level dựa trên điểm tích lũy
  const getUserLevel = (lifetimePoints) => {
    const points = lifetimePoints || 0;
    if (points >= 20000) {
      return {
        name: "Kim Cương",
        icon: "💎",
        color: "from-purple-500 to-indigo-600",
        borderColor: "border-purple-400",
        bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
        textColor: "text-purple-700",
        badgeColor: "bg-gradient-to-r from-purple-500 to-indigo-600",
      };
    } else if (points >= 10000) {
      return {
        name: "Vàng",
        icon: "🥇",
        color: "from-yellow-400 to-orange-500",
        borderColor: "border-yellow-400",
        bgColor: "bg-gradient-to-r from-yellow-50 to-orange-50",
        textColor: "text-yellow-700",
        badgeColor: "bg-gradient-to-r from-yellow-400 to-orange-500",
      };
    } else if (points >= 5000) {
      return {
        name: "Bạc",
        icon: "🥈",
        color: "from-gray-400 to-gray-600",
        borderColor: "border-gray-400",
        bgColor: "bg-gradient-to-r from-gray-50 to-slate-50",
        textColor: "text-gray-700",
        badgeColor: "bg-gradient-to-r from-gray-400 to-gray-600",
      };
    } else {
      return {
        name: "Đồng",
        icon: "🥉",
        color: "from-orange-300 to-orange-500",
        borderColor: "border-orange-300",
        bgColor: "bg-gradient-to-r from-orange-50 to-amber-50",
        textColor: "text-orange-700",
        badgeColor: "bg-gradient-to-r from-orange-300 to-orange-500",
      };
    }
  };

  const userLevel = getUserLevel(points.lifetime_points || 0);

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const labels = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-semibold ${
          styles[status] || styles.pending
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-6 py-16 text-center">
          <p className="text-gray-600">Vui lòng đăng nhập để xem thông tin cá nhân.</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-6 py-8">
        {/* Header - Refactored với Level Badge */}
        <div className={`bg-gradient-to-br ${userLevel.bgColor} rounded-2xl shadow-lg p-6 mb-6 border-2 ${userLevel.borderColor}`}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar với border theo level */}
            <div className="relative">
              <img
                src={authUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name || "User")}&background=ff6b35&color=fff&size=128`}
                alt={authUser.name}
                className={`w-24 h-24 rounded-full border-4 ${userLevel.borderColor} shadow-lg object-cover`}
              />
              {/* Level Badge trên avatar */}
              <div className={`absolute -bottom-2 -right-2 ${userLevel.badgeColor} text-white rounded-full p-2 shadow-lg border-2 border-white`}>
                <span className="text-2xl">{userLevel.icon}</span>
              </div>
            </div>

            {/* Thông tin user */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-800">{authUser.name}</h1>
                    {/* Level Badge */}
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold text-white ${userLevel.badgeColor} shadow-md flex items-center gap-1.5`}>
                      <Award className="w-4 h-4" />
                      {userLevel.name}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-1">{authUser.email}</p>
                  <p className="text-sm text-gray-500">{authUser.phone_number}</p>
                </div>

                {/* Điểm tích lũy */}
                <div className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 ${userLevel.borderColor} shadow-md min-w-[200px]`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className={`w-5 h-5 ${userLevel.textColor}`} />
                    <span className={`text-sm font-semibold ${userLevel.textColor}`}>Điểm tích lũy</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${userLevel.textColor}`}>
                      {points.lifetime_points?.toLocaleString() || 0}
                    </span>
                    <span className="text-sm text-gray-500">điểm</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Khả dụng:</span>
                      <span className={`font-semibold ${userLevel.textColor}`}>
                        {points.available_points?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar đến level tiếp theo */}
                  {(() => {
                    const currentPoints = points.lifetime_points || 0;
                    let nextLevel = 5000;
                    let currentLevel = 0;
                    if (currentPoints >= 20000) {
                      nextLevel = Infinity;
                      currentLevel = 20000;
                    } else if (currentPoints >= 10000) {
                      nextLevel = 20000;
                      currentLevel = 10000;
                    } else if (currentPoints >= 5000) {
                      nextLevel = 10000;
                      currentLevel = 5000;
                    } else {
                      nextLevel = 5000;
                      currentLevel = 0;
                    }
                    const progress = nextLevel === Infinity ? 100 : ((currentPoints - currentLevel) / (nextLevel - currentLevel)) * 100;
                    const nextLevelName = nextLevel === Infinity ? "Tối đa" : nextLevel === 20000 ? "Kim Cương" : nextLevel === 10000 ? "Vàng" : "Bạc";
                    
                    return nextLevel !== Infinity ? (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Tiến tới {nextLevelName}</span>
                          <span>{Math.min(progress, 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${userLevel.badgeColor}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Còn {((nextLevel - currentPoints).toLocaleString())} điểm để lên {nextLevelName}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-purple-600 font-semibold">
                          <Sparkles className="w-3 h-3" />
                          Đã đạt level tối đa!
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-2xl shadow-md mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab("bookings");
                navigate("/profile?tab=bookings", { replace: true });
              }}
              className={`px-6 py-4 font-semibold transition-colors border-b-2 ${
                activeTab === "bookings"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-600 hover:text-orange-500"
              }`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Lịch sử đặt tour ({paidBookings.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("payments");
                navigate("/profile?tab=payments", { replace: true });
              }}
              className={`px-6 py-4 font-semibold transition-colors border-b-2 ${
                activeTab === "payments"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-600 hover:text-orange-500"
              }`}
            >
              <CreditCard className="w-5 h-5 inline mr-2" />
              Thanh toán ({unpaidPayments.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("points");
                navigate("/profile?tab=points", { replace: true });
              }}
              className={`px-6 py-4 font-semibold transition-colors border-b-2 ${
                activeTab === "points"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-600 hover:text-orange-500"
              }`}
            >
              <Gift className="w-5 h-5 inline mr-2" />
              Tích điểm
            </button>
            <button
              onClick={() => {
                setActiveTab("reviews");
                navigate("/profile?tab=reviews", { replace: true });
              }}
              className={`px-6 py-4 font-semibold transition-colors border-b-2 ${
                activeTab === "reviews"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-600 hover:text-orange-500"
              }`}
            >
              <MessageSquare className="w-5 h-5 inline mr-2" />
              Đánh giá ({reviews.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          {/* Tab: Lịch sử đặt tour (đã thanh toán) */}
          {activeTab === "bookings" && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Package className="w-6 h-6 text-orange-500" />
                Lịch sử đặt tour ({paidBookings.length})
              </h2>

              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Đang tải...</div>
              ) : isError ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-red-300 mx-auto mb-4" />
                  <p className="text-red-500 text-lg">Lỗi khi tải lịch sử đặt tour.</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {error?.response?.data?.message || error?.message || "Vui lòng thử lại sau."}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    Tải lại
                  </button>
                </div>
              ) : paidBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Bạn chưa có tour nào đã thanh toán.</p>
                  <p className="text-gray-400 text-sm mt-2">Các tour đã thanh toán sẽ hiển thị ở đây.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paidBookings.map((booking) => {
                    const payment = payments.find(p => p.booking_id === booking.booking_id);
                    return (
                      <div
                        key={booking.booking_id}
                        className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
                      >
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Image */}
                          <img
                            src={
                              booking.image_url ||
                              "/src/assets/images/default-tour.jpg"
                            }
                            alt={booking.tour_name}
                            className="w-full md:w-48 h-40 object-cover rounded-lg"
                          />

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-1">
                                  {booking.tour_name}
                                </h3>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {booking.tour_description || "Không có mô tả"}
                                </p>
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                              <div className="flex items-center gap-2 text-gray-700">
                                <Calendar className="w-5 h-5 text-orange-500" />
                                <span className="text-sm">
                                  <strong>Ngày đặt:</strong>{" "}
                                  {formatDate(booking.created_at) || "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-700">
                                <DollarSign className="w-5 h-5 text-orange-500" />
                                <span className="text-sm">
                                  <strong>Tổng tiền:</strong>{" "}
                                  <span className="font-semibold text-orange-600">
                                    {(() => {
                                      // Ưu tiên: payment.amount > booking.payment_amount > booking.total_price
                                      const amount = payment?.amount || booking.payment_amount || booking.total_price || 0;
                                      return Number(amount).toLocaleString("vi-VN") + " VND";
                                    })()}
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-700">
                                <MapPin className="w-5 h-5 text-orange-500" />
                                <span className="text-sm">
                                  <strong>Mã booking:</strong> {booking.booking_id}
                                </span>
                              </div>
                            </div>

                            {/* Đánh giá hiện có (nếu có) */}
                            {bookingReviews[booking.booking_id] && (
                              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-800">Đánh giá của bạn:</h4>
                                    <StarRating 
                                      rating={bookingReviews[booking.booking_id].rating} 
                                      totalReviews={0} 
                                      showReviews={false}
                                      size={18}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(bookingReviews[booking.booking_id].created_at)}
                                  </span>
                                </div>
                                {bookingReviews[booking.booking_id].comment && (
                                  <p className="text-gray-700 text-sm mt-2">
                                    {bookingReviews[booking.booking_id].comment}
                                  </p>
                                )}
                                {bookingReviews[booking.booking_id].updated_at && 
                                 bookingReviews[booking.booking_id].updated_at !== bookingReviews[booking.booking_id].created_at && (
                                  <p className="text-xs text-gray-400 mt-1">(Đã chỉnh sửa)</p>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 mt-4 flex-wrap">
                              <button
                                onClick={() => navigate(`/tours/${booking.tour_id}`)}
                                className="px-4 py-2 border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition font-semibold"
                              >
                                Xem chi tiết tour
                              </button>
                              {payment && (
                                <button
                                  onClick={() => showInvoice(payment.payment_id)}
                                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold flex items-center gap-2"
                                >
                                  <FileText className="w-4 h-4" />
                                  Xem hóa đơn
                                </button>
                              )}
                              {payment?.status === "paid" && (
                                <button
                                  onClick={() => handleReview(booking)}
                                  className={`px-4 py-2 rounded-lg transition font-semibold flex items-center gap-2 ${
                                    bookingReviews[booking.booking_id]
                                      ? "bg-blue-500 text-white hover:bg-blue-600"
                                      : "bg-orange-500 text-white hover:bg-orange-600"
                                  }`}
                                >
                                  <Star className="w-4 h-4" />
                                  {bookingReviews[booking.booking_id] ? "Chỉnh sửa đánh giá" : "Đánh giá tour"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Tab: Thanh toán (chưa thanh toán) */}
          {activeTab === "payments" && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-orange-500" />
                Thanh toán ({unpaidPayments.length})
              </h2>

              {paymentsLoading ? (
                <div className="text-center py-8 text-gray-500">Đang tải...</div>
              ) : unpaidPayments.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Bạn không có hóa đơn nào cần thanh toán.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unpaidPayments.map((payment) => (
                    <div
                      key={payment.payment_id}
                      className="bg-white shadow-md hover:shadow-xl rounded-2xl overflow-hidden transition-all duration-300 border border-gray-100 hover:-translate-y-1"
                    >
                      <img
                        src={payment.image_url || "/src/assets/images/default-tour.jpg"}
                        alt={payment.tour_name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-5">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-lg text-gray-800">
                            {payment.tour_name}
                          </h3>
                          <span className="text-sm px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                            Chưa thanh toán
                          </span>
                        </div>

                        <p className="text-sm text-gray-600">Mã: {payment.payment_id}</p>
                        <p className="text-sm text-gray-600">
                          Số tiền:{" "}
                          <span className="text-orange-500 font-semibold">
                            {Number(payment.amount).toLocaleString("vi-VN")}đ
                          </span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Phương thức: {payment.method || "—"}
                        </p>

                        <div className="flex justify-end gap-2 mt-4">
                          <button
                            onClick={() => openPaymentModal(payment)}
                            className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-1 text-sm"
                          >
                            <QrCode size={14} /> Thanh toán
                          </button>
                          <button
                            onClick={() => onEditPaymentOpen(payment)}
                            className="px-3 py-1 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 flex items-center gap-1 text-sm"
                          >
                            <Edit2 size={14} /> Sửa
                          </button>
                          <button
                            onClick={() => onDeletePayment(payment.payment_id)}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-1 text-sm"
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tab: Tích điểm */}
          {activeTab === "points" && (
            <>
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 mb-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 rounded-full p-4">
                      <Gift className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-1">Điểm tích lũy</h2>
                      <p className="text-orange-100 text-sm">Đặt tour càng nhiều, điểm càng cao!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold mb-1">{points.available_points || 0}</div>
                    <p className="text-orange-100 text-sm">điểm khả dụng</p>
                    {points.lifetime_points > 0 && (
                      <p className="text-orange-200 text-xs mt-1">
                        Tổng đã tích: {points.lifetime_points} điểm
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Recent Transactions */}
                {transactions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-orange-400/30">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Giao dịch gần đây
                    </p>
                    <div className="space-y-2">
                      {transactions.slice(0, 5).map((tx) => (
                        <div key={tx.transaction_id} className="flex justify-between items-center text-sm bg-white/10 rounded-lg p-2">
                          <span className="text-orange-100">{tx.description || 'Giao dịch điểm'}</span>
                          <span className={`font-semibold ${tx.points > 0 ? 'text-green-200' : 'text-red-200'}`}>
                            {tx.points > 0 ? '+' : ''}{tx.points} điểm
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Bạn chưa có giao dịch điểm nào.</p>
                </div>
              )}
            </>
          )}

          {/* Tab: Đánh giá */}
          {activeTab === "reviews" && (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-orange-500" />
                Lịch sử đánh giá ({reviews.length})
              </h2>

              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Bạn chưa có đánh giá nào.</p>
                  <p className="text-gray-400 text-sm mt-2">Hãy đánh giá các tour đã hoàn thành để chia sẻ trải nghiệm của bạn!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.review_id}
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {/* Tour Image */}
                        {review.tour_image && (
                          <img
                            src={review.tour_image}
                            alt={review.tour_name}
                            className="w-full md:w-32 h-32 object-cover rounded-lg"
                          />
                        )}

                        {/* Review Content */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-800 mb-2">
                                {review.tour_name || "Tour không xác định"}
                              </h3>
                              <div className="flex items-center gap-3 mb-2">
                                <StarRating 
                                  rating={review.rating} 
                                  totalReviews={0} 
                                  showReviews={false}
                                  size={20}
                                />
                                <span className="text-sm text-gray-600">
                                  {formatDate(review.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {review.comment && (
                            <p className="text-gray-700 mb-3 leading-relaxed">
                              {review.comment}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-4">
                            <button
                              onClick={() => navigate(`/tours/${review.tour_id}`)}
                              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
                            >
                              <MapPin className="w-4 h-4" />
                              Xem tour
                            </button>
                            {review.updated_at && review.updated_at !== review.created_at && (
                              <span className="text-xs text-gray-400">
                                (Đã chỉnh sửa)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedTourForReview && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedTourForReview(null);
            // Refresh reviews sau khi đóng modal
            if (authUser?.user_id) {
              const booking = paidBookings.find(b => b.tour_id === selectedTourForReview.tour_id);
              if (booking) {
                getUserReviewForTour(authUser.user_id, selectedTourForReview.tour_id)
                  .then(reviewData => {
                    if (reviewData.success && reviewData.review) {
                      setBookingReviews(prev => ({
                        ...prev,
                        [booking.booking_id]: reviewData.review
                      }));
                    } else {
                      // Nếu xóa review, remove khỏi state
                      setBookingReviews(prev => {
                        const newState = { ...prev };
                        delete newState[booking.booking_id];
                        return newState;
                      });
                    }
                  })
                  .catch(err => console.error("Error refreshing review:", err));
              }
            }
            // Invalidate queries để refresh data
            qc.invalidateQueries(["userReviews", authUser?.user_id]);
          }}
          tour_id={selectedTourForReview.tour_id}
          user_id={authUser.user_id}
          tour_name={selectedTourForReview.tour_name}
        />
      )}

      {/* Payment Modal - QR Thanh toán */}
      {modalOpen && currentPayment && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-30" onClick={closePaymentModal}></div>
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-md z-10">
            <h3 className="text-lg font-semibold mb-3">Thanh toán QR</h3>
            <p><b>Tour:</b> {currentPayment.tour_name}</p>
            <p><b>Số tiền:</b> {Number(currentPayment.amount).toLocaleString("vi-VN")}đ</p>

            <div className="qr my-4 flex justify-center">
              <img
                src={`https://img.vietqr.io/image/970436-9392723042-qr_only.png?amount=${currentPayment.amount}&addInfo=ThanhToan_${currentPayment.payment_id}`}
                alt="QR"
                className="rounded shadow-md"
              />
            </div>

            <label className="block text-sm font-medium mb-1">📷 Ảnh xác minh thanh toán:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setCurrentPayment((prev) => ({ ...prev, uploadFile: e.target.files?.[0] || null }))
              }
              className="border p-2 rounded w-full"
            />
            {currentPayment.uploadFile && (
              <div className="mt-2 flex justify-center">
                <img
                  src={URL.createObjectURL(currentPayment.uploadFile)}
                  alt="preview"
                  className="w-32 h-32 rounded border object-cover"
                />
              </div>
            )}
            <button
              className="w-full mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
              onClick={async () => {
                if (!currentPayment.uploadFile) return alert("Vui lòng chọn ảnh thanh toán!");
                try {
                  const result = await uploadPaymentImage(currentPayment.payment_id, currentPayment.uploadFile);
                  setPayStatus({ text: "✅ Ảnh đã gửi thành công! Bấm nút bên dưới để gửi xác nhận.", cls: "text-green-600" });
                  // Refresh payment data để cập nhật payment_image
                  await qc.refetchQueries(["payments", authUser?.user_id, authUser?.email]);
                  // Cập nhật currentPayment với payment_image từ server
                  const updatedPayments = await fetchPayments(authUser?.email, authUser?.user_id);
                  const updatedPayment = updatedPayments.find(p => p.payment_id === currentPayment.payment_id);
                  if (updatedPayment) {
                    setCurrentPayment(prev => ({ ...prev, payment_image: updatedPayment.payment_image }));
                  }
                } catch (error) {
                  console.error("Error uploading image:", error);
                  alert("❌ Lỗi khi tải ảnh lên!");
                }
              }}
            >
              📤 Gửi ảnh xác minh
            </button>
            <button 
              className="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={onConfirmPayment}
              disabled={!currentPayment.uploadFile && !currentPayment.payment_image}
            >
              ✅ Gửi xác nhận thanh toán (Chờ admin duyệt)
            </button>
            {!currentPayment.uploadFile && !currentPayment.payment_image && (
              <p className="text-xs text-red-500 mt-1 text-center">
                ⚠️ Vui lòng upload ảnh thanh toán trước
              </p>
            )}
            {payStatus.text && <div className={`mt-2 text-sm ${payStatus.cls}`}>{payStatus.text}</div>}
          </div>
        </div>
      )}

      {/* Modal Sửa thanh toán */}
      {editOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black opacity-30"
            onClick={() => setEditOpen(false)}
          ></div>
          <div className="bg-white rounded-lg shadow p-6 w-full max-w-md z-10">
            <h3 className="text-lg font-semibold mb-3">✏️ Sửa thanh toán</h3>

            {/* Phương thức thanh toán */}
            <label className="block font-medium mb-1">Phương thức thanh toán</label>
            <select
              className="w-full border rounded px-2 py-1 mb-3"
              value={editData.method}
              onChange={(e) =>
                setEditData((d) => ({ ...d, method: e.target.value }))
              }
            >
              <option value="">-- Chọn phương thức --</option>
              <option value="cash">Tiền mặt</option>
              <option value="card">Thẻ</option>
              <option value="online">Chuyển khoản / QR</option>
            </select>

            {/* Số tiền (chỉ xem, không sửa) */}
            <label className="block font-medium mb-1">Số tiền (không thể chỉnh)</label>
            <input
              type="text"
              value={Number(editData.amount).toLocaleString("vi-VN") + "đ"}
              readOnly
              className="border rounded px-2 py-1 w-full bg-gray-100 text-gray-500 cursor-not-allowed"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                onClick={() => setEditOpen(false)}
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                onClick={onEditPaymentSave}
                disabled={saving}
              >
                {saving ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal In hóa đơn */}
      {invoiceOpen && invoice && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black opacity-30"
            onClick={() => setInvoiceOpen(false)}
          ></div>

          <div
            id="invoicePrintArea"
            className="bg-white rounded-lg shadow-lg p-10 w-full max-w-3xl z-10"
          >
            {/* HEADER - LOGO & BRAND */}
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <div className="flex items-center gap-3">
                <img
                  src="/src/assets/images/Logo2.png"
                  alt="AI-Travel Logo"
                  className="w-16 h-16 object-contain"
                />
                <div>
                  <h1 className="text-2xl font-bold text-orange-600">AI-TRAVEL</h1>
                  <p className="text-sm text-gray-600">
                    Công ty TNHH Du Lịch AI Travel<br />
                    <span className="text-gray-500">Hotline: 1900 1999</span>
                  </p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p><b>Ngày in:</b> {new Date().toLocaleDateString("vi-VN")}</p>
                <p><b>Mã hóa đơn:</b> {invoice.payment_id}</p>
              </div>
            </div>

            {/* THÔNG TIN KHÁCH HÀNG */}
            <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
              <div>
                <h2 className="text-lg font-semibold mb-2 text-orange-600">
                  👤 Thông tin khách hàng
                </h2>
                <p><b>Tên:</b> {invoice.customer_name || authUser?.name}</p>
                <p><b>Email:</b> {invoice.email || authUser?.email}</p>
                <p><b>Số điện thoại:</b> {invoice.phone_number || "—"}</p>
                <p><b>Phương thức:</b> {invoice.method}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2 text-orange-600">
                  🧭 Thông tin Tour
                </h2>
                <p><b>Tên tour:</b> {invoice.tour_name}</p>
                <p><b>Thời gian:</b> {invoice.start_date} → {invoice.end_date}</p>
                <p><b>Nhà cung cấp:</b> {invoice.provider_name}</p>
                <p><b>Email NCC:</b> {invoice.provider_email}</p>
              </div>
            </div>

            {/* TỔNG THANH TOÁN */}
            <div className="border-t border-b py-3 mb-4 text-center">
              <p className="text-lg font-bold">
                Tổng thanh toán:{" "}
                <span className="text-orange-600">
                  {Number(invoice.amount).toLocaleString("vi-VN")}đ
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Trạng thái:{" "}
                {invoice.status === "paid"
                  ? "✅ Đã thanh toán"
                  : "💳 Chưa thanh toán"}
              </p>
            </div>

            {/* KÝ TÊN */}
            <div className="grid grid-cols-2 text-center text-sm mt-8">
              <div>
                <b>Khách hàng</b>
                <p>(Ký và ghi rõ họ tên)</p>
                <div className="h-16"></div>
                <p>{invoice.customer_name || authUser?.name}</p>
              </div>
              <div>
                <b>Đại diện AI Travel</b>
                <p>(Ký tên, đóng dấu)</p>
                <div className="h-16"></div>
                <p>Nguyễn Văn Quang</p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="text-center text-xs text-gray-500 mt-8">
              <p>Ngày xác nhận: {new Date(invoice.updated_at).toLocaleString("vi-VN")}</p>
              <p>Địa chỉ: 123 Trần Phú, Đà Nẵng | Website: www.aitravel.vn</p>
            </div>

            <div className="text-center mt-6 no-print">
              <button
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                onClick={() => window.print()}
              >
                🖨️ In hóa đơn (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

