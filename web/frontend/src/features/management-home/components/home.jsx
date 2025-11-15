import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Link, useNavigate } from "react-router-dom";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { Menu } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import AIChat from "../../AI/components/AI";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/lib/socket"; 
import Navbar from "@/components/Navbar";




const Home = () => {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthUserStore();
  const [tours, setTours] = useState([]);
  const [search, setSearch] = useState("");
  const [showChat, setShowChat] = useState(false);


  // Nếu chưa login → quay về login
  // useEffect(() => {
  //   if (!authUser) navigate("/login");
  // }, [authUser, navigate]);

  // Khởi tạo socket cho mọi user để lắng nghe trạng thái tài khoản
  useEffect(() => {
    if (!authUser?.user_id) return;
    if (!socket.connected) socket.connect();
    socket.emit("join_user", authUser.user_id);

    // Lắng nghe sự kiện tài khoản bị khóa
    socket.on("account_status_changed", (newStatus) => {
      const updatedUser = { ...authUser, status: newStatus };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setAuthUser(updatedUser);
      if (newStatus !== "active") {
        // Chặn truy cập các trang provider, quản lý tour, đăng ký provider
        const currentPath = window.location.pathname;
        if (
          currentPath.includes("/provider-dashboard") ||
          currentPath.includes("/register-provider") ||
          currentPath.includes("/create-provider")
        ) {
          localStorage.clear();
          setTimeout(() => (window.location.href = "/login"), 2000);
        } else {
          // Nếu đang ở home, hiển thị cảnh báo
          alert("Tài khoản của bạn đã bị khóa. Một số tính năng sẽ bị hạn chế!");
        }
      }
    });

    return () => {
      socket.off("account_status_changed");
    };
  }, [authUser, setAuthUser]);

  // Lấy danh sách tour
  
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const res = await api.get("/home/tours");
        //const res = await api.get("/tours");

        setTours(res.data || []);
      } catch (err) {
        console.error("Error fetching tours:", err);
      }
    };
    fetchTours();
  }, []);

// 🔹 Socket realtime: lắng nghe khi admin khóa/mở provider
useEffect(() => {
  socket.on("provider_status_changed", (data) => {
    console.log("📢 Provider status changed:", data);

    if (data.newStatus === "suspended") {
      setTours((prevTours) => prevTours.filter((t) => t.provider_id !== data.provider_id));
    }

    if (data.newStatus === "active") {
      api.get("/home/tours").then((res) => setTours(res.data || []));
      //api.get("/tours").then((res) => setTours(res.data || []));

    }
  });

  return () => {
    socket.off("provider_status_changed");
  };
}, []);


  // Đăng xuất
  // const handleLogout = () => {
  //   setAuthUser(null);
  //   navigate("/home");
  // };
const handleLogout = () => {
  localStorage.removeItem("user"); 
  setAuthUser(null);               
  navigate("/home");               
  window.location.reload();        
};


  // Lọc tour theo từ khóa
  const filteredTours = tours.filter((tour) =>
    tour.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      {/* HEADER */}
       <Navbar />

      {/* HERO SECTION */}
<section
  className="relative w-full h-[65vh] flex flex-col justify-center items-center text-center bg-cover bg-center"
  style={{
    backgroundImage: "url('/src/assets/images/Home1.png')",
  }}
>
  <div className="absolute inset-0 bg-black/28"></div>

  <h1 className="text-6xl font-bold mb-7 text-white drop-shadow-lg">
    Smart Tourism in Da Nang
  </h1>
  <p className="text-lg mb-60 text-gray-100 opacity-110">
    An innovative online travel booking platform that uses AI to recommend personalized destinations and experiences.
  </p>
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
              {filteredTours.slice(0, 100).map((tour) => (
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
                        to={`/tours/${tour.tour_id}`}
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
          {/* 🔹 Nút & cửa sổ Chat AI */}
<div className="fixed bottom-6 right-6 z-50">
  <AnimatePresence>
    {showChat ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div className="bg-white w-96 max-h-[75vh] shadow-2xl rounded-2xl overflow-y-auto border border-gray-200 flex flex-col">

          <div className="flex justify-between items-center px-4 py-2 bg-orange-500 text-white">
            <h3 className="font-semibold">AI Travel Assistant</h3>
            <button onClick={() => setShowChat(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="h-full">
            <AIChat />
          </div>
        </div>
      </motion.div>
    ) : (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setShowChat(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-lg"
      >
        <MessageCircle size={28} />
      </motion.button>
    )}
  </AnimatePresence>
</div>

        </div>
      </footer>
    </div>
  );
};


export default Home;
