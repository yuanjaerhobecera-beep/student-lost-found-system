import { createContext } from "react";

// The context "boxes". Providers fill them, hooks read them.
export const AuthContext = createContext(null);
export const ToastContext = createContext(null);
export const NotificationContext = createContext(null);
