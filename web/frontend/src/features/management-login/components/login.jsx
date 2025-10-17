import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api-client";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { toast } from "sonner";
import Logo2 from "@/assets/images/Logo2.png";
import "../../../assets/css/style.css";

const Login = () => {
  const navigate = useNavigate();
  const { setAuthUser } = useAuthUserStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Tự động đăng nhập sau khi đăng ký
  useEffect(() => {
    const autoUsername = localStorage.getItem("autoLoginUsername");
    const autoPassword = localStorage.getItem("autoLoginPassword");
    if (autoUsername && autoPassword) {
      setUsername(autoUsername);
      setPassword(autoPassword);
      handleLogin(autoUsername, autoPassword);
      localStorage.removeItem("autoLoginUsername");
      localStorage.removeItem("autoLoginPassword");
    }
  }, []);

  const handleLogin = async (autoU, autoP) => {
    try {
      setLoading(true);
      const res = await api.post("/login", {
        username: autoU || username,
        password: autoP || password,
      });
      toast.success(res.data.message || "Login successful!");
      setAuthUser(res.data.user);
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen login-bg">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-[350px]">
        <div className="flex flex-col items-center mb-6">
          <img src={Logo2} alt="AI-Travel Logo" className="w-16 mb-3" />
          <h2 className="text-2xl font-semibold">AI-Travel Login</h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Username</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Enter your username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;