import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CreditCard, Loader2, CalendarIcon, Filter, X, Package, IndianRupee, ImageIcon, MessageCircle, Download, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TransactionReportPage = () => {
  const [sales, setSales] = useState([]);
  const [sendingWhatsApp, setSendingWhatsApp] = useState({});
  const [salesmen, setSalesmen] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    total_records: 0,
    total_crates: 0,
    total_order_amount: 0,
    total_collected: 0,
    total_pending: 0,
    total_return_tray: 0
  });
  
  // Filters - default to today
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [selectedSalesman, setSelectedSalesman] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchSalesmen = async () => {
    try {
      const response = await axios.get(`${API}/salesmen`, getAuthHeaders());
      setSalesmen(response.data.salesmen || []);
    } catch (error) {
      console.error("Error fetching salesmen:", error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await axios.get(`${API}/routes`, getAuthHeaders());
      setRoutes(response.data.routes || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      let url = `${API}/sales`;
      const params = new URLSearchParams();
      
      if (fromDate) {
        params.append("from_date", format(fromDate, "yyyy-MM-dd"));
      }
      if (toDate) {
        params.append("to_date", format(toDate, "yyyy-MM-dd"));
      }
      if (selectedSalesman) {
        params.append("salesman_id", selectedSalesman);
      }
      if (selectedType) {
        params.append("transaction_type", selectedType);
      }
      if (selectedPayment) {
        params.append("payment_type", selectedPayment);
      }
      if (selectedRoute) {
        params.append("route_id", selectedRoute);
      }
      if (selectedImage) {
        params.append("has_image", selectedImage);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url, getAuthHeaders());
      const data = response.data.data || {};
      setSales(data.sales || []);
      setTotals({
        total_records: data.total_records || 0,
        total_crates: data.total_crates || 0,
        total_order_amount: data.total_order_amount || 0,
        total_collected: data.total_collected || 0,
        total_pending: data.total_pending || 0,
        total_return_tray: data.total_return_tray || 0
      });
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
    fetchRoutes();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fromDate, toDate, selectedSalesman, selectedType, selectedPayment, selectedRoute, selectedImage]);

  const clearFilters = () => {
    const today = new Date();
    setFromDate(today);
    setToDate(today);
    setSelectedSalesman("");
    setSelectedType("");
    setSelectedPayment("");
    setSelectedRoute("");
    setSelectedImage("");
  };

  const sendWhatsApp = async (saleId) => {
    setSendingWhatsApp(prev => ({ ...prev, [saleId]: true }));
    try {
      const response = await axios.post(
        `${API}/sales/${saleId}/send-whatsapp`,
        {},
        getAuthHeaders()
      );
      toast.success(response.data.message || "WhatsApp message sent successfully!");
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      const errorMsg = error.response?.data?.detail || "Failed to send WhatsApp message";
      toast.error(errorMsg);
    } finally {
      setSendingWhatsApp(prev => ({ ...prev, [saleId]: false }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTimeIST = (timeString) => {
    if (!timeString) return "-";
    try {
      // Parse time string (expected format: HH:mm:ss or HH:mm)
      const [hours, minutes] = timeString.split(":");
      let hour = parseInt(hours, 10);
      let minute = parseInt(minutes, 10);
      
      // Add 5 hours 30 minutes to convert UTC to IST
      minute += 30;
      if (minute >= 60) {
        minute -= 60;
        hour += 1;
      }
      hour += 5;
      if (hour >= 24) {
        hour -= 24;
      }
      
      // Convert to 12-hour format with AM/PM
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      const formattedHour = hour12.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      
      return `${formattedHour}:${formattedMinute} ${period}`;
    } catch {
      return timeString;
    }
  };

  const truncateId = (id) => {
    return id ? `#${id.substring(0, 8)}...` : "-";
  };

  return (
    <div className="space-y-6" data-testid="transaction-report-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Transaction Report</h1>
          <p className="text-muted-foreground">View all sales transactions</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
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
                    onSelect={setFromDate}
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
                    onSelect={setToDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Salesman Filter */}
              <Select value={selectedSalesman || "all"} onValueChange={(val) => setSelectedSalesman(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[170px]" data-testid="salesman-filter">
                  <SelectValue placeholder="All Salesmen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salesmen</SelectItem>
                  {salesmen.map((salesman) => (
                    <SelectItem key={salesman.id} value={salesman.id}>
                      {salesman.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={selectedType || "all"} onValueChange={(val) => setSelectedType(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[140px]" data-testid="type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Sale">Sale</SelectItem>
                  <SelectItem value="Collection">Collection</SelectItem>
                </SelectContent>
              </Select>

              {/* Payment Filter */}
              <Select value={selectedPayment || "all"} onValueChange={(val) => setSelectedPayment(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[140px]" data-testid="payment-filter">
                  <SelectValue placeholder="All Payments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Bill">Bill</SelectItem>
                </SelectContent>
              </Select>

              {/* Route Filter */}
              <Select value={selectedRoute || "all"} onValueChange={(val) => setSelectedRoute(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[160px]" data-testid="route-filter">
                  <SelectValue placeholder="All Routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.route_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Image Filter */}
              <Select value={selectedImage || "all"} onValueChange={(val) => setSelectedImage(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[150px]" data-testid="image-filter">
                  <SelectValue placeholder="All Images" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="with">With Image</SelectItem>
                  <SelectItem value="without">Without Image</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(fromDate || toDate || selectedSalesman || selectedType || selectedPayment || selectedRoute || selectedImage) && (
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-xl font-semibold text-primary-950">{totals.total_records}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Crates</p>
            <p className="text-xl font-semibold text-blue-600">{totals.total_crates}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Order Amount</p>
            <p className="text-xl font-semibold text-primary-950">{formatCurrency(totals.total_order_amount)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Collected</p>
            <p className="text-xl font-semibold text-green-600">{formatCurrency(totals.total_collected)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-semibold text-red-600">{formatCurrency(totals.total_pending)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Return Trays</p>
            <p className="text-xl font-semibold text-orange-600">{totals.total_return_tray}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard size={20} className="text-primary" />
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground">
                {fromDate || toDate || selectedSalesman 
                  ? "Try adjusting your filters" 
                  : "Transactions will appear here when sales are made"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1900px]">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="py-4 min-w-[120px] whitespace-nowrap">Date & Time</TableHead>
                    <TableHead className="py-4 min-w-[90px] whitespace-nowrap">Type</TableHead>
                    <TableHead className="py-4 min-w-[100px] whitespace-nowrap">Payment</TableHead>
                    <TableHead className="py-4 min-w-[130px] whitespace-nowrap">Salesman</TableHead>
                    <TableHead className="py-4 min-w-[150px] whitespace-nowrap">Shop Name</TableHead>
                    <TableHead className="py-4 min-w-[100px] whitespace-nowrap">Route</TableHead>
                    <TableHead className="text-right py-4 min-w-[70px] whitespace-nowrap">Crates</TableHead>
                    <TableHead className="text-right py-4 min-w-[80px] whitespace-nowrap">Price</TableHead>
                    <TableHead className="text-right py-4 min-w-[100px] whitespace-nowrap">Order Amt</TableHead>
                    <TableHead className="text-right py-4 min-w-[100px] whitespace-nowrap">Prev Dues</TableHead>
                    <TableHead className="text-right py-4 min-w-[100px] whitespace-nowrap">Total Amt</TableHead>
                    <TableHead className="text-right py-4 min-w-[100px] whitespace-nowrap">Collected</TableHead>
                    <TableHead className="text-right py-4 min-w-[100px] whitespace-nowrap">Pending</TableHead>
                    <TableHead className="text-right py-4 min-w-[80px] whitespace-nowrap">Prev Tray</TableHead>
                    <TableHead className="text-right py-4 min-w-[80px] whitespace-nowrap">Curr Tray</TableHead>
                    <TableHead className="text-right py-4 min-w-[80px] whitespace-nowrap">Ret Tray</TableHead>
                    <TableHead className="py-4 min-w-[70px] whitespace-nowrap">Image</TableHead>
                    <TableHead className="py-4 min-w-[100px] whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale, index) => (
                    <TableRow 
                      key={sale.id} 
                      data-testid={`transaction-row-${index}`}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50/70"}
                    >
                      <TableCell className="whitespace-nowrap py-4">
                        <div>
                          <p className="font-medium">{formatDate(sale.sale_date)}</p>
                          <p className="text-xs text-muted-foreground">{formatTimeIST(sale.sale_time)} IST</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          (sale.transaction_type || (sale.crates > 0 ? "Sale" : "Collection")) === "Sale" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-purple-100 text-purple-700"
                        )}>
                          {sale.transaction_type || (sale.crates > 0 ? "Sale" : "Collection")}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          sale.payment_type === "Cash" ? "bg-green-100 text-green-700" :
                          sale.payment_type === "UPI" ? "bg-blue-100 text-blue-700" :
                          sale.payment_type === "Credit" ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {sale.payment_type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium py-4 whitespace-nowrap">{sale.salesman_name}</TableCell>
                      <TableCell className="py-4 whitespace-nowrap">{sale.shop_name}</TableCell>
                      <TableCell className="py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {sale.route_name || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium py-4 whitespace-nowrap">{sale.crates}</TableCell>
                      <TableCell className="text-right py-4 whitespace-nowrap">₹{sale.price}</TableCell>
                      <TableCell className="text-right py-4 whitespace-nowrap">{formatCurrency(sale.order_amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-4 whitespace-nowrap">{formatCurrency(sale.shop_previous_dues)}</TableCell>
                      <TableCell className="text-right font-medium py-4 whitespace-nowrap">{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium py-4 whitespace-nowrap">{formatCurrency(sale.collected_amount)}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium py-4 whitespace-nowrap">{formatCurrency(sale.pending_amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-4 whitespace-nowrap">{sale.previous_tray_balance || 0}</TableCell>
                      <TableCell className="text-right font-medium py-4 whitespace-nowrap">{sale.current_tray_balance || 0}</TableCell>
                      <TableCell className="text-right py-4 whitespace-nowrap">{sale.return_tray}</TableCell>
                      <TableCell className="py-4 whitespace-nowrap">
                        {sale.image_url ? (
                          <a 
                            href={`${BACKEND_URL}${sale.image_url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <ImageIcon size={14} />
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendWhatsApp(sale.id)}
                          disabled={sendingWhatsApp[sale.id]}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          data-testid={`whatsapp-btn-${index}`}
                        >
                          {sendingWhatsApp[sale.id] ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <MessageCircle size={16} />
                          )}
                          <span className="ml-1 text-xs">WhatsApp</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionReportPage;
