"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Users, DollarSign, Plus, Edit, Trash2, Shield, Ban, CheckCircle, AlertTriangle } from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [systemData, setSystemData] = useState({ tours: [], providers: [] })
  const [stats, setStats] = useState({ totalUsers: 0, totalTransactions: 0, totalRevenue: 0, pendingDisputes: 0 })
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersRes, transactionsRes, toursRes, providersRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/users`, {
          headers: { "x-user-role": "admin" },
        }),
        fetch(`${API_URL}/transactions`, {
          headers: { "x-user-role": "admin" },
        }),
        fetch(`${API_URL}/tours`, {
          headers: { "x-user-role": "admin" },
        }),
        fetch(`${API_URL}/providers`),
        fetch(`${API_URL}/transactions/stats`, {
          headers: { "x-user-role": "admin" },
        }),
      ])

      const usersData = await usersRes.json()
      const transactionsData = await transactionsRes.json()
      const toursData = await toursRes.json()
      const providersData = await providersRes.json()
      const statsData = await statsRes.json()

      setUsers(usersData || [])
      setTransactions(transactionsData || [])
      setSystemData({ tours: toursData.data || [], providers: providersData.data || [] })
      setStats({
        totalUsers: usersData?.length || 0,
        totalTransactions: statsData?.total_transactions || 0,
        totalRevenue: statsData?.total_revenue || 0,
        pendingDisputes: statsData?.pending_disputes || 0,
      })
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify(formData),
      })
      const result = await response.json()
      if (result.message) {
        fetchData()
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("[v0] Error creating user:", error)
    }
  }

  const handleUpdateUser = async (userId, formData) => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify(formData),
      })
      const result = await response.json()
      if (result.message) {
        fetchData()
        setEditingUser(null)
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("[v0] Error updating user:", error)
    }
  }

  const handleSuspendUser = async (userId, suspended) => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify({ suspended }),
      })
      const result = await response.json()
      if (result.message) {
        fetchData()
      }
    } catch (error) {
      console.error("[v0] Error suspending user:", error)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return

    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "DELETE",
        headers: { "x-user-role": "admin" },
      })
      const result = await response.json()
      if (result.message) {
        fetchData()
      }
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
    }
  }

  const handleRefund = async (paymentId, reason) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify({ reason }),
      })
      const result = await response.json()
      if (result.message) {
        fetchData()
      }
    } catch (error) {
      console.error("[v0] Error processing refund:", error)
    }
  }

  const handleDispute = async (paymentId, resolution, notes) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${paymentId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "admin" },
        body: JSON.stringify({ resolution, notes }),
      })
      const result = await response.json()
      if (result.message) {
        fetchData()
      }
    } catch (error) {
      console.error("[v0] Error handling dispute:", error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Quản Trị Hệ Thống</h1>
        </div>
        <Badge variant="default" className="text-sm">
          Admin
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng Người Dùng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng Giao Dịch</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng Doanh Thu</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} VND</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tranh Chấp</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pendingDisputes}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Quản Lý Tài Khoản</TabsTrigger>
          <TabsTrigger value="transactions">Quản Lý Giao Dịch</TabsTrigger>
          <TabsTrigger value="system">Dữ Liệu Hệ Thống</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Quản Lý Tài Khoản Người Dùng</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingUser(null)}>
                  <Plus className="mr-2 h-4 w-4" /> Tạo Tài Khoản Mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Chỉnh Sửa Người Dùng" : "Tạo Người Dùng Mới"}</DialogTitle>
                </DialogHeader>
                <UserForm
                  user={editingUser}
                  onSubmit={(data) =>
                    editingUser ? handleUpdateUser(editingUser.user_id, data) : handleCreateUser(data)
                  }
                  onCancel={() => {
                    setIsDialogOpen(false)
                    setEditingUser(null)
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {users.map((user) => (
              <Card key={user.user_id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      @{user.username} | {user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Tạo: {new Date(user.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {user.admin_role && <Badge variant="default">{user.admin_role}</Badge>}
                    {user.suspended && <Badge variant="destructive">Tạm ngưng</Badge>}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingUser(user)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={user.suspended ? "default" : "secondary"}
                        onClick={() => handleSuspendUser(user.user_id, !user.suspended)}
                      >
                        {user.suspended ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.user_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <h2 className="text-xl font-semibold">Quản Lý Giao Dịch & Thanh Toán</h2>
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <Card key={transaction.payment_id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{transaction.tour_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Khách: {transaction.user_name} ({transaction.user_email})
                    </p>
                    <p className="text-sm text-muted-foreground">Provider: {transaction.provider_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Ngày: {new Date(transaction.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{transaction.amount.toLocaleString()} VND</div>
                      <Badge
                        variant={
                          transaction.status === "paid"
                            ? "default"
                            : transaction.status === "refunded"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                    {transaction.status === "paid" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const reason = prompt("Lý do hoàn tiền:")
                            if (reason) handleRefund(transaction.payment_id, reason)
                          }}
                        >
                          Hoàn Tiền
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const notes = prompt("Ghi chú tranh chấp:")
                            if (notes) handleDispute(transaction.payment_id, "resolved", notes)
                          }}
                        >
                          Xử Lý Tranh Chấp
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <h2 className="text-xl font-semibold">Dữ Liệu Hệ Thống</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tours Trong Hệ Thống</CardTitle>
                <CardDescription>Tổng quan về các tour đang hoạt động</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">{systemData.tours.length} Tours</div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {systemData.tours.map((tour) => (
                    <div key={tour.tour_id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="font-medium">{tour.name}</div>
                        <div className="text-sm text-muted-foreground">{tour.provider_name}</div>
                      </div>
                      <Badge variant={tour.available ? "default" : "secondary"}>
                        {tour.available ? "Hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nhà Cung Cấp</CardTitle>
                <CardDescription>Danh sách các nhà cung cấp tour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">{systemData.providers.length} Providers</div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {systemData.providers.map((provider) => (
                    <div key={provider.provider_id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-sm text-muted-foreground">{provider.email}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">{provider.total_tours} tours</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UserForm({ user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    password: user ? "" : "",
    email: user?.email || "",
    phone_number: user?.phone_number || "",
    role: user?.admin_role || "none", // Updated default value to "none"
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Họ Tên</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Tên Đăng Nhập</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
          disabled={!!user}
        />
      </div>

      {!user && (
        <div className="space-y-2">
          <Label htmlFor="password">Mật Khẩu</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone_number">Số Điện Thoại</Label>
        <Input
          id="phone_number"
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Vai Trò Admin (Tùy chọn)</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Người dùng thường</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="superadmin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit">Lưu</Button>
      </div>
    </form>
  )
}
