import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Route,
  Store,
  UserCog,
  Users,
  Truck,
  ShoppingCart,
  Receipt,
  FileText,
  ClipboardList,
  CreditCard,
  BarChart3,
  PieChart,
  Calendar,
  CalendarDays,
  Lock,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  History,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Route", path: "/admin/route", icon: Route },
  { name: "Shop", path: "/admin/shop", icon: Store },
  { name: "Admin", path: "/admin/admin", icon: UserCog },
  { name: "Salesman", path: "/admin/salesman", icon: Users },
  { name: "Supplier", path: "/admin/supplier", icon: Truck },
  { name: "Purchase", path: "/admin/purchase", icon: ShoppingCart },
  { name: "Expense", path: "/admin/expense", icon: Receipt },
  { type: "divider", label: "Reports" },
  { name: "Initial Loading Report", path: "/admin/initial-loading-report", icon: FileText },
  { name: "Transaction Report", path: "/admin/transaction-report", icon: CreditCard },
  { name: "Purchase Report", path: "/admin/purchase-report", icon: PieChart },
  { name: "Daily Submitted Report", path: "/admin/daily-submitted-report", icon: Calendar },
  { name: "Profit Loss Report", path: "/admin/profit-loss-report", icon: BarChart3 },
  { name: "Daily Summary", path: "/admin/daily-summary", icon: CalendarDays },
  { name: "Daily Summary History", path: "/admin/daily-submit-history", icon: History },
  { type: "divider", label: "Settings" },
  { name: "Change Password", path: "/admin/change-password", icon: Lock },
  { name: "Current Active Balance", path: "/admin/current-active-balance", icon: Wallet },
  { name: "Config Setting", path: "/admin/config-setting", icon: Settings },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  const isActive = (path) => location.pathname === path;

  const MenuItem = ({ item, onClick }) => {
    if (item.type === "divider") {
      return (
        <div className="px-4 py-2 mt-4 mb-1">
          <span className="text-sm font-semibold uppercase tracking-wider text-green-300/60">
            {item.label}
          </span>
        </div>
      );
    }

    const Icon = item.icon;
    const active = isActive(item.path);

    return (
      <button
        onClick={() => {
          navigate(item.path);
          onClick?.();
        }}
        data-testid={`menu-item-${item.path.slice(1)}`}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-base font-medium group
          ${active 
            ? "bg-green-500/20 text-white border-l-3 border-green-400" 
            : "text-green-100/80 hover:bg-green-500/10 hover:text-white"
          }`}
      >
        <Icon size={20} className={active ? "text-green-400" : "text-green-300/60 group-hover:text-green-300"} />
        <span className="flex-1 text-left truncate">{item.name}</span>
        {active && <ChevronRight size={16} className="text-green-400" />}
      </button>
    );
  };

  const SidebarContent = ({ onItemClick }) => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-green-700/30">
        <div className="flex items-center gap-3">
          <img
            src="https://customer-assets.emergentagent.com/job_ged-dashboard/artifacts/8aiex40c_Gowda%20egg%20dist%20logo.png"
            alt="Logo"
            className="w-12 h-12"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-semibold text-base truncate">Gowda Egg</h1>
            <p className="text-green-300/60 text-sm truncate">Distributors</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {menuItems.map((item, index) => (
            <MenuItem key={item.path || index} item={item} onClick={onItemClick} />
          ))}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="p-4 border-t border-green-700/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-green-300 font-semibold text-base">
              {user?.name?.charAt(0) || "S"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-base font-medium truncate">{user?.name || "Super Admin"}</p>
            <p className="text-green-300/60 text-sm truncate">{user?.email || ""}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          data-testid="logout-button"
          className="w-full justify-start text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-lg text-base"
        >
          <LogOut size={20} className="mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background" data-testid="dashboard-layout">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col sidebar-gradient fixed h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 sidebar-gradient z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="text-white hover:bg-green-500/20"
          >
            <X size={24} />
          </Button>
        </div>
        <SidebarContent onItemClick={() => setMobileMenuOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border h-16 flex items-center px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden mr-2"
            data-testid="mobile-menu-button"
          >
            <Menu size={24} />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-primary-950">
              {menuItems.find((item) => item.path === location.pathname)?.name || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base text-muted-foreground hidden sm:inline">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 lg:p-6 main-content min-h-[calc(100vh-4rem)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
