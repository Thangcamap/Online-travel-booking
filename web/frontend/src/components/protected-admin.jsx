import { Navigate } from "react-router";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import Loading from "./ui/loading";
import { socket } from "@/lib/socket";
import useAudioNotification from "@/hooks/use-audio-player";

const checkUser = async () => {
  try {
    const response = await api.get("/v1/users/me");
    return response.data;
  } catch (error) {
    return null;
  }
};

export const ProtectedAdmin = ({ children }) => {
  useAudioNotification();
  const { authUser, setAuthUser } = useAuthUserStore();

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

  if (isPending || isFetching || isLoading) {
    return <Loading />;
  }

  // Nếu không đăng nhập
  if (!authUser && !isFetching) {
    return <Navigate to="/login" replace />;
  }

  // Nếu không phải admin thì chặn truy cập
  if (authUser?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // Tự động kết nối socket cho admin
  socket.emit("joinAdminRoom", { userId: authUser.userId, role: authUser.role });

  return children;
};
