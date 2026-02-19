import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import RoutePage from "@/pages/RoutePage";
import ShopPage from "@/pages/ShopPage";
import AdminPage from "@/pages/AdminPage";
import SalesmanPage from "@/pages/SalesmanPage";
import SupplierPage from "@/pages/SupplierPage";
import ExpensePage from "@/pages/ExpensePage";
import PurchasePage from "@/pages/PurchasePage";
import InitialLoadingReportPage from "@/pages/InitialLoadingReportPage";
import TransactionReportPage from "@/pages/TransactionReportPage";
import DailySubmittedReportPage from "@/pages/DailySubmittedReportPage";
import DailySummaryPage from "@/pages/DailySummaryPage";
import DailySubmitHistoryPage from "@/pages/DailySubmitHistoryPage";
import PurchaseReportPage from "@/pages/PurchaseReportPage";
import ProfitLossReportPage from "@/pages/ProfitLossReportPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import ConfigSettingsPage from "@/pages/ConfigSettingsPage";
import ComingSoon from "@/pages/ComingSoon";

// Auth guard component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<Login />} />
          
          {/* Protected admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="route" element={<RoutePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="admin" element={<ComingSoon title="Admin Panel" />} />
            <Route path="salesman" element={<SalesmanPage />} />
            <Route path="supplier" element={<SupplierPage />} />
            <Route path="purchase" element={<PurchasePage />} />
            <Route path="expense" element={<ExpensePage />} />
            <Route path="initial-loading-report" element={<InitialLoadingReportPage />} />
            <Route path="route-previous-dues-report" element={<ComingSoon title="Route Previous Dues Report" />} />
            <Route path="transaction-report" element={<TransactionReportPage />} />
            <Route path="route-report" element={<ComingSoon title="Route Report" />} />
            <Route path="purchase-report" element={<PurchaseReportPage />} />
            <Route path="daily-submitted-report" element={<DailySubmittedReportPage />} />
            <Route path="profit-loss-report" element={<ProfitLossReportPage />} />
            <Route path="daily-summary" element={<DailySummaryPage />} />
            <Route path="daily-submit-history" element={<DailySubmitHistoryPage />} />
            <Route path="submit-summary-by-date" element={<ComingSoon title="Submit Summary By Date" />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
            <Route path="current-active-balance" element={<ComingSoon title="Current Active Balance" />} />
            <Route path="config-setting" element={<ConfigSettingsPage />} />
          </Route>
          
          {/* Redirect old login to new */}
          <Route path="/login" element={<Navigate to="/admin/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
