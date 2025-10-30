import { Navigate } from "react-router-dom";
import useAuthUserStore from "@/stores/useAuthUserStore";

const ProtectedRoute = ({ children, role }) => {
  const { authUser } = useAuthUserStore();

  // ❌ Nếu chưa đăng nhập → quay về trang login
  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  // ❌ Nếu có yêu cầu role mà user không đúng
  if (role && authUser.role !== role) {
    return <Navigate to="/home" replace />;
  }

  // ✅ Nếu hợp lệ → hiển thị component con
  return children;
};

export default ProtectedRoute;
