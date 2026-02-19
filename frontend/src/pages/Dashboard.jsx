import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  TrendingUp,
  Users,
  Truck,
  IndianRupee,
  ArrowUpRight,
  ShoppingCart,
  Receipt,
  Store,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  FileText,
  CreditCard,
  CalendarDays,
  ClipboardList,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const PAYMENT_COLORS = {
  Cash: "#22c55e",
  Cheque: "#3b82f6",
  Online: "#8b5cf6",
  Bill: "#f59e0b",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  
  // Clear Data state
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [collectionCounts, setCollectionCounts] = useState({});
  
  // Egg Rate state
  const [eggRate, setEggRate] = useState("");
  const [updatingRate, setUpdatingRate] = useState(false);

  const CLEAR_OPTIONS = [
    { key: "routes", label: "Routes", icon: Truck, color: "text-blue-600" },
    { key: "shops", label: "Shops", icon: Store, color: "text-purple-600" },
    { key: "admins", label: "Admins", icon: Users, color: "text-red-600" },
    { key: "salesmen", label: "Salesmen", icon: Users, color: "text-green-600" },
    { key: "suppliers", label: "Suppliers", icon: ShoppingCart, color: "text-orange-600" },
    { key: "purchases", label: "Purchases", icon: Package, color: "text-cyan-600" },
    { key: "expenses", label: "Expenses", icon: Receipt, color: "text-pink-600" },
    { key: "daily_summaries", label: "Daily Summary", icon: CalendarDays, color: "text-indigo-600" },
  ];

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await api.get("/dashboard");
      setData(response.data.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEggRate = async () => {
    try {
      const response = await api.get("/settings");
      const rate = response.data.data?.todays_egg_rate || 0;
      setEggRate(rate.toString());
    } catch (error) {
      console.error("Error fetching egg rate:", error);
    }
  };

  const updateEggRate = async () => {
    if (!eggRate || isNaN(parseFloat(eggRate))) {
      toast.error("Please enter a valid rate");
      return;
    }
    
    try {
      setUpdatingRate(true);
      await api.put("/settings", { todays_egg_rate: parseFloat(eggRate) });
      toast.success("Egg rate updated successfully");
    } catch (error) {
      console.error("Error updating egg rate:", error);
      toast.error("Failed to update egg rate");
    } finally {
      setUpdatingRate(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchDashboardData();
    fetchEggRate();
  }, []);

  const fetchCollectionCounts = async () => {
    try {
      const response = await api.get("/admin/collection-counts");
      setCollectionCounts(response.data.data || {});
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const handleOpenClearDialog = () => {
    setSelectedCollections([]);
    fetchCollectionCounts();
    setShowClearDialog(true);
  };

  const toggleCollection = (key) => {
    setSelectedCollections(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleClearData = async () => {
    if (selectedCollections.length === 0) {
      toast.error("Please select at least one item to clear");
      return;
    }
    
    try {
      setClearing(true);
      const response = await api.post("/admin/clear-data", {
        collections: selectedCollections
      });
      
      const result = response.data.data;
      const totalDeleted = result.cleared.reduce((sum, c) => sum + c.deleted_count, 0);
      
      toast.success(`Cleared ${totalDeleted} records from ${result.cleared.length} collections`);
      setShowClearDialog(false);
      setSelectedCollections([]);
      
      // Refresh dashboard data
      fetchDashboardData(true);
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error(error.response?.data?.detail || "Failed to clear data");
    } finally {
      setClearing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(num || 0);
  };

  // Prepare payment breakdown data for pie chart
  const paymentPieData = data?.payment_breakdown
    ? Object.entries(data.payment_breakdown).map(([name, value]) => ({
        name,
        value: value.amount,
        count: value.count,
      }))
    : [];

  // Prepare transaction type data
  const transactionPieData = data?.transaction_breakdown
    ? Object.entries(data.transaction_breakdown).map(([name, value]) => ({
        name,
        value: value.count,
        amount: value.amount,
      }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  const today = data?.today || {};
  const overall = data?.overall || {};
  const salesmenStatus = data?.salesman_status || {};

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Welcome Section */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-900 to-primary-700 p-6 lg:p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold mb-2">
              Welcome back, {user?.name || "Super Admin"}!
            </h1>
            <p className="text-green-100/80 font-light">
              Here's what's happening with your egg distribution business today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenClearDialog}
              className="bg-red-500/20 hover:bg-red-500/30 text-white border-0"
              data-testid="clear-data-btn"
            >
              <Trash2 size={16} className="mr-2" />
              Clear Data
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <RefreshCw size={16} className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <img
              src="https://customer-assets.emergentagent.com/job_ged-dashboard/artifacts/8aiex40c_Gowda%20egg%20dist%20logo.png"
              alt="Logo"
              className="w-16 h-16 lg:w-20 lg:h-20 opacity-90"
            />
          </div>
        </div>
      </div>

      {/* Today's Egg Rate */}
      <Card className="border-border/50 bg-white">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Today's Egg Rate */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <IndianRupee size={20} className="text-primary" />
                <span className="font-medium text-primary-950">Today's Egg Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter rate per egg"
                  value={eggRate}
                  onChange={(e) => setEggRate(e.target.value)}
                  className="w-32"
                  data-testid="egg-rate-input"
                />
                <Button
                  onClick={updateEggRate}
                  disabled={updatingRate}
                  size="sm"
                  data-testid="update-egg-rate-btn"
                >
                  {updatingRate ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Update"
                  )}
                </Button>
              </div>
            </div>
            
            {/* Allow Multiple Reports Toggle */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-col">
                <span className="font-medium text-sm text-primary-950">Allow Multiple Reports</span>
                <span className="text-xs text-muted-foreground">
                  {allowMultipleReports ? "Salesmen can add sales after report submission" : "Sales blocked after report submission"}
                </span>
              </div>
              <Switch
                checked={allowMultipleReports}
                onCheckedChange={toggleMultipleReports}
                disabled={updatingMultipleReports}
                data-testid="allow-multiple-reports-toggle"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary"
          onClick={() => navigate("/admin/initial-loading-report")}
          data-testid="quick-link-initial-load"
        >
          <FileText size={22} className="text-primary" />
          <span className="font-medium text-xs sm:text-sm">Initial Load</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary"
          onClick={() => navigate("/admin/transaction-report")}
          data-testid="quick-link-transaction"
        >
          <CreditCard size={22} className="text-primary" />
          <span className="font-medium text-xs sm:text-sm">Transactions</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary"
          onClick={() => navigate("/admin/daily-summary")}
          data-testid="quick-link-daily-summary"
        >
          <CalendarDays size={22} className="text-primary" />
          <span className="font-medium text-xs sm:text-sm">Daily Summary</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary"
          onClick={() => navigate("/admin/daily-submitted-report")}
          data-testid="quick-link-daily-reports"
        >
          <ClipboardList size={22} className="text-primary" />
          <span className="font-medium text-xs sm:text-sm">Daily Reports</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary"
          onClick={() => navigate("/admin/purchase")}
          data-testid="quick-link-purchase"
        >
          <ShoppingCart size={22} className="text-primary" />
          <span className="font-medium text-xs sm:text-sm">Purchase</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary"
          onClick={() => navigate("/admin/expense")}
          data-testid="quick-link-expense"
        >
          <Receipt size={22} className="text-primary" />
          <span className="font-medium text-xs sm:text-sm">Expenses</span>
        </Button>
      </div>

      {/* Today's Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-border/50 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                <IndianRupee size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today's Sales</p>
                <p className="text-lg font-semibold text-primary-950">
                  {formatCurrency(today.sales?.total_order_amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(today.sales?.total_collected)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                <Clock size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(today.sales?.total_pending)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                <Package size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Crates Sold</p>
                <p className="text-lg font-semibold text-primary-950">
                  {formatNumber(today.sales?.total_crates)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                <ShoppingCart size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Purchases</p>
                <p className="text-lg font-semibold text-primary-950">
                  {formatNumber(today.purchases?.total_crates)} crates
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center">
                <Receipt size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-semibold text-primary-950">
                  {formatCurrency(today.expenses?.total_expense)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Sales Trend */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-primary-950 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              7-Day Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.sales_trend || []}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Day: ${label}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total_sales"
                    name="Sales"
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_collected"
                    name="Collected"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorCollected)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Crates Movement */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-primary-950 flex items-center gap-2">
              <Package size={20} className="text-primary" />
              7-Day Crates Movement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.sales_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip formatter={(value) => [formatNumber(value), "Crates"]} />
                  <Bar dataKey="total_crates" name="Crates Sold" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Breakdown Pie */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-primary-950">
              Today's Payment Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {paymentPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {paymentPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PAYMENT_COLORS[entry.name] || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No transactions today
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {paymentPieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PAYMENT_COLORS[item.name] || COLORS[index % COLORS.length] }}
                  />
                  <span>{item.name}: {item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Type Breakdown */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-primary-950">
              Sales vs Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {transactionPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={transactionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [value, props.payload.name]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No transactions today
                </div>
              )}
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Sales</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Collections</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salesman Submission Status */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-primary-950 flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Salesman Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-green-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <span className="text-sm font-medium">Submitted</span>
                </div>
                <span className="text-lg font-bold text-green-600">{salesmenStatus.submitted || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-orange-50">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-orange-600" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <span className="text-lg font-bold text-orange-600">{salesmenStatus.pending || 0}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{
                    width: `${salesmenStatus.total ? (salesmenStatus.submitted / salesmenStatus.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {salesmenStatus.submitted || 0} of {salesmenStatus.total || 0} salesmen submitted today
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Stats */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-primary-950">
              Business Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-blue-50">
                <Truck size={24} className="mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-primary-950">{overall.routes || 0}</p>
                <p className="text-xs text-muted-foreground">Routes</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-purple-50">
                <Store size={24} className="mx-auto text-purple-600 mb-2" />
                <p className="text-2xl font-bold text-primary-950">{overall.shops || 0}</p>
                <p className="text-xs text-muted-foreground">Shops</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-green-50">
                <Users size={24} className="mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-primary-950">{overall.active_salesmen || 0}</p>
                <p className="text-xs text-muted-foreground">Active Salesmen</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-orange-50">
                <ShoppingCart size={24} className="mx-auto text-orange-600 mb-2" />
                <p className="text-2xl font-bold text-primary-950">{overall.suppliers || 0}</p>
                <p className="text-xs text-muted-foreground">Suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Salesmen Today */}
        <Card className="border-border/50 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-primary-950 flex items-center gap-2">
              <ArrowUpRight size={20} className="text-green-500" />
              Top Performers Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.top_salesmen?.length > 0 ? (
              <div className="space-y-3">
                {data.top_salesmen.map((salesman, index) => (
                  <div
                    key={salesman.salesman_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-400" : "bg-gray-300"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-primary-950">{salesman.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {salesman.transactions} txns • {salesman.total_crates} crates
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(salesman.total_collected)}</p>
                      <p className="text-xs text-muted-foreground">collected</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No sales recorded today yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-border/50 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-primary-950">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recent_transactions?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Salesman</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Shop</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Crates</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Collected</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Payment</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_transactions.map((txn) => (
                    <tr key={txn.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">{txn.salesman_name}</td>
                      <td className="py-3 px-3">{txn.shop_name}</td>
                      <td className="py-3 px-3 text-right">{txn.crates}</td>
                      <td className="py-3 px-3 text-right text-green-600 font-medium">
                        {formatCurrency(txn.collected_amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            txn.payment_type === "Cash"
                              ? "bg-green-100 text-green-700"
                              : txn.payment_type === "Online"
                              ? "bg-purple-100 text-purple-700"
                              : txn.payment_type === "Cheque"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {txn.payment_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {txn.sale_time ? txn.sale_time.substring(0, 5) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent transactions
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear Data Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              Clear Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select the data you want to permanently delete. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto">
            {CLEAR_OPTIONS.map(({ key, label, icon: Icon, color }) => (
              <div
                key={key}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCollections.includes(key) 
                    ? "border-red-300 bg-red-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => toggleCollection(key)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedCollections.includes(key)}
                    onCheckedChange={() => toggleCollection(key)}
                  />
                  <Icon size={18} className={color} />
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {collectionCounts[key] || 0} records
                </span>
              </div>
            ))}
          </div>
          
          {selectedCollections.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <strong>Warning:</strong> You are about to delete data from {selectedCollections.length} collection(s). 
              This will permanently remove all records.
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={clearing || selectedCollections.length === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {clearing ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Clear Selected
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
