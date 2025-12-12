import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import useAuthUserStore from "@/stores/useAuthUserStore";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api-client";
import { Calendar, MapPin, DollarSign, Package, Star, Gift, TrendingUp, MessageSquare } from "lucide-react";
import ReviewModal from "@/features/reviews/components/ReviewModal";
import StarRating from "@/components/StarRating";
import { getUserPoints, getPointTransactions } from "@/features/points/api/points-api";
import { getUserReviews } from "@/features/reviews/api/reviews-api";
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
  const { authUser } = useAuthUserStore();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTourForReview, setSelectedTourForReview] = useState(null);

  // Fetch user bookings
  const { data: bookingsData, isLoading, isError, error } = useQuery({
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

  const handleReview = (booking) => {
    setSelectedTourForReview({
      tour_id: booking.tour_id,
      tour_name: booking.tour_name,
    });
    setReviewModalOpen(true);
  };

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
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4">
            <img
              src={authUser.avatar_url || "https://i.pravatar.cc/100"}
              alt={authUser.name}
              className="w-20 h-20 rounded-full border-4 border-orange-400"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">{authUser.name}</h1>
              <p className="text-gray-600">{authUser.email}</p>
              <p className="text-sm text-gray-500">{authUser.phone_number}</p>
            </div>
          </div>
        </div>

        {/* Points Section */}
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
                {transactions.slice(0, 3).map((tx) => (
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

        {/* Reviews History */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
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
        </div>

        {/* Bookings History */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" />
            Lịch sử đặt tour
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
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Bạn chưa có tour nào được đặt.</p>
              <button
                onClick={() => navigate("/home")}
                className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Khám phá tour
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
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
                              {Number(booking.total_price).toLocaleString()} VND
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

                      {/* Actions */}
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => navigate(`/tours/${booking.tour_id}`)}
                          className="px-4 py-2 border border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition font-semibold"
                        >
                          Xem chi tiết tour
                        </button>
                        {booking.status === "completed" && (
                          <button
                            onClick={() => handleReview(booking)}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-semibold flex items-center gap-2"
                          >
                            <Star className="w-4 h-4" />
                            Đánh giá tour
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
          }}
          tour_id={selectedTourForReview.tour_id}
          user_id={authUser.user_id}
          tour_name={selectedTourForReview.tour_name}
        />
      )}
    </div>
  );
};

export default ProfilePage;

