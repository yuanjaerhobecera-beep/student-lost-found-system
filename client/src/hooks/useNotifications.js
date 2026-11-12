import { useContext } from "react";
import { NotificationContext } from "../context/contexts";

export default function useNotifications() {
  return useContext(NotificationContext);
}
