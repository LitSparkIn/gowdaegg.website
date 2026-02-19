import { useState, useEffect } from "react";

/**
 * Hook to get current user's role and permissions
 * @returns {{ user: object, role: string, isSuperadmin: boolean, isAdmin: boolean, isReadOnly: boolean, isLoading: boolean }}
 */
export const useUserRole = () => {
  const [user, setUser] = useState(() => {
    // Initialize from localStorage immediately to avoid flash
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  const role = user?.role || "";
  const isSuperadmin = role === "superadmin";
  const isAdmin = role === "admin";
  
  // Admin users have read-only access (no add, edit, delete)
  // Also return false during loading to show buttons by default
  const isReadOnly = isAdmin;

  return {
    user,
    role,
    isSuperadmin,
    isAdmin,
    isReadOnly,
  };
};

export default useUserRole;
