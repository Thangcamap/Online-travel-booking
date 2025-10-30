import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import Swal from "sweetalert2";
import useAuthUserStore from "@/stores/useAuthUserStore";   // ✅ thêm để lưu user
import Logo2 from "@/assets/images/Logo2.png";

const Login = () => {
  const navigate = useNavigate();
  const { setAuthUser } = useAuthUserStore();   // ✅ hook từ store
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const res = await api.post("/login", form);

      // ✅ Lưu user vào store
      setAuthUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // ✅ Hiển thị thông báo thành công
      Swal.fire({
        icon: "success",
        title: "Đăng nhập thành công!",
        text: `Chào mừng ${res.data.user.name}!`,
        confirmButtonColor: "#3B82F6",
        timer: 1800,
        showConfirmButton: false,
      });

      // ✅ Chuyển sang trang home sau 1.5s
      // ✅ Điều hướng theo vai trò người dùng
setTimeout(() => {
  const role = res.data.user.role;
  if (role === "admin") {
    navigate("/admin/dashboard"); // 👈 trang admin
  } else {
    navigate("/home");
  }
}, 1500);

    } catch (error) {
      console.error("❌ Lỗi đăng nhập:", error.response?.data);
      const msg =
        error.response?.data?.message || "Sai thông tin đăng nhập hoặc lỗi máy chủ.";

      Swal.fire({
        icon: "error",
        title: "Đăng nhập thất bại",
        text: msg,
        confirmButtonColor: "#ef4444",
        background: "#ffffffff",
        color: "#000",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url("/src/assets/images/HN1.png")` }}
    >
      <div className="absolute inset-0 bg-black/26"></div>
      <div className="relative z-10">
        <div className="bg-white/20 backdrop-blur-xl border border-white/40 p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] w-[400px]">
          <div className="flex flex-col items-center mb-6">
            <img src={Logo2} alt="AI-Travel Logo" className="w-16 mb-3" />
            <h1 className="text-2xl font-bold text-orange-500">AI-TRAVEL LOGIN</h1>
            <p className="text-gray-500 text-sm mt-1 text-center">
              Đăng nhập để tiếp tục hành trình cùng AI-Travel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên đăng nhập / Email / SĐT
              </label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                type="text"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Nhập tên đăng nhập hoặc email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type="password"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Nhập mật khẩu"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg text-white font-semibold shadow-md transition ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 mt-5">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
