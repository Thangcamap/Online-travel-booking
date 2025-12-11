import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronRight, Users, MapPin, Calendar } from "lucide-react";

export default function ProviderBookings({ providerId }) {
  const [tours, setTours] = useState([]);
  const [selectedTour, setSelectedTour] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingTours, setLoadingTours] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // 📋 Load danh sách tour của provider
  useEffect(() => {
    if (providerId) fetchTours();
  }, [providerId]);

  const fetchTours = async () => {
    setLoadingTours(true);
    try {
      const res = await fetch(`http://localhost:5000/api/tours/provider/${providerId}`);
      const data = await res.json();
      setTours(data.tours || []);
    } catch (error) {
      console.error("Lỗi tải danh sách tour:", error);
    } finally {
      setLoadingTours(false);
    }
  };

  // 🎫 Load bookings khi chọn tour
  const handleSelectTour = async (tour) => {
    setSelectedTour(tour);
    setLoadingBookings(true);
    try {
      const res = await fetch(`http://localhost:5000/api/tours/${tour.tour_id}/bookings`);
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Lỗi tải danh sách đặt vé:", error);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[600px]">
      {/* 👈 BÊN TRÁI: Danh sách Tour */}
      <Card className="col-span-4 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Danh sách Tour</h3>
          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-semibold">
            {tours.length} tour
          </span>
        </div>

        {loadingTours ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            Đang tải...
          </div>
        ) : tours.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Chưa có tour nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tours.map((tour) => (
              <button
                key={tour.tour_id}
                onClick={() => handleSelectTour(tour)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedTour?.tour_id === tour.tour_id
                    ? "border-orange-500 bg-orange-50 shadow-md"
                    : "border-gray-200 hover:border-orange-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 truncate mb-1">
                      {tour.name}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {tour.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {tour.duration}
                      </span>
                      <span className="text-orange-600 font-semibold">
                        {Number(tour.price).toLocaleString()} đ
                      </span>
                    </div>
                  </div>
                  <ChevronRight 
                    className={`w-5 h-5 flex-shrink-0 ml-2 transition-transform ${
                      selectedTour?.tour_id === tour.tour_id ? "text-orange-500 transform translate-x-1" : "text-gray-400"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 👉 BÊN PHẢI: Danh sách Booking của Tour */}
      <Card className="col-span-8 p-4 overflow-y-auto">
        {!selectedTour ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Users className="w-16 h-16 mb-4" />
            <p className="text-lg">Chọn một tour để xem danh sách đặt vé</p>
          </div>
        ) : (
          <>
            <div className="mb-4 pb-4 border-b">
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                Danh sách đặt vé: {selectedTour.name}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {bookings.length} đơn đặt
                </span>
                <span className="text-orange-600 font-semibold">
                  Tổng: {bookings.reduce((sum, b) => sum + Number(b.total_price), 0).toLocaleString()} đ
                </span>
              </div>
            </div>

            {loadingBookings ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                Đang tải danh sách đặt vé...
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Chưa có đơn đặt nào cho tour này</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                      <th className="p-3 text-left font-semibold text-gray-700">Khách hàng</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Liên hệ</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Số lượng</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Tổng tiền</th>
                      <th className="p-3 text-left font-semibold text-gray-700">Thời gian đặt</th>
                    </tr>
                  </thead>

                  <tbody>
                    {bookings.map((b, index) => (
                      <tr 
                        key={b.booking_id} 
                        className={`border-b hover:bg-orange-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-medium text-gray-800">{b.user_name}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-600">{b.phone_number}</div>
                          {b.email && (
                            <div className="text-xs text-gray-500">{b.email}</div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
                            {b.quantity}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-semibold text-orange-600">
                            {Number(b.total_price).toLocaleString()} đ
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {b.booking_date
                            ? new Date(b.booking_date.replace(" ", "T")).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "Không xác định"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}