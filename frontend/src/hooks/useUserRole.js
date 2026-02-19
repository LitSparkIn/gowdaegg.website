import { useState, useEffect } from "react";

/**
 * Hook to get current user's role and permissions
 * @returns {{ user: object, role: string, isSuperadmin: boolean, isAdmin: boolean, isReadOnly: boolean }}
 */
export const useUserRole = () => {
  const [user, setUser] = useState(null);

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
