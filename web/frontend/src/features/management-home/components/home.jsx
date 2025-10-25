import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Link, useNavigate } from "react-router-dom";
import useAuthUserStore from "@/stores/useAuthUserStore";
import "@/assets/css/home.css";



const Home = () => {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthUserStore();
  const [tours, setTours] = useState([]);
  const [showMenu, setShowMenu] = useState(false);

  // ✅ Nếu chưa login thì quay về trang Login
  useEffect(() => {
    if (!authUser) {
      navigate("/home"); // Chuyển về trang home
    }
  }, [authUser, navigate]);

  // ✅ Lấy danh sách tour
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const res = await api.get("home/tours");
        setTours(res.data || []);
      } catch (err) {
        console.error("Error fetching tours:", err);
      }
    };
    fetchTours();
  }, []);

  // ✅ Đăng xuất
  const handleLogout = () => {
    setAuthUser(null);
    navigate("/login");
  };

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="home-logo">AI-TRAVEL</div>
        <nav>
          <Link to="/home">Home</Link>
          <Link to="/tours">Tours</Link>
{!authUser ? (
  <>
    <Link to="/login">Login</Link>
    <Link to="/register">Register</Link>
  </>
) : (
  <div className="relative">
    <button
      className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold hover:opacity-90 transition"
      onClick={() => setShowMenu(!showMenu)}
    >
      {authUser.name?.charAt(0).toUpperCase() || "U"}
    </button>

    {showMenu && (
      <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-md w-48 z-50">
        <button
          onClick={handleLogout}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          Đăng xuất
        </button>
        <button
          onClick={() => navigate("/")}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          Đăng ký làm Provider
        </button>
                <button
          onClick={() => navigate("/provider-dashboard")}
          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          quản lý tour
        </button>
      </div>
    )}
  </div>
)}

        </nav>
      </header>

      {/* Hero section */}
      <section className="home-hero">
        <div className="hero-text">
          <h1>Welcome, {authUser?.name || "Traveler"}!</h1>
          <p>Discover the best tours powered by AI-Travel.</p>
          <Link to="/tours" className="hero-btn">
            Explore Tours
          </Link>
        </div>
      </section>

      {/* Tour list */}
      <section className="home-tours">
        <h2>Popular Tours</h2>
        <div className="tour-grid">
          {tours.length === 0 ? (
            <p className="no-tour">No tours available yet.</p>
          ) : (
            tours.map((tour) => (
              <div key={tour.tour_id} className="tour-card">
                <img
                  src={tour.image_url || "/default-tour.jpg"}
                  alt={tour.name}
                  className="tour-image"
                />
                <div className="tour-info">
                  <h3>{tour.name}</h3>
                  <p className="tour-desc">{tour.description?.slice(0, 100)}...</p>
                  <p className="tour-price">{tour.price} VND</p>
                  <Link to={`/tour/${tour.tour_id}`} className="tour-btn">
                    View Details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>© {new Date().getFullYear()} AI-Travel. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
