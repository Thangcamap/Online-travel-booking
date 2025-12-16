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

  if (isLoading)
    return <p className="text-center text-muted-foreground">Đang tải danh sách người dùng...</p>;
  if (!users?.length)
    return <p className="text-center text-muted-foreground">Không có người dùng nào.</p>;

  const normalUsers = users.filter((u) => u.role === "user");

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-foreground text-left">
              <th className="px-6 py-3 font-semibold">Tên</th>
              <th className="px-6 py-3 font-semibold">Email</th>
              <th className="px-6 py-3 font-semibold">Vai trò</th>
              <th className="px-6 py-3 font-semibold">Ngày tham gia</th>
              <th className="px-6 py-3 font-semibold">Trạng thái</th>
              <th className="px-6 py-3 font-semibold text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {normalUsers.map((u) => (
              <tr
                key={u.user_id}
                className="border-b border-border hover:bg-secondary/30 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-foreground">{u.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.role === "provider"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-pink-100 text-pink-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      u.status === "active"
                        ? "bg-green-100 text-green-700"
                        : u.status === "suspended"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {u.status === "active"
                      ? "Hoạt động"
                      : u.status === "suspended"
                      ? "Đình chỉ"
                      : "Không hoạt động"}
                  </span>
                </td>
                <td className="px-6 py-4 flex justify-center gap-2">
                  <Button
                    onClick={() => mutation.mutate({ id: u.user_id, status: "active" })}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    Kích hoạt
                  </Button>
                  <Button
                    onClick={() => mutation.mutate({ id: u.user_id, status: "suspended" })}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    Khóa
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
