import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Plane, Bot, Users, Shield, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    navigate('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">SmartTour AI</h1>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Đăng nhập
              </Button>
              <Button 
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => navigate('/register')}
              >
                Đăng ký
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Nền tảng Du lịch Thông minh
            <span className="block text-orange-500">với AI</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Khám phá thế giới với sự hỗ trợ của trí tuệ nhân tạo. Lập kế hoạch hành trình, tìm kiếm tour và nhận gợi ý
            cá nhân hóa từ AI assistant.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => navigate('/register')}
            >
              Bắt đầu ngay
            </Button>
            <Button size="lg" variant="outline">
              Tìm hiểu thêm
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tính năng nổi bật</h2>
            <p className="text-xl text-gray-600">Trải nghiệm du lịch thông minh với công nghệ AI tiên tiến</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="bg-blue-100 p-3 rounded-lg w-fit">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Dành cho Du khách</CardTitle>
                <CardDescription>Tìm kiếm tour, nhận gợi ý AI và đặt chỗ dễ dàng</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Tìm kiếm tour theo sở thích</li>
                  <li>• AI chatbot hỗ trợ 24/7</li>
                  <li>• Đặt chỗ và thanh toán an toàn</li>
                  <li>• Gợi ý cá nhân hóa</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-green-100 p-3 rounded-lg w-fit">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Nhà cung cấp Tour</CardTitle>
                <CardDescription>Quản lý tour và kết nối với khách hàng</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Đăng tải thông tin tour</li>
                  <li>• Quản lý đặt chỗ</li>
                  <li>• Theo dõi doanh thu</li>
                  <li>• Xác nhận booking</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-purple-100 p-3 rounded-lg w-fit">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Quản trị viên</CardTitle>
                <CardDescription>Quản lý toàn bộ hệ thống và dữ liệu</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Quản lý tài khoản người dùng</li>
                  <li>• Giám sát giao dịch</li>
                  <li>• Quản lý dữ liệu hệ thống</li>
                  <li>• Phân quyền và bảo mật</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* AI Features (full width) */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-red-500 text-white w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white/10 p-3 rounded-lg w-fit mx-auto mb-6">
            <Bot className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold mb-4">AI Assistant thông minh</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Trí tuệ nhân tạo hiểu biết sở thích của bạn và đưa ra những gợi ý tour phù hợp nhất. 
            Chatbot hỗ trợ 24/7 để giải đáp mọi thắc mắc.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/register')}
          >
            Trải nghiệm AI ngay
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-orange-500 p-2 rounded-lg">
                  <Plane className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">SmartTour AI</h3>
              </div>
              <p className="text-gray-400">Nền tảng du lịch thông minh với AI hỗ trợ lập kế hoạch hành trình.</p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Sản phẩm</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Tìm kiếm tour</li>
                <li>AI Assistant</li>
                <li>Đặt chỗ online</li>
                <li>Quản lý tour</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Trung tâm trợ giúp</li>
                <li>Liên hệ</li>
                <li>Điều khoản</li>
                <li>Chính sách</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Kết nối</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Facebook</li>
                <li>Instagram</li>
                <li>Twitter</li>
                <li>LinkedIn</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 SmartTour AI. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
