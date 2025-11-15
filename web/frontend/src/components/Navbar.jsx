import { Link, useNavigate } from "react-router-dom";
import { Menu } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import useAuthUserStore from "@/stores/useAuthUserStore";

const Navbar = () => {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthUserStore();

  const handleLogout = () => {
    localStorage.removeItem("user");
    setAuthUser(null);
    navigate("/home");
    window.location.reload();
  };

  return (
         <header className="bg-white/90 backdrop-blur-sm shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          {/* LEFT: Logo + Brand */}
          <div className="flex items-center gap-2">
            <img
              src="/src/assets/images/Logo2.png"
              alt="AI-Travel Logo"
              className="w-10 h-10 object-contain"
            />
            <Link
              to="/home"
              className="text-2xl font-extrabold text-orange-500 tracking-tight hover:text-orange-600 transition-colors"
            >
              AI-TRAVEL
            </Link>
          </div>

          {/* CENTER: Navigation links */}
          <nav className="hidden md:flex gap-6 text-gray-700 font-medium">
            <Link to="/home" className="hover:text-orange-500 transition-colors">
              Home
            </Link>
            <Link to="/tours" className="hover:text-orange-500 transition-colors">
              Tours
            </Link>
            <Link to="/about" className="hover:text-orange-500 transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-orange-500 transition-colors">
              Contact
            </Link>
          </nav>

          {/* RIGHT: Auth buttons */}
<div className="flex items-center gap-3">
  {!authUser ? (
    <>
      <Link
        to="/login"
        className="px-4 py-2 text-orange-500 font-semibold hover:text-white hover:bg-orange-500 rounded-lg border border-orange-500 transition"
      >
        Login
      </Link>
      <Link
        to="/register"
        className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition"
      >
        Register
      </Link>
    </>
  ) : (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="flex items-center gap-2">
        <img
          src={authUser.avatar || "https://i.pravatar.cc/40"}
          alt="avatar"
          className="w-10 h-10 rounded-full border-2 border-orange-400"
        />
        <ChevronDown className="w-4 h-4 text-gray-600" />
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white divide-y divide-gray-200 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
        <div className="px-4 py-3">
          <p className="text-sm text-gray-500">Đăng nhập với</p>
          <p className="text-sm font-semibold text-gray-800 truncate">
            {authUser.name}
          </p>
        </div>
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => navigate("/payments")}
                className={`${
                  active ? "bg-gray-100" : ""
                } block w-full text-left px-4 py-2 text-sm text-gray-700`}
              >
                💳 Thanh toán của tôi
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => navigate("/")}
                className={`${
                  active ? "bg-gray-100" : ""
                } block w-full text-left px-4 py-2 text-sm text-gray-700`}
              >
                Đăng ký làm Provider
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => navigate("/provider-dashboard")}
                className={`${
                  active ? "bg-gray-100" : ""
                } block w-full text-left px-4 py-2 text-sm text-gray-700`}
              >
                Quản lý Tour
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => navigate("/profile")}
                className={`${
                  active ? "bg-gray-100" : ""
                } block w-full text-left px-4 py-2 text-sm text-gray-700`}
              >
                Thông tin cá nhân
              </button>
            )}
          </Menu.Item>
        </div>
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={handleLogout}
                className={`${
                  active ? "bg-gray-100" : ""
                } block w-full text-left px-4 py-2 text-sm text-red-600`}
              >
                Đăng xuất
              </button>
            )}
          </Menu.Item>
        </div>
      </Menu.Items>
    </Menu>
  )}
</div>

        </div>
      </header>
  );
};

export default Navbar;
