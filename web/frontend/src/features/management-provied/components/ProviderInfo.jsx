"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Mail, Phone, MapPin, Building } from "lucide-react";
import { getProviderById } from "../api/tours-api";

export default function ProviderInfo({ providerId }) {
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    if (providerId) fetchProvider();
  }, [providerId]);

  const fetchProvider = async () => {
    try {
      const res = await getProviderById(providerId);
      setProvider(res.data.provider);
    } catch (error) {
      console.error("❌ Lỗi khi lấy thông tin provider:", error);
    }
  };

  if (!provider)
    return (
      <div className="flex justify-center items-center h-[300px] text-gray-500">
        Đang tải thông tin nhà cung cấp...
      </div>
    );

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Ảnh cover */}
      <div className="w-full h-[200px] rounded-xl overflow-hidden relative">
        <img
          src={
            provider.cover_url ||
            `https://picsum.photos/seed/${provider.provider_id}/800/200`
          }
          alt="cover"
          className="object-cover w-full h-full"
        />
        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-3 py-1 rounded-md shadow">
          Đang hoạt động
        </span>
      </div>

      {/* Thông tin chính */}
      <Card className="p-6 flex flex-col gap-4">
        {/* Avatar + tên */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
            <img
              src={
                provider.logo_url ||
                `https://i.pravatar.cc/150?u=${provider.provider_id}`
              }
              alt="avatar"
              className="object-cover w-full h-full"
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{provider.company_name}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Mail size={14} /> {provider.email || "Chưa có email"}
            </p>
          </div>
        </div>

        {/* Thông tin liên hệ */}
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Phone size={16} /> {provider.phone_number || "Chưa có số điện thoại"}
          </div>
<div className="flex items-center gap-2 text-gray-700">
  <MapPin size={16} />
  {[provider.address, provider.city, provider.country]
    .filter(Boolean)
    .join(", ") || "Chưa có địa chỉ"}
</div>

        </div>
      </Card>
    </div>
  );
}
