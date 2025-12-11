import { Star } from "lucide-react";

const StarRating = ({ rating = 0, totalReviews = 0, showReviews = true, size = 16 }) => {
  const numericRating = Math.min(Math.max(parseFloat(rating) || 0, 0), 5); // Clamp between 0-5
  const fullStars = Math.floor(numericRating);
  const hasHalfStar = numericRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          size={size}
          className="fill-yellow-400 text-yellow-400"
        />
      ))}
      
      {/* Half star - simplified approach */}
      {hasHalfStar && (
        <div className="relative inline-block" style={{ width: size, height: size }}>
          <Star
            size={size}
            className="fill-gray-300 text-gray-300 absolute inset-0"
          />
          <div 
            className="absolute inset-0 overflow-hidden" 
            style={{ width: `${50}%` }}
          >
            <Star
              size={size}
              className="fill-yellow-400 text-yellow-400"
            />
          </div>
        </div>
      )}
      
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          size={size}
          className="fill-gray-300 text-gray-300"
        />
      ))}
      
      {/* Rating text and reviews count */}
      {showReviews && (
        <span className="ml-1.5 text-sm text-gray-600">
          <span className="font-semibold">{numericRating.toFixed(1)}</span>
          {totalReviews > 0 && (
            <span className="text-gray-500"> ({totalReviews})</span>
          )}
        </span>
      )}
    </div>
  );
};

export default StarRating;

