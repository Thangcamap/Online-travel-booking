"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, updateUserStatus } from "../api/admin";
import { Button } from "@/components/ui/button";

export default function ManageUsers() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(["users"]),
  });

  if (isLoading) return <p className="text-center text-muted-foreground">Đang tải danh sách người dùng...</p>;
  if (!users?.length) return <p className="text-center text-muted-foreground">Không có người dùng nào.</p>;

  const normalUsers = users.filter((u) => u.role === "user");
  if (!normalUsers.length) return <p className="text-center text-muted-foreground">Không có người dùng thông thường.</p>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Tên</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Vai trò</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Trạng thái</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {normalUsers.map((u) => (
              <tr key={u.user_id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{u.name}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.status === "active"
                        ? "bg-green-100 text-green-700"
                        : u.status === "inactive"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <Button
                    onClick={() => mutation.mutate({ id: u.user_id, status: "active" })}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    Kích hoạt
                  </Button>
                  <Button
                    onClick={() => mutation.mutate({ id: u.user_id, status: "inactive" })}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    size="sm"
                  >
                    Vô hiệu hóa
                  </Button>
                  <Button
                    onClick={() => mutation.mutate({ id: u.user_id, status: "suspended" })}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    Đình chỉ
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
