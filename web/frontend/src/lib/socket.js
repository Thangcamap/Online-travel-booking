import { io } from "socket.io-client";

const URL = import.meta.env.VITE_APP_API_URL;

export const socket = io(URL, {
  withCredentials: true,
  autoConnect: false,
  transports: ["websocket"],
});
