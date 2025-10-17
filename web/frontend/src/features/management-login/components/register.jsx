import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import Logo2 from "@/assets/images/Logo2.png";
import "../../../assets/css/style.css";
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
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/register", form);
      toast.success(res.data.message || "Registration successful!");
      // Lưu username/password để auto login
      localStorage.setItem("autoLoginUsername", form.username);
      localStorage.setItem("autoLoginPassword", form.password);
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen login-bg">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-[400px]">
        <div className="flex flex-col items-center mb-6">
          <img src={Logo2} alt="AI-Travel Logo" className="w-16 mb-3" />
          <h1 className="text-2xl font-semibold">AI-TRAVEL REGISTER</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Full Name</label>
            <input
              name="fullname"
              value={form.fullname}
              onChange={handleChange}
              type="text"
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Phone Number</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="text"
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Enter your phone number"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              type="text"
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Choose a username"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type="password"
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Create a password"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Confirm Password</label>
            <input
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              type="password"
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;