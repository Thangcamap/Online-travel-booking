import { useState, useEffect } from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import Navbar from "@/components/Navbar";
import useAuthUserStore from "@/stores/useAuthUserStore";

import {
  Gift,
  MessageSquare,
  Award,
  CreditCard,
} from "lucide-react";

import {
  getUserPoints,
  getPointTransactions,
} from "@/features/points/api/points-api";

import {
  getUserReviews,
} from "@/features/reviews/api/reviews-api";

import StarRating from "@/components/StarRating";

/* ===================== Helpers ===================== */
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN");
};

/* ===================== Component ===================== */
const ProfilePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { authUser } = useAuthUserStore();

  /* ===================== TAB ===================== */
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    ["points", "reviews"].includes(tabFromUrl) ? tabFromUrl : "points"
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (["points", "reviews"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  /* ===================== QUERIES ===================== */
  const { data: pointsData } = useQuery({
    queryKey: ["userPoints", authUser?.user_id],
    queryFn: () => getUserPoints(authUser.user_id),
    enabled: !!authUser?.user_id,
    staleTime: 0,
  });

  const { data: transactionsData } = useQuery({
    queryKey: ["pointTransactions", authUser?.user_id],
    queryFn: () => getPointTransactions(authUser.user_id, 10),
    enabled: !!authUser?.user_id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["userReviews", authUser?.user_id],
    queryFn: () => getUserReviews(authUser.user_id, 50),
    enabled: !!authUser?.user_id,
  });

  /* ===================== DATA ===================== */
  const points = pointsData?.points || {
    available_points: 0,
    lifetime_points: 0,
  };

  const transactions = transactionsData?.transactions || [];
  const reviews = reviewsData?.reviews || [];

  /* ===================== LEVEL ===================== */
  const getUserLevel = (p = 0) => {
    if (p >= 20000) return { name: "Kim Cương", icon: "💎", color: "from-purple-500 to-indigo-600" };
    if (p >= 10000) return { name: "Vàng", icon: "🥇", color: "from-yellow-400 to-orange-500" };
    if (p >= 5000) return { name: "Bạc", icon: "🥈", color: "from-gray-400 to-gray-600" };
    return { name: "Đồng", icon: "🥉", color: "from-orange-300 to-orange-500" };
  };

  const userLevel = getUserLevel(points.lifetime_points);

  /* ===================== AUTH GUARD ===================== */
  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  /* ===================== RENDER ===================== */
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-6 py-8">

        {/* ================= HEADER ================= */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 flex items-center gap-6">
          <img
            src={
              authUser.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name || "User")}&background=ff6b35&color=fff&size=128`
            }
            alt="avatar"
            className="w-24 h-24 rounded-full border-4 border-orange-400"
          />

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800">{authUser.name}</h1>
            <p className="text-gray-600">{authUser.email}</p>

            <span
              className={`inline-flex items-center gap-2 px-4 py-1.5 mt-3 rounded-full text-white bg-gradient-to-r ${userLevel.color}`}
            >
              <Award className="w-4 h-4" />
              {userLevel.icon} {userLevel.name}
            </span>
          </div>

          <button
            onClick={() => navigate("/payments")}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <CreditCard size={18} />
            Thanh toán
          </button>
        </div>

        {/* ================= TABS ================= */}
        <div className="bg-white rounded-xl shadow mb-6 flex overflow-hidden">
          <button
            onClick={() => {
              setActiveTab("points");
              navigate("/profile?tab=points", { replace: true });
            }}
            className={`flex-1 px-6 py-4 font-semibold border-b-2 ${
              activeTab === "points"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-600"
            }`}
          >
            <Gift className="inline w-5 h-5 mr-2" />
            Tích điểm
          </button>

          <button
            onClick={() => {
              setActiveTab("reviews");
              navigate("/profile?tab=reviews", { replace: true });
            }}
            className={`flex-1 px-6 py-4 font-semibold border-b-2 ${
              activeTab === "reviews"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-600"
            }`}
          >
            <MessageSquare className="inline w-5 h-5 mr-2" />
            Đánh giá
          </button>
        </div>

        {/* ================= POINTS ================= */}
        {activeTab === "points" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Điểm tích lũy</h2>

            <p className="text-4xl font-bold text-orange-600 mb-2">
              {points.available_points}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Tổng đã tích: {points.lifetime_points} điểm
            </p>

            {transactions.map((t) => (
              <div
                key={t.transaction_id}
                className="flex justify-between text-sm border-b py-1"
              >
                <span>{t.description || "Giao dịch điểm"}</span>
                <span
                  className={t.points > 0 ? "text-green-600" : "text-red-500"}
                >
                  {t.points > 0 ? "+" : ""}
                  {t.points}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ================= REVIEWS ================= */}
        {activeTab === "reviews" && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              Lịch sử đánh giá ({reviews.length})
            </h2>

            {reviews.map((r) => (
              <div key={r.review_id} className="border rounded-xl p-4 mb-3">
                <div className="flex justify-between mb-1">
                  <StarRating rating={r.rating} showReviews={false} size={18} />
                  <span className="text-xs text-gray-400">
                    {formatDate(r.created_at)}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-700">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
