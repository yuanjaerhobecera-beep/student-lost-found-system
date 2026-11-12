import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import api from "../services/api";
import { NotificationContext } from "./contexts";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";

// Connects to Socket.IO when logged in, shows a toast for each new notification,
// and keeps the unread counter on the bell icon up to date.
export default function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState(null);

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", { params: { limit: 1 } });
      setUnreadCount(data.unreadCount);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }
    refreshUnread();

    const socket = io({ withCredentials: true });
    let retried = false;

    socket.on("notification", (n) => {
      setUnreadCount((c) => c + 1);
      setLatest(n);
      showToast(n.message, "info", n.title);
    });

    // If the login token expired, refresh it once and reconnect
    socket.on("connect_error", async () => {
      if (retried) return;
      retried = true;
      try {
        await api.post("/auth/refresh");
        socket.connect();
      } catch {
        /* the API will log the user out if the session is really over */
      }
    });
    socket.on("connect", () => (retried = false));

    return () => socket.disconnect();
  }, [user, refreshUnread, showToast]);

  const value = useMemo(() => ({ unreadCount, setUnreadCount, refreshUnread, latest }), [unreadCount, refreshUnread, latest]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
