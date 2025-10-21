import React, { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { createTour, uploadTourImage } from "../api/tours-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


export default function AddTourForm({ providerId, onAdded }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    available_slots: "",
    start_date: "",
    end_date: "",
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(0);
  const [itinerary, setItinerary] = useState([]);

  // 🧮 Tính tổng số ngày khi chọn ngày bắt đầu & kết thúc
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) {
        setDays(diff);
        // tạo lại lịch trình theo số ngày
        setItinerary(
          Array.from({ length: diff }, (_, i) => ({
            day_number: i + 1,
            title: `Ngày ${i + 1}`,
            description: "",
          }))
        );
      } else {
        setDays(0);
        setItinerary([]);
      }
    }
  }, [form.start_date, form.end_date]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleItineraryChange = (index, field, value) => {
    const updated = [...itinerary];
    updated[index][field] = value;
    setItinerary(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (days <= 0) return alert("⚠️ Vui lòng chọn ngày bắt đầu và kết thúc hợp lệ!");

    try {
      setLoading(true);

      // 🟢 Tạo tour cơ bản
      const res = await createTour({
        ...form,
        provider_id: providerId,
      });

      if (!res.data.success) return alert("❌ Lỗi tạo tour!");
      const newTour = res.data.tour;

      // 🟢 Upload nhiều ảnh
      for (const file of files) {
        await uploadTourImage(newTour.tour_id, file, providerId);
      }

      // 🟢 Gửi lịch trình (theo đúng API backend của bạn)
      if (itinerary.length > 0) {
        await fetch(`/api/tours/${newTour.tour_id}/itinerary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itinerary }),
        });
      }

      alert("✅ Tạo tour, ảnh và lịch trình thành công!");
      onAdded?.();

      // reset form
      setForm({
        name: "",
        description: "",
        price: "",
        available_slots: "",
        start_date: "",
        end_date: "",
      });
      setFiles([]);
      setItinerary([]);
      setDays(0);
    } catch (err) {
      console.error("Lỗi tạo tour:", err);
      alert("❌ Có lỗi xảy ra khi tạo tour!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label>Tên tour</Label>
        <Input name="name" value={form.name} onChange={handleChange} required />
      </div>

      <div className="grid gap-2">
        <Label>Mô tả</Label>
        <Textarea
          name="description"
          rows={3}
          value={form.description}
          onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Giá (VND)</Label>
          <Input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label>Số chỗ</Label>
          <Input
            type="number"
            name="available_slots"
            value={form.available_slots}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Ngày bắt đầu</Label>
          <Input
            type="date"
            name="start_date"
            value={form.start_date}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label>Ngày kết thúc</Label>
          <Input
            type="date"
            name="end_date"
            value={form.end_date}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Hiển thị số ngày */}
      {days > 0 && (
        <p className="text-sm text-orange-600 font-medium">
          📅 Tổng thời gian: {days} ngày
        </p>
      )}

      {/* 🗓️ Lên lịch trình từng ngày */}
      {days > 0 && (
        <div className="space-y-2 mt-3">
          <Label className="font-semibold">Lịch trình chi tiết</Label>
          {itinerary.map((item, index) => (
            <div key={index} className="border rounded-lg p-3 bg-orange-50">
              <p className="font-semibold mb-1 text-orange-700">
                Ngày {item.day_number}
              </p>
              <Input
                className="mb-2"
                placeholder="Tiêu đề (VD: Tham quan Hà Nội)"
                value={item.title}
                onChange={(e) =>
                  handleItineraryChange(index, "title", e.target.value)
                }
              />
              <Textarea
                rows={2}
                placeholder={`Hoạt động chi tiết ngày ${item.day_number}...`}
                value={item.description}
                onChange={(e) =>
                  handleItineraryChange(index, "description", e.target.value)
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Ảnh */}
      <div className="grid gap-2 mt-3">
        <Label>Ảnh tour</Label>
        <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
      </div>

      <Button type="submit" className="w-full mt-4" disabled={loading}>
        {loading ? "Đang lưu..." : "Tạo tour"}
      </Button>
    </form>
  );
}
