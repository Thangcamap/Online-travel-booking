import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axios from "axios";
import { deleteTour, updateTour } from "../api/tours-api";

export default function TourManagement({ providerId, tours = [], refresh }) {
  const [tourImages, setTourImages] = useState({});
  const [selectedTour, setSelectedTour] = useState(null);
  const [editingTour, setEditingTour] = useState(null);
  const [newImages, setNewImages] = useState([]);
  const [days, setDays] = useState(0);
  const [itinerary, setItinerary] = useState([]);
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const allImages = {};
    for (const t of tours) {
      allImages[t.tour_id] = t.images || [];
    }
    setTourImages(allImages);
  }, [tours]);

  // 🟢 Tính số ngày khi chọn ngày bắt đầu / kết thúc
  useEffect(() => {
    if (editingTour?.start_date && editingTour?.end_date) {
      const start = new Date(editingTour.start_date);
      const end = new Date(editingTour.end_date);
      const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) {
        setDays(diff);
        setItinerary(
          Array.from({ length: diff }, (_, i) => ({
            day: i + 1,
            plan: itinerary[i]?.plan || "",
          }))
        );
      } else {
        setDays(0);
        setItinerary([]);
      }
    }
  }, [editingTour?.start_date, editingTour?.end_date]);

  const handleDelete = async (tourId) => {
    if (!window.confirm("Bạn có chắc muốn xóa tour này?")) return;
    await deleteTour(tourId, providerId);
    refresh();
  };

  // 🟢 Mở modal chỉnh sửa tour
  const openEditDialog = (tour) => {
    setEditingTour({ ...tour });
    setNewImages([]);
    // nạp lịch trình nếu có
    try {
      const parsed = tour.itinerary ? JSON.parse(tour.itinerary) : [];
      setItinerary(parsed);
    } catch {
      setItinerary([]);
    }
  };

  // 🟢 Thay đổi dữ liệu trong form
  const handleChange = (field, value) => {
    setEditingTour((prev) => ({ ...prev, [field]: value }));
  };

  // 🟢 Cập nhật từng ngày trong lịch trình
  const handleItineraryChange = (index, value) => {
    const updated = [...itinerary];
    updated[index].plan = value;
    setItinerary(updated);
  };

  // 🟢 Chọn ảnh mới
  const handleImageChange = (e) => {
    setNewImages(Array.from(e.target.files));
  };

  // 🟢 Lưu thay đổi tour (bao gồm lịch trình)
  const handleSave = async () => {
    try {
      await updateTour(editingTour.tour_id, {
        ...editingTour,
        provider_id: providerId,
        itinerary,
      });

      // Upload ảnh mới
      for (const file of newImages) {
        const formData = new FormData();
        formData.append("image", file);
        await axios.post(
          `${baseURL}/api/tours/${editingTour.tour_id}/upload-image`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      alert("✅ Cập nhật tour thành công!");
      setEditingTour(null);
      refresh();
    } catch (err) {
      console.error("Lỗi cập nhật tour:", err);
      alert("❌ Lỗi khi lưu tour!");
    }
  };

  // 🟢 Xóa ảnh cũ
  const handleRemoveOldImage = async (index) => {
    const tourId = editingTour.tour_id;
    const current = tourImages[tourId] || [];
    const toRemove = current[index];
    if (!window.confirm("Xóa ảnh này?")) return;

    try {
      await axios.delete(`${baseURL}/api/tours/${tourId}/images`, {
        data: { image_url: toRemove.image_url || toRemove },
      });

      setTourImages((prev) => ({
        ...prev,
        [tourId]: prev[tourId].filter((_, i) => i !== index),
      }));
    } catch (err) {
      console.error("❌ Lỗi khi xóa ảnh:", err);
      alert("Lỗi khi xóa ảnh!");
    }
  };

  const getImageUrls = (tourId) => {
    const images = tourImages[tourId];
    if (!images || images.length === 0) return [];
    return images.map((img) => {
      const url = typeof img === "string" ? img : img?.image_url || "";
      return url.startsWith("http")
        ? url
        : `${baseURL}/${url.replace(/^\//, "")}`;
    });
  };

  return (
    <div>
      {/* Bảng danh sách tour */}
      {tours.length === 0 ? (
        <p className="text-gray-500">Chưa có tour nào.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ảnh</TableHead>
                <TableHead>Tên tour</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Ngày bắt đầu</TableHead>
                <TableHead>Ngày kết thúc</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours.map((t) => {
                const firstImage = getImageUrls(t.tour_id)[0];
                return (
                  <TableRow
                    key={t.tour_id}
                    onClick={() => setSelectedTour(t)}
                    className="cursor-pointer hover:bg-gray-100 transition"
                  >
                    <TableCell>
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={t.name}
                          className="w-20 h-16 object-cover rounded border"
                        />
                      ) : (
                        <span className="text-gray-400 italic">
                          Chưa có ảnh
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>
                      {Number(t.price).toLocaleString()} đ
                    </TableCell>
                    <TableCell>{t.start_date?.split("T")[0]}</TableCell>
                    <TableCell>{t.end_date?.split("T")[0]}</TableCell>
                    <TableCell>
                      {t.available ? (
                        <span className="text-green-600 font-semibold">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="text-gray-500">Ngừng</span>
                      )}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(t);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t.tour_id);
                        }}
                      >
                        Xóa
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 🟢 Modal xem chi tiết */}
      <Dialog open={!!selectedTour} onOpenChange={() => setSelectedTour(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTour && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTour.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p><strong>Mô tả:</strong> {selectedTour.description}</p>
                <p><strong>Giá:</strong> {Number(selectedTour.price).toLocaleString()} đ</p>
                <p><strong>Số chỗ:</strong> {selectedTour.available_slots}</p>
                <p>
                  <strong>Thời gian:</strong>{" "}
                  {selectedTour.start_date?.split("T")[0]} →{" "}
                  {selectedTour.end_date?.split("T")[0]}
                </p>

                {/* 🗓️ Hiển thị lịch trình */}
                {selectedTour.itinerary ? (
                  <div className="bg-orange-50 p-3 rounded-md">
                    <p className="font-semibold text-orange-700 mb-2">
                      Lịch trình chi tiết
                    </p>
                    {JSON.parse(selectedTour.itinerary).map((day, i) => (
                      <p key={i}>
                        <strong>Ngày {day.day}:</strong> {day.plan}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">Chưa có lịch trình</p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4">
                  {getImageUrls(selectedTour.tour_id).length > 0 ? (
                    getImageUrls(selectedTour.tour_id).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`tour-${i}`}
                        className="w-full h-28 object-cover rounded border"
                      />
                    ))
                  ) : (
                    <p className="text-gray-400 italic">Chưa có ảnh</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 🟢 Modal chỉnh sửa tour (có lịch trình) */}
      <Dialog open={!!editingTour} onOpenChange={() => setEditingTour(null)}>
        <DialogContent className="max-w-3xl">
          {editingTour && (
            <>
              <DialogHeader>
                <DialogTitle>Chỉnh sửa tour</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Tên tour</label>
                  <Input
                    value={editingTour.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <label>Giá (VND)</label>
                  <Input
                    type="number"
                    value={editingTour.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                  />
                </div>
                <div>
                  <label>Ngày bắt đầu</label>
                  <Input
                    type="date"
                    value={editingTour.start_date?.split("T")[0]}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                  />
                </div>
                <div>
                  <label>Ngày kết thúc</label>
                  <Input
                    type="date"
                    value={editingTour.end_date?.split("T")[0]}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                  />
                </div>
                <div>
                  <label>Số chỗ</label>
                  <Input
                    type="number"
                    value={editingTour.available_slots}
                    onChange={(e) =>
                      handleChange("available_slots", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label>Trạng thái</label>
                  <select
                    className="border rounded p-2 w-full"
                    value={editingTour.available ? "true" : "false"}
                    onChange={(e) =>
                      handleChange("available", e.target.value === "true")
                    }
                  >
                    <option value="true">Hoạt động</option>
                    <option value="false">Ngừng</option>
                  </select>
                </div>

                {/* Lịch trình */}
                {days > 0 && (
                  <div className="col-span-2">
                    <label className="font-semibold text-orange-700">
                      Lịch trình ({days} ngày)
                    </label>
                    <div className="space-y-2 mt-2">
                      {itinerary.map((day, i) => (
                        <div
                          key={i}
                          className="bg-orange-50 p-2 rounded border border-orange-200"
                        >
                          <p className="font-medium text-orange-700">
                            Ngày {day.day}
                          </p>
                          <Textarea
                            rows={2}
                            value={day.plan}
                            placeholder={`Hoạt động ngày ${day.day}...`}
                            onChange={(e) =>
                              handleItineraryChange(i, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ảnh hiện tại */}
                <div className="col-span-2">
                  <label>Ảnh hiện tại</label>
                  {tourImages[editingTour.tour_id]?.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tourImages[editingTour.tour_id].map((img, i) => {
                        const url =
                          typeof img === "string"
                            ? img
                            : img.image_url || img.url || "";
                        const fullUrl = url.startsWith("http")
                          ? url
                          : `${baseURL}/${url.replace(/^\//, "")}`;
                        return (
                          <div key={i} className="relative">
                            <img
                              src={fullUrl}
                              alt={`tour-${i}`}
                              className="w-24 h-20 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOldImage(i)}
                              className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic mt-2">
                      Chưa có ảnh
                    </p>
                  )}
                </div>

                {/* Ảnh mới */}
                <div className="col-span-2 mt-2">
                  <label>Thêm ảnh mới</label>
                  <Input type="file" multiple onChange={handleImageChange} />
                  {newImages.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {newImages.length} ảnh được chọn
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <label>Mô tả</label>
                  <Textarea
                    rows={4}
                    value={editingTour.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <Button variant="outline" onClick={() => setEditingTour(null)}>
                  Hủy
                </Button>
                <Button onClick={handleSave}>Lưu thay đổi</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
