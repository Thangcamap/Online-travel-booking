"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllProviders, updateProviderStatus } from "../api/admin";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Eye, Clock } from "lucide-react";
import { useState } from "react";

export default function PendingProviders() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending"); // ✅ Trạng thái đang xem

  const { data: providers, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: getAllProviders,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateProviderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(["providers"]),
  });

  if (isLoading)
    return <p className="text-center text-muted-foreground">Đang tải danh sách...</p>;
  if (!providers?.length)
    return <p className="text-center text-muted-foreground">Không có dữ liệu nhà cung cấp.</p>;

  const pending = providers.filter((p) => p.approval_status === "pending");
  const approved = providers.filter((p) => p.approval_status === "approved");
  const rejected = providers.filter((p) => p.approval_status === "rejected");

  const tabs = [
    { key: "pending", label: "Chờ duyệt", color: "bg-red-50 border-red-200 text-red-700", icon: <Clock className="w-4 h-4" /> },
    { key: "approved", label: "Đã duyệt", color: "bg-green-50 border-green-200 text-green-700", icon: <CheckCircle2 className="w-4 h-4" /> },
    { key: "rejected", label: "Từ chối", color: "bg-red-50 border-red-200 text-red-700", icon: <XCircle className="w-4 h-4" /> },
  ];

  const displayedProviders =
    activeTab === "pending" ? pending :
    activeTab === "approved" ? approved : rejected;

  return (
    <div className="space-y-6">
      {/* Thống kê 3 ô trạng thái */}
      <div className="grid grid-cols-3 gap-4">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer border rounded-lg p-4 text-center transition hover:shadow-md ${
              activeTab === tab.key ? "ring-2 ring-orange-400" : ""
            } ${tab.color}`}
          >
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              {tab.icon} {tab.label}
            </div>
            <p className="text-2xl font-bold mt-2">
              {tab.key === "pending"
                ? pending.length
                : tab.key === "approved"
                ? approved.length
                : rejected.length}
            </p>
          </div>
        ))}
      </div>

      {/* Danh sách provider */}
      <div className="space-y-3">
        {displayedProviders.length > 0 ? (
          displayedProviders.map((p) => (
            <div
              key={p.provider_id}
              className="bg-white border rounded-lg p-4 hover:shadow transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">{p.company_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.email}</p>
                  <p className="text-sm text-muted-foreground">{p.phone_number}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Gửi: {new Date(p.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>

                {activeTab === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() =>
                        mutation.mutate({ id: p.provider_id, status: "approved" })
                      }
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        mutation.mutate({ id: p.provider_id, status: "rejected" })
                      }
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Từ chối
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border">
            <p className="text-muted-foreground">
              Không có nhà cung cấp nào trong mục này
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
