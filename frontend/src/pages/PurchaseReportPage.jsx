import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  CalendarIcon, 
  ShoppingCart,
  X,
  IndianRupee,
  Package,
  CreditCard,
  Clock,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PurchaseReportPage = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    total_records: 0,
    total_amount: 0,
    total_paid: 0,
    total_pending: 0
  });
  
  // Filters - default to today
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get(`/suppliers`);
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      let url = `/purchases`;
      const params = new URLSearchParams();
      
      if (fromDate) {
        params.append("from_date", format(fromDate, "yyyy-MM-dd"));
      }
      if (toDate) {
        params.append("to_date", format(toDate, "yyyy-MM-dd"));
      }
      if (selectedSupplier) {
        params.append("supplier_id", selectedSupplier);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      const data = response.data.data || {};
      setPurchases(data.purchases || []);
      setTotals({
        total_records: data.total_records || 0,
        total_amount: data.total_amount || 0,
        total_paid: data.total_paid || 0,
        total_pending: data.total_pending || 0
      });
    } catch (error) {
      console.error("Error fetching purchases:", error);
      toast.error("Failed to fetch purchases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fromDate, toDate, selectedSupplier]);

  const clearFilters = () => {
    const today = new Date();
    setFromDate(today);
    setToDate(today);
    setSelectedSupplier("");
  };

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

  return (
    <div className="space-y-6" data-testid="purchase-report-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Purchase Report</h1>
          <p className="text-muted-foreground">View all purchase transactions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <ShoppingCart size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Purchases</p>
                <p className="text-lg font-semibold text-primary-950">{formatNumber(totals.total_records)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                <IndianRupee size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-lg font-semibold text-primary-950">{formatCurrency(totals.total_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(totals.total_paid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                <Clock size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pending</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(totals.total_pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            {/* From Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[150px] justify-start text-left font-normal",
                    !fromDate && "text-muted-foreground"
                  )}
                  data-testid="from-date-btn"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "dd MMM yyyy") : "From Date"}
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

            {/* To Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[150px] justify-start text-left font-normal",
                    !toDate && "text-muted-foreground"
                  )}
                  data-testid="to-date-btn"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "dd MMM yyyy") : "To Date"}
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

            {/* Supplier Filter */}
            <Select value={selectedSupplier || "all"} onValueChange={(val) => setSelectedSupplier(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[180px]" data-testid="supplier-filter">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(fromDate || toDate || selectedSupplier) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
                data-testid="clear-filters-btn"
              >
                <X size={16} className="mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package size={20} className="text-primary" />
            Purchases ({formatNumber(totals.total_records)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No purchases found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Time</th>
                    <th className="text-left py-3 px-4 font-medium">Supplier</th>
                    <th className="text-right py-3 px-4 font-medium">Crates</th>
                    <th className="text-right py-3 px-4 font-medium">Rate</th>
                    <th className="text-right py-3 px-4 font-medium">Total</th>
                    <th className="text-right py-3 px-4 font-medium">Prev Dues</th>
                    <th className="text-right py-3 px-4 font-medium">Grand Total</th>
                    <th className="text-right py-3 px-4 font-medium">Paid</th>
                    <th className="text-right py-3 px-4 font-medium">Pending</th>
                    <th className="text-center py-3 px-4 font-medium">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase, index) => (
                    <tr 
                      key={purchase.id} 
                      className={cn(
                        "border-b last:border-b-0",
                        index % 2 === 0 ? "bg-white" : "bg-muted/30"
                      )}
                    >
                      <td className="py-3 px-4">{purchase.purchase_date}</td>
                      <td className="py-3 px-4">{purchase.purchase_time?.substring(0, 5) || "-"}</td>
                      <td className="py-3 px-4 font-medium">{purchase.supplier_name}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(purchase.crates)}</td>
                      <td className="py-3 px-4 text-right">₹{purchase.price}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(purchase.total)}</td>
                      <td className="py-3 px-4 text-right text-orange-600">{formatCurrency(purchase.previous_dues)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(purchase.grand_total)}</td>
                      <td className="py-3 px-4 text-right text-green-600">{formatCurrency(purchase.amount_paid)}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">{formatCurrency(purchase.pending_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          purchase.payment_mode === "Cash" ? "bg-green-100 text-green-700" :
                          purchase.payment_mode === "Cheque" ? "bg-blue-100 text-blue-700" :
                          purchase.payment_mode === "Online" ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        )}>
                          {purchase.payment_mode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseReportPage;
