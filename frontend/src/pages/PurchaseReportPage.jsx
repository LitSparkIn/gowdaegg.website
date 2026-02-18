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
  Search,
  FileSpreadsheet,
  FileText,
  Printer
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PurchaseReportPage = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter purchases based on search query
  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchases;
    const query = searchQuery.toLowerCase();
    return purchases.filter(purchase => 
      purchase.supplier_name?.toLowerCase().includes(query) ||
      purchase.payment_mode?.toLowerCase().includes(query)
    );
  }, [purchases, searchQuery]);

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

  // Export functions
  const exportToExcel = () => {
    if (filteredPurchases.length === 0) { toast.error("No data to export"); return; }
    const data = filteredPurchases.map((p, i) => ({
      "#": i+1, "Date": format(new Date(p.purchase_date), "dd MMM yyyy"), "Time": p.purchase_time || "N/A",
      "Supplier": p.supplier_name, "Crates": p.crates, "Rate": p.price, "Total": p.total,
      "Prev Dues": p.supplier_previous_dues, "Grand Total": p.grand_total, "Paid": p.paid_amount, "Pending": p.pending_amount, "Payment": p.payment_mode
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Report");
    const fromStr = fromDate ? format(fromDate, "dd-MMM-yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd-MMM-yyyy") : "All";
    XLSX.writeFile(wb, `PurchaseReport_${fromStr}_to_${toStr}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const exportToPDF = () => {
    if (filteredPurchases.length === 0) { toast.error("No data to export"); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    doc.setFontSize(16); doc.setTextColor(34, 84, 61);
    doc.text("Purchase Report", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Date: ${fromStr} to ${toStr} | Total: ₹${(totals.total_amount||0).toLocaleString()} | Paid: ₹${(totals.total_paid||0).toLocaleString()} | Pending: ₹${(totals.total_pending||0).toLocaleString()}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Date", "Time", "Supplier", "Crates", "Rate", "Total", "Prev Dues", "Grand Total", "Paid", "Pending", "Payment"]],
      body: filteredPurchases.map(p => [format(new Date(p.purchase_date), "dd MMM"), p.purchase_time || "-", p.supplier_name, p.crates, `₹${p.price}`, `₹${p.total.toLocaleString()}`, `₹${p.supplier_previous_dues.toLocaleString()}`, `₹${p.grand_total.toLocaleString()}`, `₹${p.paid_amount.toLocaleString()}`, `₹${p.pending_amount.toLocaleString()}`, p.payment_mode]),
      theme: "grid", headStyles: { fillColor: [34, 84, 61], fontSize: 7 }, bodyStyles: { fontSize: 7 }
    });
    doc.save(`PurchaseReport_${fromStr.replace(/ /g,"-")}_to_${toStr.replace(/ /g,"-")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePrint = () => {
    if (filteredPurchases.length === 0) { toast.error("No data to print"); return; }
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    const html = `<html><head><title>Purchase Report</title><style>body{font-family:Arial;padding:20px}h1{color:#22543d}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#22543d;color:#fff;padding:6px}td{padding:5px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}.text-right{text-align:right}</style></head><body><h1>Purchase Report</h1><p>Date: ${fromStr} to ${toStr} | Total: ₹${(totals.total_amount||0).toLocaleString()}</p><table><tr><th>Date</th><th>Supplier</th><th>Crates</th><th>Rate</th><th>Total</th><th>Prev Dues</th><th>Grand Total</th><th>Paid</th><th>Pending</th><th>Payment</th></tr>${filteredPurchases.map(p=>`<tr><td>${format(new Date(p.purchase_date), "dd MMM")}</td><td>${p.supplier_name}</td><td class="text-right">${p.crates}</td><td class="text-right">₹${p.price}</td><td class="text-right">₹${p.total.toLocaleString()}</td><td class="text-right">₹${p.supplier_previous_dues.toLocaleString()}</td><td class="text-right">₹${p.grand_total.toLocaleString()}</td><td class="text-right">₹${p.paid_amount.toLocaleString()}</td><td class="text-right">₹${p.pending_amount.toLocaleString()}</td><td>${p.payment_mode}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div className="space-y-6" data-testid="purchase-report-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Purchase Report</h1>
          <p className="text-muted-foreground">View all purchase transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading || filteredPurchases.length === 0}>
            <FileSpreadsheet size={16} className="mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loading || filteredPurchases.length === 0}>
            <FileText size={16} className="mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || filteredPurchases.length === 0}>
            <Printer size={16} className="mr-1" /> Print
          </Button>
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search by supplier, payment mode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="purchase-report-search-input"
        />
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package size={20} className="text-primary" />
            Purchases ({filteredPurchases.length}{searchQuery && ` of ${purchases.length}`})
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
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No purchases match your search. Try a different term.
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
                  {filteredPurchases.map((purchase, index) => (
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
