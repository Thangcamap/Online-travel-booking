// src/components/TourManager.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImagePreview } from "@/components/ui/image-preview";
import { useMutation } from "@tanstack/react-query";
import { getTours, createTour, deleteTour, uploadTourImage } from "../../management-provied/api/tours-api";

export default function TourManager({ providerId }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    currency: "VND",
    available_slots: "",
    start_date: "",
    end_date: "",
    available: true,
  });

  const [images, setImages] = useState([]);
  const [tours, setTours] = useState([]);

 const loadTours = async () => {
  try {
    const res = await getTours(providerId);
    console.log("🖼️ Dữ liệu tours từ API:", res.data); // 👈 Thêm dòng này
    const data = res.data?.tours ?? res.data;
    setTours(data || []);
    console.log("🧩 Danh sách tour sau khi load:", data);
  } catch (err) {
    console.error("Lỗi tải tour:", err);
  }
};


  useEffect(() => {
    if (providerId) loadTours();
    return () => {
      images.forEach((im) => {
        if (im?.preview) URL.revokeObjectURL(im.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  // Upload nhiều ảnh tuần tự với providerId
  const uploadImagesMutation = useMutation({
    mutationFn: async ({ tourId, files }) => {
      for (const file of files) {
        await uploadTourImage(tourId, file, providerId);
      }
    },
    onSuccess: async () => {
      await loadTours();
      resetForm();
    },
    onError: (err) => {
      console.error("uploadImages error:", err);
      alert("Upload ảnh thất bại. Kiểm tra console.");
    },
  });

const createTourMutation = useMutation({
  mutationFn: createTour,

  onSuccess: async (res, variables, context) => {
  console.log("🟢 createTour onSuccess raw response:", res);
  console.log("📦 res.data:", res.data);
  console.log("📦 res.data.tour:", res.data?.tour);
  console.log("📦 res.data.tours:", res.data?.tours);

  const newTour =
  res?.data?.tour ??
  res?.data?.tours?.[0] ??
  res?.data?.data?.tour ??
  res?.data?.data?.tours?.[0] ??
  null;
  if (!newTour) {
    console.warn("⚠️ API không trả về tour hợp lệ:", res);
    alert("API không trả về tour hợp lệ! Xem log để kiểm tra.");
    return;
  }

  console.log("✅ Tour vừa tạo:", newTour);

  // ✅ Nếu có ảnh, tiến hành upload
  if (newTour?.tour_id && images.some((img) => img?.file)) {
    const files = images.map((i) => i.file).filter(Boolean);
    console.log("🚀 Bắt đầu upload ảnh cho tour:", newTour.tour_id, files);

    try {
      await Promise.all(
        files.map((file) => uploadTourImage(newTour.tour_id, file, providerId))
      );
      console.log("✅ Upload ảnh hoàn tất!");
    } catch (err) {
      console.error("❌ Lỗi upload ảnh:", err);
      alert("Upload ảnh thất bại. Kiểm tra console để biết chi tiết.");
    }
  } else {
    console.log("⚠️ Không có ảnh để upload hoặc thiếu tour_id.");
  }

  await loadTours();
  resetForm();
},


  onError: (err) => {
    console.error("❌ createTour error:", err);
    alert("Tạo tour thất bại. Kiểm tra console để biết chi tiết.");
  },
});


  const deleteTourMutation = useMutation({
    mutationFn: (id) => deleteTour(id, providerId),
    onSuccess: () => loadTours(),
    onError: (err) => {
      console.error("deleteTour error:", err);
      alert("Xóa tour thất bại.");
    },
  });

  const handleImageChange = useCallback((index, file) => {
    setImages((prev) => {
      const newImages = [...prev];
      if (!newImages[index]) newImages[index] = { file: null, preview: null };

      if (newImages[index].preview) {
        try {
          URL.revokeObjectURL(newImages[index].preview);
        } catch {}

      }
      if (file instanceof File) {
        const previewUrl = URL.createObjectURL(file);
        newImages[index] = { file, preview: previewUrl };
      } else {
        newImages[index] = { file: null, preview: null };
      }
      return newImages;
    });
  }, []);

  const handleAddImage = () =>
    setImages((prev) => [...prev, { file: null, preview: null }]);

  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const newImages = [...prev];
      if (newImages[index]?.preview) {
        try {
          URL.revokeObjectURL(newImages[index].preview);
        } catch {}
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  useEffect(() => {
    return () => {
      images.forEach((im) => {
        if (im?.preview) {
          try {
            URL.revokeObjectURL(im.preview);
          } catch {}
        }
      });
    };
  }, [images]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      currency: "VND",
      available_slots: "",
      start_date: "",
      end_date: "",
      available: true,
    });
    images.forEach((im) => {
      if (im?.preview) {
        try {
          URL.revokeObjectURL(im.preview);
        } catch {}
      }
    });
    setImages([]);
  };

  const handleCreate = () => {
    if (!form.name.trim()) return alert("Vui lòng nhập tên tour!");
    if (!form.price || Number(form.price) <= 0)
      return alert("Giá tour không hợp lệ!");
    if (!form.available_slots || Number(form.available_slots) <= 0)
      return alert("Vui lòng nhập số lượng vé (available_slots) > 0!");
    if (!images.some((i) => i?.file)) return alert("Vui lòng chọn ít nhất 1 ảnh!");

    const payload = {
      ...form,
      provider_id: providerId,
      price: Number(form.price),
      available_slots: parseInt(form.available_slots, 10),
      available: !!form.available,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    createTourMutation.mutate(payload);
  };

  const getFirstImageUrl = (tour) => {
    if (!tour?.images || tour.images.length === 0) return null;
    const first = tour.images[0];
    if (typeof first === "string") return first;
    if (first?.image_url) return first.image_url;
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Quản lý Tour</h2>

      {/* Form tạo tour */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label>Tên tour</Label>
          <Input
            placeholder="Nhập tên tour"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <Label>Giá (VND)</Label>
          <Input
            type="number"
            placeholder="Giá tour"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>

        <div>
          <Label>Số lượng vé (available_slots)</Label>
          <Input
            type="number"
            placeholder="Nhập số lượng vé"
            value={form.available_slots}
            onChange={(e) => setForm({ ...form, available_slots: e.target.value })}
          />
        </div>

        <div>
          <Label>Loại tiền</Label>
          <Input
            placeholder="VND / USD"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </div>

        <div>
          <Label>Ngày bắt đầu</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Ngày kết thúc</Label>
          <Input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>

        <div>
          <Label>Trạng thái</Label>
          <div className="flex items-center gap-2 mt-2">
            <Switch
              checked={form.available}
              onCheckedChange={(v) => setForm({ ...form, available: v })}
            />
            <span>{form.available ? "Còn chỗ" : "Hết chỗ"}</span>
          </div>
        </div>

        <div className="col-span-2">
          <Label>Mô tả</Label>
          <Textarea
            placeholder="Mô tả chi tiết tour..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Chọn ảnh tour */}
        <div className="col-span-2 space-y-3">
          <Label>Ảnh Tour</Label>
          <div className="flex flex-wrap gap-4">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <ImagePreview
                  name={`tour-image-${i}`}
                  value={img?.preview}
                  onChange={(name, file) => handleImageChange(i, file)}
                  aspectRatio="cover"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                  onClick={() => handleRemoveImage(i)}
                >
                  ×
                </Button>
              </div>
            ))}

            <Button type="button" onClick={handleAddImage}>
              + Thêm ảnh
            </Button>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <Button
          onClick={handleCreate}
          disabled={
            createTourMutation.isLoading || uploadImagesMutation.isLoading || images.length === 0
          }
        >
          {createTourMutation.isLoading || uploadImagesMutation.isLoading
            ? "Đang tạo..."
            : "Thêm Tour"}
        </Button>
      </div>

      {/* Danh sách tour */}
      <div className="space-y-3">
        {tours.map((tour) => (
          <div
            key={tour.tour_id}
            className="p-4 bg-white border rounded-lg shadow-sm flex justify-between items-center gap-4"
          >
            <div className="flex items-center gap-4">
              {getFirstImageUrl(tour) ? (
                <img
                  src={getFirstImageUrl(tour)}
                  alt={tour.name}
                  className="w-24 h-20 object-cover rounded-md border"
                />
              ) : (
                <div className="w-24 h-20 bg-gray-200 flex items-center justify-center rounded-md text-sm text-gray-500">
                  Không có ảnh
                </div>
              )}

              <div>
                <p className="font-semibold text-lg">{tour.name}</p>
                <p className="text-sm text-gray-500">
                  {tour.price} {tour.currency} • {tour.available_slots ?? tour.quantity} chỗ
                </p>
                <p className="text-sm">
                  {tour.start_date} → {tour.end_date}
                </p>
                <p className={`text-sm ${tour.available ? "text-green-600" : "text-red-500"}`}>
                  {tour.available ? "Còn chỗ" : "Hết chỗ"}
                </p>
              </div>
            </div>

            <Button variant="destructive" onClick={() => deleteTourMutation.mutate(tour.tour_id)}>
              Xóa
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
