"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllProviders, updateProviderStatus } from "../api/admin";
import { Button } from "@/components/ui/button";

export default function PendingProviders() {
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: getAllProviders,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateProviderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(["providers"]),
  });

  if (isLoading) return <p className="text-center text-muted-foreground">Đang tải danh sách nhà cung cấp...</p>;
  if (!providers?.length) return <p className="text-center text-muted-foreground">Không có nhà cung cấp nào.</p>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Logo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Tên công ty</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">SĐT</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Số tour</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Doanh thu</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Trạng thái</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.provider_id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                <td className="px-6 py-4">
                  <img
                    src={p.logo_url || "/no-image.png"}
                    alt="logo"
                    className="w-12 h-12 object-cover rounded-md border border-border"
                  />
                </td>
                <td className="px-6 py-4 font-medium text-foreground">{p.company_name}</td>
                <td className="px-6 py-4 text-muted-foreground">{p.email}</td>
                <td className="px-6 py-4 text-muted-foreground">{p.phone_number}</td>
                <td className="px-6 py-4">{p.total_tours || 0}</td>
                <td className="px-6 py-4">
                  {p.total_revenue ? p.total_revenue.toLocaleString("vi-VN") + "₫" : "0₫"}
                </td>
                <td className="px-6 py-4 capitalize">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      p.approval_status === "approved"
                        ? "bg-green-100 text-green-700"
                        : p.approval_status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {p.approval_status}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <Button
                    onClick={() => mutation.mutate({ id: p.provider_id, status: "approved" })}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    Duyệt
                  </Button>
                  <Button
                    onClick={() => mutation.mutate({ id: p.provider_id, status: "rejected" })}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    Từ chối
                  </Button>
                  <Button
                    onClick={() => mutation.mutate({ id: p.provider_id, status: "pending" })}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    size="sm"
                  >
                    Chờ duyệt
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
