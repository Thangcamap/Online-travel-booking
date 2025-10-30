"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2 } from "lucide-react";
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
import { deleteTour, updateTour, updateTourItinerary } from "../api/tours-api";

export default function TourManagement({ providerId, tours = [], refresh }) {
  const [tourImages, setTourImages] = useState({});
  const [selectedTour, setSelectedTour] = useState(null);
  const [editingTour, setEditingTour] = useState(null);
  const [newImages, setNewImages] = useState([]);
  const [days, setDays] = useState(0);
  const [itinerary, setItinerary] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    const allImages = {};
    for (const t of tours) {
      allImages[t.tour_id] = t.images || [];
    }
    setTourImages(allImages);
  }, [tours]);

  // Khi editingTour thay đổi start/end => tính lại days + itinerary
  useEffect(() => {
    const startVal = editingTour?.start_date;
    const endVal = editingTour?.end_date;
    if (startVal && endVal) {
      const start = new Date(startVal);
      const end = new Date(endVal);
      const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) {
        setDays(diff);
        setItinerary((prev) => {
          // tạo array mới, giữ nguyên nội dung cũ nếu có
          return Array.from({ length: diff }, (_, i) => {
            const existing = prev[i] || {};
            return {
              day: i + 1,
              plan: existing.plan || existing.description || "",
              title: existing.title || "",
            };
          });
        });
        return;
      }
    }
    setDays(0);
    setItinerary([]);
  }, [editingTour?.start_date, editingTour?.end_date]);

  const handleDelete = async (tourId) => {
    if (!window.confirm("Bạn có chắc muốn xóa tour này?")) return;
    try {
      await deleteTour(tourId, providerId);
      refresh();
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại, thử lại.");
    }
  };

  const openEditDialog = (tour) => {
    setEditingTour({ ...tour });
    setNewImages([]);
    // parse itinerary nếu cần
    let parsed = [];
    if (Array.isArray(tour.itinerary)) parsed = tour.itinerary;
    else if (typeof tour.itinerary === "string" && tour.itinerary.trim() !== "") {
      try {
        parsed = JSON.parse(tour.itinerary);
      } catch {
        parsed = [];
      }
    }
    setItinerary(parsed);
    // set days based on start/end (useEffect sẽ chạy và điều chỉnh)
  };

  const handleChange = (field, value) => {
    setEditingTour((prev) => ({ ...prev, [field]: value }));
  };

  const handleItineraryChange = (index, value) => {
    setItinerary((prev) => {
      const next = [...prev];
      next[index] = { ...(next[index] || {}), plan: value, day: next[index]?.day || index + 1 };
      return next;
    });
  };

  const handleImageChange = (e) => {
    setNewImages(Array.from(e.target.files || []));
  };

  const handleSave = async () => {
    if (!editingTour) return;
    setIsSaving(true);
    try {
      // Update tour basic
      await updateTour(editingTour.tour_id, {
        ...editingTour,
        provider_id: providerId,
      });

      // Normalize itinerary
      const normalizedItinerary = itinerary.map((item, i) => ({
        day_number: item.day || item.day_number || i + 1,
        title: item.title || item.title || "",
        description: item.plan || item.description || "",
      }));

      await updateTourItinerary(editingTour.tour_id, normalizedItinerary);

      // Upload images sequentially (or you can parallelize)
      for (const file of newImages) {
        const formData = new FormData();
        formData.append("image", file);
        await axios.post(
          `${baseURL}/api/tours/${editingTour.tour_id}/upload-image`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      alert("✅ Cập nhật thành công!");
      setEditingTour(null);
      refresh();
    } catch (err) {
      console.error("Lưu thất bại:", err);
      alert("❌ Lỗi khi lưu tour. Kiểm tra console.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveOldImage = async (index) => {
    if (!editingTour) return;
    const tourId = editingTour.tour_id;
    const current = tourImages[tourId] || [];
    const toRemove = current[index];
    if (!window.confirm("Xác nhận xóa ảnh?")) return;

    try {
      await axios.delete(`${baseURL}/api/tours/${tourId}/images`, {
        data: { image_url: toRemove.image_url || toRemove },
      });
      setTourImages((prev) => ({
        ...prev,
        [tourId]: prev[tourId].filter((_, i) => i !== index),
      }));
    } catch (err) {
      console.error(err);
      alert("Xóa ảnh thất bại");
    }
  };

  const getImageUrls = (tourId) => {
    const images = tourImages[tourId];
    if (!images || images.length === 0) return [];
    return images.map((img) => {
      const url = typeof img === "string" ? img : img?.image_url || "";
      return url.startsWith("http") ? url : `${baseURL}/${url.replace(/^\//, "")}`;
    });
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
      {tours.length === 0 ? (
        <p className="text-gray-500">Chưa có tour nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <Table>
            <TableHeader className="bg-orange-50">
              <TableRow>
                <TableHead>Ảnh</TableHead>
                <TableHead>Tên tour</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Ngày bắt đầu</TableHead>
                <TableHead>Ngày kết thúc</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours.map((t) => {
                const firstImage = getImageUrls(t.tour_id)[0];
                return (
                  <TableRow
                    key={t.tour_id}
                    onClick={() => setSelectedTour(t)}
                    className="cursor-pointer hover:bg-orange-50 transition"
                  >
                    <TableCell>
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={t.name}
                          className="w-20 h-16 object-cover rounded-md border"
                        />
                      ) : (
                        <span className="text-gray-400 italic">Chưa có ảnh</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-orange-600 font-semibold">
                      {Number(t.price).toLocaleString()} đ
                    </TableCell>
                    <TableCell>{t.start_date?.split("T")[0] || ""}</TableCell>
                    <TableCell>{t.end_date?.split("T")[0] || ""}</TableCell>
                    <TableCell>
                      {t.available ? (
                        <span className="text-green-600 font-semibold">Hoạt động</span>
                      ) : (
                        <span className="text-gray-500">Ngừng</span>
                      )}
                    </TableCell>
                    <TableCell className="flex gap-2 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(t);
                        }}
                        className="text-orange-600 hover:bg-orange-100"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t.tour_id);
                        }}
                        className="text-red-600 hover:bg-red-100"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedTour} onOpenChange={() => setSelectedTour(null)}>
        <DialogContent className="mx-auto my-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white border border-gray-200 rounded-xl z-[9999] p-6">
          {selectedTour && (
            <>
              <DialogHeader>
                <DialogTitle className="text-orange-700 font-semibold">
                  {selectedTour.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-gray-700">
                <p><strong>Mô tả:</strong> {selectedTour.description}</p>
                <p><strong>Giá:</strong> {Number(selectedTour.price).toLocaleString()} đ</p>
                <p><strong>Số chỗ:</strong> {selectedTour.available_slots}</p>
                <p>
                  <strong>Thời gian:</strong>{" "}
                  {selectedTour.start_date?.split("T")[0] || ""} → {selectedTour.end_date?.split("T")[0] || ""}
                </p>

                {selectedTour.itinerary?.length > 0 ? (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <p className="font-semibold text-orange-700 mb-2">Lịch trình chi tiết</p>
                    {selectedTour.itinerary.map((day, i) => (
                      <p key={i}><strong>Ngày {day.day}:</strong> {day.plan}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">Chưa có lịch trình</p>
                )}

                <div className="grid grid-cols-3 gap-2 mt-4">
                  {getImageUrls(selectedTour.tour_id).length > 0 ? (
                    getImageUrls(selectedTour.tour_id).map((url, i) => (
                      <img key={i} src={url} alt={`tour-${i}`} className="w-full h-28 object-cover rounded border" />
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

      {/* Edit dialog */}
      <Dialog open={!!editingTour} onOpenChange={() => setEditingTour(null)}>
        <DialogContent className="mx-auto my-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white border border-gray-200 rounded-xl z-[9999] p-6 shadow-md">
          {editingTour && (
            <>
              <DialogHeader>
                <DialogTitle className="text-orange-700 font-semibold">Chỉnh sửa tour</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium">Tên tour</label>
                  <Input
                    value={editingTour.name ?? ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-medium">Giá (VND)</label>
                  <Input
                    type="number"
                    value={editingTour.price ?? ""}
                    onChange={(e) => handleChange("price", e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-medium">Ngày bắt đầu</label>
                  <Input
                    type="date"
                    value={editingTour.start_date ? editingTour.start_date.split("T")[0] : ""}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-medium">Ngày kết thúc</label>
                  <Input
                    type="date"
                    value={editingTour.end_date ? editingTour.end_date.split("T")[0] : ""}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-medium">Số chỗ</label>
                  <Input
                    type="number"
                    value={editingTour.available_slots ?? ""}
                    onChange={(e) => handleChange("available_slots", e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-medium">Trạng thái</label>
                  <select
                    className="border rounded p-2 w-full"
                    value={editingTour.available ? "true" : "false"}
                    onChange={(e) => handleChange("available", e.target.value === "true")}
                  >
                    <option value="true">Hoạt động</option>
                    <option value="false">Ngừng</option>
                  </select>
                </div>

                {days > 0 && (
                  <div className="col-span-2">
                    <label className="font-semibold text-orange-700">Lịch trình ({days} ngày)</label>
                    <div className="space-y-2 mt-2">
                      {Array.from({ length: days }).map((_, i) => (
                        <div key={i} className="bg-orange-50 p-2 rounded border border-orange-200">
                          <p className="font-medium text-orange-700">Ngày {i + 1}</p>
                          <Textarea
                            rows={2}
                            value={itinerary[i]?.plan ?? ""}
                            placeholder={`Hoạt động ngày ${i + 1}...`}
                            onChange={(e) => handleItineraryChange(i, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="font-medium">Ảnh hiện tại</label>
                  {tourImages[editingTour.tour_id]?.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tourImages[editingTour.tour_id].map((img, i) => {
                        const url = typeof img === "string" ? img : img.image_url || img.url || "";
                        const fullUrl = url.startsWith("http") ? url : `${baseURL}/${url.replace(/^\//, "")}`;
                        return (
                          <div key={i} className="relative">
                            <img src={fullUrl} alt={`tour-${i}`} className="w-24 h-20 object-cover rounded border" />
                            <button
                              type="button"
                              onClick={() => handleRemoveOldImage(i)}
                              className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1"
                              title="Xóa ảnh"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic mt-2">Chưa có ảnh</p>
                  )}
                </div>

                <div className="col-span-2 mt-2">
                  <label className="font-medium">Thêm ảnh mới</label>
                  <Input type="file" multiple onChange={handleImageChange} />
                  {newImages.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">{newImages.length} ảnh được chọn</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="font-medium">Mô tả</label>
                  <Textarea
                    rows={4}
                    value={editingTour.description ?? ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingTour(null)}
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
