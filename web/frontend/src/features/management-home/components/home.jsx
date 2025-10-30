import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Link, useNavigate } from "react-router-dom";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { Menu } from "@headlessui/react";
import { ChevronDown } from "lucide-react";



const Home = () => {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthUserStore();
  const [tours, setTours] = useState([]);
  const [search, setSearch] = useState("");

  // Nếu chưa login → quay về login
  // useEffect(() => {
  //   if (!authUser) navigate("/login");
  // }, [authUser, navigate]);

  // Lấy danh sách tour
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const res = await api.get("/home/tours");
        setTours(res.data || []);
      } catch (err) {
        console.error("Error fetching tours:", err);
      }
    };
    fetchTours();
  }, []);

  // Đăng xuất
  const handleLogout = () => {
    setAuthUser(null);
    navigate("/home");
  };

  // Lọc tour theo từ khóa
  const filteredTours = tours.filter((tour) =>
    tour.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      {/* HEADER */}
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

      {/* HERO SECTION */}
      <section
        className="relative w-full h-[85vh] flex items-center justify-center text-center bg-cover bg-center"
        style={{
          backgroundImage: "url('/src/assets/images/hero.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-white px-4">
          <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">
            Explore the World with AI-Travel
          </h1>
          <p className="text-lg mb-8 opacity-90">
            Find your next adventure with AI-powered recommendations.
          </p>

          {/* Search bar */}
          <div className="bg-white flex flex-col md:flex-row gap-3 p-4 rounded-xl shadow-lg max-w-3xl mx-auto">
            <input
              type="text"
              placeholder="Search destinations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* POPULAR TOURS */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-8 text-gray-800">
            Popular Tours
          </h2>

          {filteredTours.length === 0 ? (
            <p className="text-gray-500">No tours available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredTours.slice(0, 8).map((tour) => (
                <div
                  key={tour.tour_id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-transform hover:-translate-y-2"
                >
                  <img
                    src={
                      tour.image_url ||
                      "/src/assets/images/default-tour.jpg"
                    }
                    alt={tour.name}
                    className="h-52 w-full object-cover"
                  />
                  <div className="p-5 text-left">
                    <h3 className="text-lg font-semibold mb-2">
                      {tour.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                      {tour.description || "No description available."}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-orange-500 font-semibold">
                        {Number(tour.price).toLocaleString()}{" "}
                        {tour.currency || "VND"}
                      </span>
                      <Link
                        to={`/tour/${tour.tour_id}`}
                        className="bg-orange-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-orange-600"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-20 bg-white text-center">
        <h2 className="text-3xl font-bold mb-10 text-gray-800">
          Why Choose AI-Travel?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto px-6">
          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">
            <div className="text-orange-500 text-4xl mb-3">🤖</div>
            <h3 className="text-xl font-semibold mb-2">
              AI Recommendations
            </h3>
            <p className="text-gray-600">
              Smart suggestions tailored to your travel preferences.
            </p>
          </div>
          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">
            <div className="text-orange-500 text-4xl mb-3">✅</div>
            <h3 className="text-xl font-semibold mb-2">
              Verified Providers
            </h3>
            <p className="text-gray-600">
              All tour providers are verified for safety and quality.
            </p>
          </div>
          <div className="p-6 rounded-xl shadow hover:shadow-lg transition">
            <div className="text-orange-500 text-4xl mb-3">⚡</div>
            <h3 className="text-xl font-semibold mb-2">
              Fast & Easy Booking
            </h3>
            <p className="text-gray-600">
              Simple booking process and instant confirmations.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 py-10 mt-auto">
        <div className="container mx-auto px-6 text-center space-y-3">
          <h3 className="text-orange-500 text-xl font-semibold">
            AI-TRAVEL
          </h3>
          <p>
            © {new Date().getFullYear()} AI-Travel. All rights reserved.
          </p>
          <div className="flex justify-center gap-5 text-lg">
            <a href="#" className="hover:text-white">
              Facebook
            </a>
            <a href="#" className="hover:text-white">
              Instagram
            </a>
            <a href="#" className="hover:text-white">
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
