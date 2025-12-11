import { useState, useEffect } from "react";
import { X, Star } from "lucide-react";
import { createReview, getUserReviewForTour } from "../api/reviews-api";
import { useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";

const ReviewModal = ({ isOpen, onClose, tour_id, user_id, tour_name }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Load existing review if any
  useEffect(() => {
    if (isOpen && user_id && tour_id) {
      getUserReviewForTour(user_id, tour_id).then((res) => {
        if (res.success && res.review) {
          setRating(res.review.rating || 0);
          setComment(res.review.comment || "");
        }
      });
    }
  }, [isOpen, user_id, tour_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      Swal.fire({
        icon: "warning",
        title: "Vui lòng chọn số sao!",
        text: "Bạn cần đánh giá ít nhất 1 sao.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Submitting review:", { user_id, tour_id, rating, comment });
      
      const result = await createReview({
        user_id,
        tour_id,
        rating,
        comment: comment.trim() || null,
      });

      console.log("Review response:", result);

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Thành công!",
          text: result.message || "Đánh giá của bạn đã được gửi.",
          timer: 2000,
          showConfirmButton: false,
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["tourReviews", tour_id] });
        queryClient.invalidateQueries({ queryKey: ["tour", tour_id] });
        queryClient.invalidateQueries({ queryKey: ["allTours"] });

        // Reset form
        setRating(0);
        setComment("");
        onClose();
      } else {
        throw new Error(result.message || "Không thể gửi đánh giá.");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      const errorMessage = 
        error.response?.data?.message || 
        error.message || 
        "Không thể gửi đánh giá. Vui lòng thử lại.";
      
      Swal.fire({
        icon: "error",
        title: "Lỗi!",
        text: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Đánh giá tour</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <p className="text-lg font-semibold text-gray-700 mb-2">{tour_name}</p>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Đánh giá của bạn *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-gray-300 text-gray-300"
                    }
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-lg font-semibold text-gray-700">
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nhận xét (tùy chọn)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về tour này..."
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;

