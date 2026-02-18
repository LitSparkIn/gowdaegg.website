import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CreditCard, Loader2, CalendarIcon, Filter, X, ImageIcon, MessageCircle, FileSpreadsheet, FileText, Search, Printer, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TransactionReportPage = () => {
  const [sales, setSales] = useState([]);
  const [sendingWhatsApp, setSendingWhatsApp] = useState({});
  const [salesmen, setSalesmen] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totals, setTotals] = useState({
    total_records: 0,
    total_crates: 0,
    total_order_amount: 0,
    total_collected: 0,
    total_pending: 0,
    total_return_tray: 0
  });
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [editForm, setEditForm] = useState({
    crates: "",
    price: "",
    collected_amount: "",
    payment_type: "",
    return_tray: "",
    image: null
  });
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
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
      const response = await api.get(`/salesmen`);
      setSalesmen(response.data.salesmen || []);
    } catch (error) {
      console.error("Error fetching salesmen:", error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await api.get(`/routes`);
      setRoutes(response.data.routes || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      let url = `/sales`;
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
      
      const response = await api.get(url);
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

  // Filter sales based on search query
  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales;
    const query = searchQuery.toLowerCase();
    return sales.filter(sale => 
      sale.shop_name?.toLowerCase().includes(query) ||
      sale.salesman_name?.toLowerCase().includes(query) ||
      sale.route_name?.toLowerCase().includes(query)
    );
  }, [sales, searchQuery]);

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
      const response = await api.post(`/sales/${saleId}/send-whatsapp`, {});
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
      // Time is already stored in IST format from backend, just convert to 12-hour format
      const [hours, minutes] = timeString.split(":");
      let hour = parseInt(hours, 10);
      let minute = parseInt(minutes, 10);
      
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

  // Export data preparation
  const getExportData = () => {
    return sales.map((sale) => ({
      "Date": formatDate(sale.sale_date),
      "Time": formatTimeIST(sale.sale_time),
      "Type": sale.transaction_type || (sale.crates > 0 ? "Sale" : "Collection"),
      "Payment": sale.payment_type,
      "Salesman": sale.salesman_name,
      "Shop Name": sale.shop_name,
      "Route": sale.route_name || "N/A",
      "Crates": sale.crates,
      "Price": sale.price,
      "Order Amount": sale.order_amount,
      "Previous Dues": sale.shop_previous_dues,
      "Total Amount": sale.total_amount,
      "Collected": sale.collected_amount,
      "Pending": sale.pending_amount,
      "Previous Tray": sale.previous_tray_balance || 0,
      "Current Tray": sale.current_tray_balance || 0,
      "Return Tray": sale.return_tray
    }));
  };

  // Export to Excel
  const exportToExcel = () => {
    if (sales.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const exportData = getExportData();
      
      // Add summary row
      exportData.push({});
      exportData.push({
        "Date": "TOTALS",
        "Time": "",
        "Type": "",
        "Payment": "",
        "Salesman": "",
        "Shop Name": "",
        "Route": "",
        "Crates": totals.total_crates,
        "Price": "",
        "Order Amount": totals.total_order_amount,
        "Previous Dues": "",
        "Total Amount": "",
        "Collected": totals.total_collected,
        "Pending": totals.total_pending,
        "Previous Tray": "",
        "Current Tray": "",
        "Return Tray": totals.total_return_tray
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

      // Generate filename with date range
      const fromStr = fromDate ? format(fromDate, "dd-MMM-yyyy") : "All";
      const toStr = toDate ? format(toDate, "dd-MMM-yyyy") : "All";
      const filename = `Transaction_Report_${fromStr}_to_${toStr}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success("Excel file downloaded successfully!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export to Excel");
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    if (sales.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      
      // Title
      const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
      const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
      doc.setFontSize(16);
      doc.setTextColor(34, 84, 61); // Primary green color
      doc.text("Gowda Egg Distributors - Transaction Report", 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date Range: ${fromStr} to ${toStr}`, 14, 22);
      doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, 14, 27);

      // Summary
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Transactions: ${totals.total_records}  |  Crates: ${totals.total_crates}  |  Order Amt: Rs.${totals.total_order_amount.toLocaleString()}  |  Collected: Rs.${totals.total_collected.toLocaleString()}  |  Pending: Rs.${totals.total_pending.toLocaleString()}`, 14, 33);

      // Table data
      const tableData = sales.map((sale) => [
        formatDate(sale.sale_date),
        formatTimeIST(sale.sale_time),
        sale.transaction_type || (sale.crates > 0 ? "Sale" : "Collection"),
        sale.payment_type,
        sale.salesman_name,
        sale.shop_name,
        sale.route_name || "N/A",
        sale.crates,
        `Rs.${sale.price}`,
        `Rs.${sale.order_amount.toLocaleString()}`,
        `Rs.${sale.collected_amount.toLocaleString()}`,
        `Rs.${sale.pending_amount.toLocaleString()}`,
        sale.return_tray
      ]);

      // Add totals row
      tableData.push([
        "TOTALS", "", "", "", "", "", "",
        totals.total_crates,
        "",
        `Rs.${totals.total_order_amount.toLocaleString()}`,
        `Rs.${totals.total_collected.toLocaleString()}`,
        `Rs.${totals.total_pending.toLocaleString()}`,
        totals.total_return_tray
      ]);

      autoTable(doc, {
        startY: 38,
        head: [["Date", "Time", "Type", "Payment", "Salesman", "Shop", "Route", "Crates", "Price", "Order Amt", "Collected", "Pending", "Ret Tray"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [34, 84, 61],
          textColor: 255,
          fontSize: 7,
          fontStyle: "bold"
        },
        bodyStyles: {
          fontSize: 7
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 18 },
          2: { cellWidth: 16 },
          3: { cellWidth: 16 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
          6: { cellWidth: 20 },
          7: { cellWidth: 14, halign: "right" },
          8: { cellWidth: 16, halign: "right" },
          9: { cellWidth: 22, halign: "right" },
          10: { cellWidth: 22, halign: "right" },
          11: { cellWidth: 22, halign: "right" },
          12: { cellWidth: 16, halign: "right" }
        },
        didParseCell: function(data) {
          // Style the totals row
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [220, 237, 227];
          }
        }
      });

      // Generate filename
      const filename = `Transaction_Report_${fromStr.replace(/ /g, "-")}_to_${toStr.replace(/ /g, "-")}.pdf`;
      doc.save(filename);
      toast.success("PDF file downloaded successfully!");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Failed to export to PDF");
    }
  };

  // Print function
  const handlePrint = () => {
    if (sales.length === 0) {
      toast.error("No data to print");
      return;
    }

    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";

    const printContent = `
      <html>
        <head>
          <title>Transaction Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #22543d; margin-bottom: 5px; }
            .subtitle { color: #666; margin-bottom: 15px; }
            .summary { background: #f5f5f5; padding: 10px; margin-bottom: 15px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #22543d; color: white; padding: 8px; text-align: left; }
            td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9f9f9; }
            .text-right { text-align: right; }
            .totals { font-weight: bold; background: #dcede3 !important; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Gowda Egg Distributors - Transaction Report</h1>
          <p class="subtitle">Date Range: ${fromStr} to ${toStr} | Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
          <div class="summary">
            <strong>Summary:</strong> Total: ${totals.total_records} | Crates: ${totals.total_crates} | Order: ₹${totals.total_order_amount.toLocaleString()} | Collected: ₹${totals.total_collected.toLocaleString()} | Pending: ₹${totals.total_pending.toLocaleString()}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Payment</th>
                <th>Salesman</th>
                <th>Shop</th>
                <th>Route</th>
                <th class="text-right">Crates</th>
                <th class="text-right">Order Amt</th>
                <th class="text-right">Collected</th>
                <th class="text-right">Pending</th>
              </tr>
            </thead>
            <tbody>
              ${sales.map(sale => `
                <tr>
                  <td>${formatDate(sale.sale_date)}</td>
                  <td>${formatTimeIST(sale.sale_time)}</td>
                  <td>${sale.transaction_type || (sale.crates > 0 ? "Sale" : "Collection")}</td>
                  <td>${sale.payment_type}</td>
                  <td>${sale.salesman_name}</td>
                  <td>${sale.shop_name}</td>
                  <td>${sale.route_name || "N/A"}</td>
                  <td class="text-right">${sale.crates}</td>
                  <td class="text-right">₹${sale.order_amount.toLocaleString()}</td>
                  <td class="text-right">₹${sale.collected_amount.toLocaleString()}</td>
                  <td class="text-right">₹${sale.pending_amount.toLocaleString()}</td>
                </tr>
              `).join("")}
              <tr class="totals">
                <td colspan="7">TOTALS</td>
                <td class="text-right">${totals.total_crates}</td>
                <td class="text-right">₹${totals.total_order_amount.toLocaleString()}</td>
                <td class="text-right">₹${totals.total_collected.toLocaleString()}</td>
                <td class="text-right">₹${totals.total_pending.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Edit functions
  const handleEditClick = (sale) => {
    setEditingSale(sale);
    setEditForm({
      crates: sale.crates.toString(),
      price: sale.price.toString(),
      collected_amount: sale.collected_amount.toString(),
      payment_type: sale.payment_type,
      return_tray: sale.return_tray.toString(),
      image: null
    });
    setEditImagePreview(sale.image_url || null);
    setIsEditDialogOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditForm(prev => ({ ...prev, image: file }));
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  // Calculate preview values
  const getPreviewValues = () => {
    const crates = parseInt(editForm.crates) || 0;
    const price = parseFloat(editForm.price) || 0;
    const collected = parseFloat(editForm.collected_amount) || 0;
    const orderAmount = crates * 30 * price;
    const prevDues = editingSale?.shop_previous_dues || 0;
    const total = orderAmount + prevDues;
    const pending = total - collected;
    return { orderAmount, total, pending };
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editForm.crates || !editForm.price || !editForm.payment_type) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("crates", editForm.crates);
      formData.append("price", editForm.price);
      formData.append("collected_amount", editForm.collected_amount || "0");
      formData.append("payment_type", editForm.payment_type);
      formData.append("return_tray", editForm.return_tray || "0");
      if (editForm.image) {
        formData.append("image", editForm.image);
      }
      
      await api.put(`/sales/${editingSale.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Transaction updated successfully");
      setIsEditDialogOpen(false);
      setEditingSale(null);
      fetchSales();
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error(error.response?.data?.detail || "Failed to update transaction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="transaction-report-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Transaction Report</h1>
          <p className="text-muted-foreground">View all sales transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={loading || sales.length === 0}
            className="flex items-center gap-2"
            data-testid="export-excel-btn"
          >
            <FileSpreadsheet size={16} />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={loading || sales.length === 0}
            className="flex items-center gap-2"
            data-testid="export-pdf-btn"
          >
            <FileText size={16} />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={loading || sales.length === 0}
            className="flex items-center gap-2"
            data-testid="print-btn"
          >
            <Printer size={16} />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
            
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-8 gap-4">
            {/* From Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                    data-testid="from-date-btn"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "dd MMM yyyy") : "Select"}
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
            </div>

            {/* To Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                    data-testid="to-date-btn"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "dd MMM yyyy") : "Select"}
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
            </div>

            {/* Salesman Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Salesman</label>
              <Select value={selectedSalesman || "all"} onValueChange={(val) => setSelectedSalesman(val === "all" ? "" : val)}>
                <SelectTrigger className="w-full" data-testid="salesman-filter">
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
            </div>

            {/* Type Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={selectedType || "all"} onValueChange={(val) => setSelectedType(val === "all" ? "" : val)}>
                <SelectTrigger className="w-full" data-testid="type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Sale">Sale</SelectItem>
                  <SelectItem value="Collection">Collection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Payment</label>
              <Select value={selectedPayment || "all"} onValueChange={(val) => setSelectedPayment(val === "all" ? "" : val)}>
                <SelectTrigger className="w-full" data-testid="payment-filter">
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
            </div>

            {/* Route Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Route</label>
              <Select value={selectedRoute || "all"} onValueChange={(val) => setSelectedRoute(val === "all" ? "" : val)}>
                <SelectTrigger className="w-full" data-testid="route-filter">
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
            </div>

            {/* Image Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Image</label>
              <Select value={selectedImage || "all"} onValueChange={(val) => setSelectedImage(val === "all" ? "" : val)}>
                <SelectTrigger className="w-full" data-testid="image-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="with">With Image</SelectItem>
                  <SelectItem value="without">Without Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-transparent">Clear</label>
              {(fromDate || toDate || selectedSalesman || selectedType || selectedPayment || selectedRoute || selectedImage) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full h-10"
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search by shop, salesman, route..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="transaction-search-input"
        />
      </div>

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
            Transactions ({filteredSales.length}{searchQuery && ` of ${sales.length}`})
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
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No transactions match your search</p>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSales.map((sale, index) => (
                <div 
                  key={sale.id} 
                  data-testid={`transaction-row-${index}`}
                  className={cn(
                    "rounded-lg border p-4",
                    index % 2 === 0 ? "bg-gray-50/80 border-gray-200" : "bg-green-50/50 border-green-100"
                  )}
                >
                  {/* Row 1: Basic Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                      <p className="font-medium">{formatDate(sale.sale_date)}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeIST(sale.sale_time)} IST</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Type</p>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium inline-block",
                        (sale.transaction_type || (sale.crates > 0 ? "Sale" : "Collection")) === "Sale" 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-purple-100 text-purple-700"
                      )}>
                        {sale.transaction_type || (sale.crates > 0 ? "Sale" : "Collection")}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Payment</p>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium inline-block",
                        sale.payment_type === "Cash" ? "bg-green-100 text-green-700" :
                        sale.payment_type === "UPI" ? "bg-blue-100 text-blue-700" :
                        sale.payment_type === "Credit" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-700"
                      )}>
                        {sale.payment_type}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Salesman</p>
                      <p className="font-medium">{sale.salesman_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Shop Name</p>
                      <p className="font-medium">{sale.shop_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Route</p>
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium inline-block">
                        {sale.route_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sale.image_url ? (
                        <a 
                          href={`${BACKEND_URL}${sale.image_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-sm"
                        >
                          <ImageIcon size={14} />
                          View Image
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">No Image</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendWhatsApp(sale.id)}
                        disabled={sendingWhatsApp[sale.id]}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 h-7 px-2"
                        data-testid={`whatsapp-btn-${index}`}
                      >
                        {sendingWhatsApp[sale.id] ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <MessageCircle size={14} />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(sale)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2"
                        data-testid={`edit-btn-${index}`}
                      >
                        <Pencil size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="my-3 border-t border-dashed border-gray-300/70"></div>

                  {/* Row 2: Financial Info - Larger Font */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Crates</p>
                      <p className="text-base font-semibold text-primary-950">{sale.crates}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <p className="text-base font-semibold text-primary-950">₹{sale.price}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Order Amt</p>
                      <p className="text-base font-semibold text-primary-950">{formatCurrency(sale.order_amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Prev Dues</p>
                      <p className={cn(
                        "text-base font-semibold",
                        sale.credit_threshold > 0 && sale.shop_previous_dues > sale.credit_threshold
                          ? "text-red-600 px-2 py-0.5 border-2 border-red-500 rounded bg-red-50 inline-block"
                          : "text-gray-500"
                      )}>
                        {formatCurrency(sale.shop_previous_dues)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Amt</p>
                      <p className="text-base font-semibold text-primary-950">{formatCurrency(sale.total_amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Collected</p>
                      <p className="text-base font-semibold text-green-600">{formatCurrency(sale.collected_amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Pending</p>
                      <p className={cn(
                        "text-base font-semibold",
                        sale.credit_threshold > 0 && sale.pending_amount > sale.credit_threshold
                          ? "text-red-600 px-2 py-0.5 border-2 border-red-500 rounded bg-red-50 inline-block"
                          : "text-red-600"
                      )}>
                        {formatCurrency(sale.pending_amount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Prev Tray</p>
                      <p className="text-base font-semibold text-gray-500">{sale.previous_tray_balance || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Curr Tray</p>
                      <p className="text-base font-semibold text-primary-950">{sale.current_tray_balance || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Ret Tray</p>
                      <p className="text-base font-semibold text-orange-600">{sale.return_tray}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionReportPage;
