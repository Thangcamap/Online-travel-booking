import React, { useState } from "react";
import { Camera, X } from "lucide-react";
import { cn } from "@/utils/cn";

const ImagePreview = React.forwardRef(({ value, onChange, name, aspectRatio = "avatar", className, ...props }, ref) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleImageChange = (file) => {
    onChange(name, file);
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleImageChange(file);
      event.target.value = null;
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      handleImageChange(file);
    }
  };

  const removeImage = () => {
    onChange(name, null);
  };

  const aspectClasses = {
    square: "aspect-square rounded-md",
    cover: "aspect-[4/1] rounded-md",
    banner: "aspect-[16/9] rounded-md",
    avatar: "aspect-square rounded-full",
  };

  return (
    <div className={cn("max-w-32", className)} {...props}>
      <div className="w-full relative">
        <label
          htmlFor={`image-upload-${name}`}
          className={cn(
            "flex w-full cursor-pointer items-center justify-center overflow-hidden relative border border-gray-300 bg-white transition hover:opacity-80",
            aspectClasses[aspectRatio],
            isDragging && "border-2 border-primary",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            id={`image-upload-${name}`}
            ref={ref}
          />
          {value ? (
            <img
              src={value}
              alt={`preview-${name}`}
              className={cn("w-full h-full object-cover", aspectRatio === "avatar" && "rounded-full")}
            />
          ) : (
            <div className="text-center">
              <Camera className="text-gray-400 w-[15%] h-[15%] mx-auto" />
              <span className="text-gray-500 text-sm block">Ấn hoặc kéo thả để tải ảnh lên</span>
            </div>
          )}
        </label>

        {value && (
          <button
            onClick={removeImage}
            className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
});

ImagePreview.displayName = "ImagePreview";

export { ImagePreview };
