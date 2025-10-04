"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Package, Calendar, DollarSign, Plus, Edit, Trash2, Check, X, Building2, Clock } from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

export default function ProviderDashboard({ providerId }) {
  const [tours, setTours] = useState([])
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState({ totalTours: 0, totalBookings: 0, pendingBookings: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [editingTour, setEditingTour] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (providerId) {
      fetchData()
    }
  }, [providerId])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Provider can only see their own tours and bookings
      const [toursRes, bookingsRes] = await Promise.all([
        fetch(`${API_URL}/tours`, {
          headers: {
            "x-user-role": "provider",
            "x-provider-id": providerId,
          },
        }),
        fetch(`${API_URL}/bookings`, {
          headers: {
            "x-user-role": "provider",
            "x-provider-id": providerId,
          },
        }),
      ])

      const toursData = await toursRes.json()
      const bookingsData = await bookingsRes.json()

      setTours(toursData.data || [])
      setBookings(bookingsData.data || [])

      const totalRevenue = bookingsData.data?.reduce((sum, b) => sum + (b.tour_price || 0), 0) || 0
      const pendingBookings = bookingsData.data?.filter((b) => b.status === "pending").length || 0

      setStats({
        totalTours: toursData.data?.length || 0,
        totalBookings: bookingsData.data?.length || 0,
        pendingBookings,
        totalRevenue,
      })
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTour = async (formData) => {
    try {
      const response = await fetch(`${API_URL}/tours`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "provider",
          "x-provider-id": providerId,
        },
        body: JSON.stringify({ ...formData, provider_id: providerId }),
      })
      const result = await response.json()
      if (result.success) {
        fetchData()
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("[v0] Error creating tour:", error)
    }
  }

  const handleUpdateTour = async (tourId, formData) => {
    try {
      const response = await fetch(`${API_URL}/tours/${tourId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "provider",
          "x-provider-id": providerId,
        },
        body: JSON.stringify(formData),
      })
      const result = await response.json()
      if (result.success) {
        fetchData()
        setEditingTour(null)
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("[v0] Error updating tour:", error)
    }
  }

  const handleDeleteTour = async (tourId) => {
    if (!confirm("Bạn có chắc muốn xóa tour này?")) return

    try {
      const response = await fetch(`${API_URL}/tours/${tourId}`, {
        method: "DELETE",
        headers: {
          "x-user-role": "provider",
          "x-provider-id": providerId,
        },
      })
      const result = await response.json()
      if (result.success) {
        fetchData()
      }
    } catch (error) {
      console.error("[v0] Error deleting tour:", error)
    }
  }

  const handleConfirmBooking = async (bookingId) => {
    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "provider",
          "x-provider-id": providerId,
        },
        body: JSON.stringify({ check_in_time: new Date().toISOString() }),
      })
      const result = await response.json()
      if (result.success) {
        fetchData()
      }
    } catch (error) {
      console.error("[v0] Error confirming booking:", error)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!confirm("Bạn có chắc muốn hủy booking này?")) return

    try {
      const response = await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: {
          "x-user-role": "provider",
          "x-provider-id": providerId,
        },
      })
      const result = await response.json()
      if (result.success) {
        fetchData()
      }
    } catch (error) {
      console.error("[v0] Error cancelling booking:", error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Đang tải...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold">Quản Lý Tour Provider</h1>
        </div>
        <Badge variant="secondary" className="text-sm">
          Provider
        </Badge>
      </div>

      {/* Stats Cards - Provider specific */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tours Của Tôi</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tổng Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chờ Xác Nhận</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pendingBookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Doanh Thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} VND</div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Management Tabs */}
      <Tabs defaultValue="tours" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tours">Tours Của Tôi</TabsTrigger>
          <TabsTrigger value="bookings">
            Bookings
            {stats.pendingBookings > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pendingBookings}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tours" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Danh Sách Tours</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTour(null)}>
                  <Plus className="mr-2 h-4 w-4" /> Thêm Tour Mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingTour ? "Chỉnh Sửa Tour" : "Thêm Tour Mới"}</DialogTitle>
                </DialogHeader>
                <TourForm
                  tour={editingTour}
                  onSubmit={(data) =>
                    editingTour ? handleUpdateTour(editingTour.tour_id, data) : handleCreateTour(data)
                  }
                  onCancel={() => {
                    setIsDialogOpen(false)
                    setEditingTour(null)
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <Card key={tour.tour_id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{tour.name}</CardTitle>
                    <Badge variant={tour.available ? "default" : "secondary"}>
                      {tour.available ? "Có sẵn" : "Hết chỗ"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">{tour.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">
                      {tour.price?.toLocaleString()} {tour.currency}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTour(tour)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteTour(tour.tour_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <h2 className="text-xl font-semibold">Bookings Cho Tours Của Tôi</h2>
          <div className="space-y-2">
            {bookings.map((booking) => (
              <Card key={booking.booking_id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{booking.tour_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Khách: {booking.user_name} | {booking.user_email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ngày đặt: {new Date(booking.booking_date).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        booking.status === "confirmed"
                          ? "default"
                          : booking.status === "pending"
                            ? "secondary"
                            : booking.status === "cancelled"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {booking.status}
                    </Badge>
                    <span className="font-semibold">{booking.tour_price?.toLocaleString()} VND</span>
                    {booking.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleConfirmBooking(booking.booking_id)}>
                          <Check className="h-4 w-4 mr-1" /> Xác nhận
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleCancelBooking(booking.booking_id)}>
                          <X className="h-4 w-4 mr-1" /> Hủy
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TourForm({ tour, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: tour?.name || "",
    description: tour?.description || "",
    price: tour?.price || "",
    currency: tour?.currency || "VND",
    start_date: tour?.start_date || "",
    end_date: tour?.end_date || "",
    image_url: tour?.image_url || "",
    available: tour?.available !== false,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Tên Tour</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô Tả</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Giá</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Tiền Tệ</Label>
          <Input
            id="currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Ngày Bắt Đầu</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Ngày Kết Thúc</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">URL Hình Ảnh</Label>
        <Input
          id="image_url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="available"
          checked={formData.available}
          onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="available">Tour có sẵn</Label>
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
