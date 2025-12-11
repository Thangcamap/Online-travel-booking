import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import CreateProvided from "./features/management-provied/components/create-provied.jsx";
import AdminDashboard from "./features/management-admin/components/AdminDashboard.jsx";
import ProviderDashboard from "@/features/management-provied/components/ProviderDashboard";
import Login from "./features/management-login/components/login.jsx";
import Register from "./features/management-login/components/register.jsx";
import Home from "./features/management-home/components/home.jsx";
import AI from "./features/AI/components/AI";
import ProtectedRoute from "@/components/ProtectedRoute";  
import useAuthUserStore from "@/stores/useAuthUserStore"; 
import PaymentPage from "./features/payments/components/PaymentPage.jsx"; 
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import { initUserSocket } from "@/lib/socket-init"; 
import AboutPage from "./features/about/components/AboutPage";
import ToursPage from "./features/tours/components/ToursPage.jsx";
import TourDetailPage from "./features/tours/components/TourDetailPage.jsx";
import ProfilePage from "./features/profile/components/ProfilePage";

const queryClient = new QueryClient();

function App() {
  const { authUser, setAuthUser } = useAuthUserStore();

  useEffect(() => {
  const savedUser = localStorage.getItem("user");
  if (savedUser) setAuthUser(JSON.parse(savedUser));
}, [setAuthUser]);

useEffect(() => {
  const user = useAuthUserStore.getState().authUser;
  if (user?.user_id) {
    initUserSocket();
  }
}, [useAuthUserStore.getState().authUser]); 


  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Trang đăng nhập & đăng ký */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Trang admin - chỉ admin mới vào được */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/*  Trang nhà cung cấp */}
              <Route path="/provider-dashboard" element={<ProviderDashboard />} />

              {/* Các trang khác */}
              <Route path="/" element={<CreateProvided />} />
              <Route path="/ai" element={<AI />} />
               <Route path="/home"element={<Home />}/>
               <Route path="/payments" element={<PaymentPage />} />  
              <Route path="/home" element={<Home />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/tours" element={<ToursPage />} />
              <Route path="/tours/:tourId" element={<TourDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />

            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
