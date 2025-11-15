import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ImageSlider = ({ images = [] }) => {
  const [index, setIndex] = useState(0);

  if (!images.length) return null;

  const prev = () => setIndex(index === 0 ? images.length - 1 : index - 1);
  const next = () => setIndex(index === images.length - 1 ? 0 : index + 1);

  return (
    <div className="w-full relative">
      {/* Main Image */}
      <div className="w-full h-[420px] overflow-hidden rounded-xl shadow-lg relative">
        <img
          src={images[index]}
          alt="slider"
          className="w-full h-full object-cover transition-all duration-300"
        />

        {/* Navigation buttons */}
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white shadow p-2 rounded-full"
          onClick={prev}
        >
          <ChevronLeft />
        </button>
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white shadow p-2 rounded-full"
          onClick={next}
        >
          <ChevronRight />
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-3 overflow-x-auto mt-4 pb-2">
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            onClick={() => setIndex(i)}
            className={`h-20 w-32 object-cover rounded-lg cursor-pointer border-2 duration-200 ${
              index === i ? "border-orange-500" : "border-transparent hover:border-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageSlider;
