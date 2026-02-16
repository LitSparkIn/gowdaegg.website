import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Loader2, 
  CalendarIcon, 
  TrendingUp,
  TrendingDown,
  ArrowRight,
  IndianRupee,
  Package,
  ShoppingCart,
  Receipt,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProfitLossReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // Filters - default to today
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      
      const fromDateStr = format(fromDate, "yyyy-MM-dd");
      const toDateStr = format(toDate, "yyyy-MM-dd");
      
      // Fetch purchases, sales, and expenses for the date range
      const [purchasesRes, salesRes, expensesRes] = await Promise.all([
        api.get(`/purchases?from_date=${fromDateStr}&to_date=${toDateStr}`),
        api.get(`/sales?from_date=${fromDateStr}&to_date=${toDateStr}`),
        api.get(`/expenses?from_date=${fromDateStr}&to_date=${toDateStr}`)
      ]);
      
      const purchasesData = purchasesRes.data.data || {};
      const salesData = salesRes.data.data || {};
      const expensesData = expensesRes.data || {};
      
      // Calculate totals
      const totalPurchaseCrates = purchasesData.purchases?.reduce((sum, p) => sum + p.crates, 0) || 0;
      const totalPurchaseValue = purchasesData.total_amount || 0;
      const avgPurchaseRate = totalPurchaseCrates > 0 ? totalPurchaseValue / (totalPurchaseCrates * 30) : 0;
      
      const totalSaleCrates = salesData.total_crates || 0;
      const totalSaleValue = salesData.total_order_amount || 0;
      const totalCollected = salesData.total_collected || 0;
      const totalPending = salesData.total_pending || 0;
      const avgSaleRate = totalSaleCrates > 0 ? totalSaleValue / (totalSaleCrates * 30) : 0;
      
      const totalExpenses = expensesData.total_amount || 0;
      
      // Calculate COGS (Cost of Goods Sold) = crates sold * 30 * avg purchase rate
      const cogs = totalSaleCrates * 30 * avgPurchaseRate;
      
      // Gross Profit = Sales - COGS
      const grossProfit = totalSaleValue - cogs;
      
      // Net Profit = Gross Profit - Expenses
      const netProfit = grossProfit - totalExpenses;
      
      // Profit Margin
      const profitMargin = totalSaleValue > 0 ? (netProfit / totalSaleValue) * 100 : 0;
      
      setData({
        purchases: {
          crates: totalPurchaseCrates,
          value: totalPurchaseValue,
          avgRate: avgPurchaseRate,
          count: purchasesData.total_records || 0
        },
        sales: {
          crates: totalSaleCrates,
          value: totalSaleValue,
          collected: totalCollected,
          pending: totalPending,
          avgRate: avgSaleRate,
          count: salesData.total_records || 0
        },
        expenses: {
          total: totalExpenses,
          count: expensesData.total || 0
        },
        summary: {
          cogs,
          grossProfit,
          netProfit,
          profitMargin
        }
      });
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error("Failed to fetch profit/loss report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(num || 0);
  };

  const SummaryRow = ({ label, value, valueClass = "", calculation = "" }) => (
    <div className="flex justify-between items-center py-3 px-4 border-b border-gray-100 last:border-b-0">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {calculation && <p className="text-xs text-muted-foreground">{calculation}</p>}
      </div>
      <span className={cn("font-semibold", valueClass)}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="profit-loss-report-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Profit & Loss Report</h1>
          <p className="text-muted-foreground">Financial overview for selected period</p>
        </div>
        <div className="flex items-center gap-3">
          {/* From Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[150px] justify-start text-left font-normal"
                data-testid="from-date-btn"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(fromDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(date) => date && setFromDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">to</span>

          {/* To Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[150px] justify-start text-left font-normal"
                data-testid="to-date-btn"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(toDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(date) => date && setToDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchReport}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className={cn(
              "border-2",
              data.summary.netProfit >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    data.summary.netProfit >= 0 ? "bg-green-500" : "bg-red-500"
                  )}>
                    {data.summary.netProfit >= 0 ? (
                      <TrendingUp size={24} className="text-white" />
                    ) : (
                      <TrendingDown size={24} className="text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Profit/Loss</p>
                    <p className={cn(
                      "text-xl font-bold",
                      data.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(data.summary.netProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                    <IndianRupee size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-primary-950">{formatCurrency(data.sales.value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                    <ShoppingCart size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Purchases</p>
                    <p className="text-xl font-bold text-primary-950">{formatCurrency(data.purchases.value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
                    <Receipt size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Expenses</p>
                    <p className="text-xl font-bold text-primary-950">{formatCurrency(data.expenses.total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchases */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart size={20} className="text-purple-600" />
                  Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SummaryRow label="Total Crates Purchased" value={formatNumber(data.purchases.crates)} />
                <SummaryRow label="Purchase Value" value={formatCurrency(data.purchases.value)} valueClass="text-purple-600" />
                <SummaryRow 
                  label="Average Purchase Rate" 
                  value={`₹${data.purchases.avgRate.toFixed(2)}/egg`}
                  calculation="Purchase Value ÷ (Crates × 30)"
                />
                <SummaryRow label="Number of Purchases" value={formatNumber(data.purchases.count)} />
              </CardContent>
            </Card>

            {/* Sales */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package size={20} className="text-green-600" />
                  Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SummaryRow label="Total Crates Sold" value={formatNumber(data.sales.crates)} />
                <SummaryRow label="Sales Value" value={formatCurrency(data.sales.value)} valueClass="text-green-600" />
                <SummaryRow 
                  label="Average Sale Rate" 
                  value={`₹${data.sales.avgRate.toFixed(2)}/egg`}
                  calculation="Sales Value ÷ (Crates × 30)"
                />
                <SummaryRow label="Amount Collected" value={formatCurrency(data.sales.collected)} valueClass="text-green-600" />
                <SummaryRow label="Amount Pending" value={formatCurrency(data.sales.pending)} valueClass="text-red-600" />
              </CardContent>
            </Card>
          </div>

          {/* Profit Calculation */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                Profit/Loss Calculation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side - Calculation Steps */}
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Sales Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(data.sales.value)}</p>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 font-bold">−</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Cost of Goods Sold (COGS)</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(data.summary.cogs)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatNumber(data.sales.crates)} crates × 30 × ₹{data.purchases.avgRate.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">=</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Gross Profit</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      data.summary.grossProfit >= 0 ? "text-blue-600" : "text-red-600"
                    )}>
                      {formatCurrency(data.summary.grossProfit)}
                    </p>
                  </div>
                </div>

                {/* Right Side - Final Calculation */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Gross Profit</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.summary.grossProfit)}</p>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 font-bold">−</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.expenses.total)}</p>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-600 font-bold">=</span>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "p-4 rounded-lg",
                    data.summary.netProfit >= 0 ? "bg-green-100" : "bg-red-100"
                  )}>
                    <p className="text-sm text-muted-foreground mb-1">Net Profit/Loss</p>
                    <p className={cn(
                      "text-3xl font-bold",
                      data.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(data.summary.netProfit)}
                    </p>
                    <p className="text-sm mt-1">
                      Profit Margin: <span className="font-semibold">{data.summary.profitMargin.toFixed(1)}%</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          No data available
        </div>
      )}
    </div>
  );
};

export default ProfitLossReportPage;
