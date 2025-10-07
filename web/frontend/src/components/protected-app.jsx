import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import Loading from "./ui/loading";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { Navigate, useLocation } from "react-router";

const checkUser = async () => {
  try {
    const response = await api.get("/v1/users/me");
    return response.data;
  } catch (error) {
    return null;
  }
};

export const ProtectedApp = ({ children }) => {
  const { setAuthUser, authUser } = useAuthUserStore();
  const location = useLocation();

  const { isFetching, isPending, isLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      const user = await checkUser();
      if (user?.data) {
        setAuthUser(user.data);
        return user.data;
      }
      return null;
    },
    staleTime: Infinity,
    enabled: !authUser,
  });

  // Các route yêu cầu đăng nhập
  const protectedRoutes = ["booking", "payment", "profile", "history"];
  const currentPath = location.pathname.split("/")[1];

  if (isPending || isFetching || isLoading) {
    return <Loading />;
  }

  // Nếu chưa đăng nhập mà truy cập trang bảo vệ → chuyển về /login
  if (!authUser && protectedRoutes.includes(currentPath)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
