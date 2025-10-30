import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import Swal from "sweetalert2";
import Logo2 from "@/assets/images/Logo2.png";

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: "Mật khẩu không khớp",
        text: "Vui lòng nhập lại mật khẩu trùng khớp.",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/register", form);
      toast.success(res.data.message || "Đăng ký thành công!");
      navigate("/login");
    } catch (error) {
      console.error("❌ Lỗi đăng ký:", error.response?.data);
      const message = error.response?.data?.message || "Lỗi máy chủ khi đăng ký.";

      let alertTitle = "Lỗi đăng ký";
      let alertText = message;

      if (message.includes("Email")) {
        alertTitle = "Email đã được sử dụng!";
        alertText = "Email bạn nhập đã tồn tại trong hệ thống. Vui lòng dùng email khác.";
      } else if (message.includes("Số điện thoại")) {
        alertTitle = "Số điện thoại đã được sử dụng!";
        alertText = "Số điện thoại này đã có người đăng ký. Hãy thử số khác.";
      } else if (message.includes("Tên đăng nhập")) {
        alertTitle = "Tên đăng nhập đã được sử dụng!";
        alertText = "Tên đăng nhập bạn chọn đã tồn tại. Vui lòng chọn tên khác.";
      }

      Swal.fire({
        icon: "error",
        title: alertTitle,
        text: alertText,
        confirmButtonText: "OK",
        confirmButtonColor: "#ef4444",
        background: "#ffffff",
        color: "#000000",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
<div
  className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
  style={{ backgroundImage: `url("/src/assets/images/HN1.png")` }}>
      <div className="absolute inset-0 bg-black/26"></div>
  <div className="relative z-10">
<div className="bg-white/20 backdrop-blur-xl border border-white/40 p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] w-[400px]">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <img src={Logo2} alt="AI-Travel Logo" className="w-16 mb-3" />
          <h1 className="text-2xl font-bold text-orange-500">AI-TRAVEL REGISTER</h1>
          <p className="text-gray-700 text-sm mt-1 text-center">
            Tạo tài khoản để bắt đầu hành trình cùng AI-Travel
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ và tên
            </label>
            <input
              name="fullname"
              value={form.fullname}
              onChange={handleChange}
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="example@gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="0123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên đăng nhập
            </label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="username"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu
            </label>
            <input
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              type="password"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Nhập lại mật khẩu"
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
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-5">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
  </div>
</div>
  );
};

export default Register;
