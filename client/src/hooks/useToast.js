import { useContext } from "react";
import { ToastContext } from "../context/contexts";

// const { showToast } = useToast();  showToast("Saved!", "success")
export default function useToast() {
  return useContext(ToastContext);
}
