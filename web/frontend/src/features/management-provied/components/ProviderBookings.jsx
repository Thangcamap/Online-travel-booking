import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProviderBookings({ providerId }) {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (providerId) fetchBookings();
  }, [providerId]);

  const fetchBookings = async () => {
    const res = await axios.get(`/tours/providers/${providerId}/bookings`);
    setBookings(res.data.bookings || []);
  };

  return (
    <Card className="p-4">
      {bookings.length === 0 ? (
        <p className="text-gray-500 text-center">Chưa có đơn đặt nào.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Khách hàng</th>
              <th className="p-2">Tour</th>
              <th className="p-2">Số lượng</th>
              <th className="p-2">Tổng tiền</th>
              <th className="p-2">Thời gian đặt</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((b) => (
              <tr key={b.booking_id} className="border-b hover:bg-gray-50">
                <td className="p-2">{b.user_name} ({b.phone_number})</td>
                <td className="p-2 font-medium">{b.tour_name}</td>
                <td className="p-2">{b.quantity}</td>
                <td className="p-2">{Number(b.total_price).toLocaleString()} đ</td>
                <td className="p-2 text-gray-600">
                  {b.booking_date
                    ? new Date(b.booking_date.replace(" ", "T")).toLocaleString("vi-VN")
                    : "Không xác định"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
