import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPendingProviders, updateProviderStatus } from "../api/admin";
import { Button } from "@/components/ui/button";

export default function PendingProviders() {
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ["pendingProviders"],
    queryFn: getPendingProviders,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateProviderStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(["pendingProviders"]),
  });

  if (isLoading) return <p>Đang tải danh sách...</p>;

  if (!providers?.length)
    return <p className="text-center text-gray-500">Không có yêu cầu chờ duyệt.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold mb-4">Danh sách nhà cung cấp chờ duyệt</h2>
      {providers.map((p) => (
        <div key={p.provider_id} className="border p-4 rounded-lg shadow-sm bg-white">
          <h3 className="font-bold text-lg">{p.company_name}</h3>
          <p className="text-sm text-gray-600">Email: {p.email}</p>
          <p className="text-sm text-gray-600">SĐT: {p.phone_number}</p>
          <p className="text-gray-700 mt-2">{p.description || "Không có mô tả"}</p>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => mutation.mutate({ id: p.provider_id, status: "approved" })}
              className="bg-green-500 hover:bg-green-600"
            >
              Duyệt
            </Button>
            <Button
              onClick={() => mutation.mutate({ id: p.provider_id, status: "rejected" })}
              className="bg-red-500 hover:bg-red-600"
            >
              Từ chối
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
