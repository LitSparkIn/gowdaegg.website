import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Loader2, 
  CalendarDays, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Wallet,
  Eye,
  CheckCircle2,
  Search,
  FileSpreadsheet,
  FileText,
  Printer,
  CalendarIcon,
  Filter,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DailySubmitHistoryPage = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  // Date filter state
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      let url = `/daily-summary/submitted`;
      const params = new URLSearchParams();
      
      if (fromDate) {
        params.append("from_date", format(fromDate, "yyyy-MM-dd"));
      }
      if (toDate) {
        params.append("to_date", format(toDate, "yyyy-MM-dd"));
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      setSummaries(response.data.data.summaries || []);
    } catch (error) {
      console.error("Error fetching summaries:", error);
      toast.error("Failed to fetch submitted summaries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [fromDate, toDate]);
  
  const clearFilters = () => {
    setFromDate(null);
    setToDate(null);
  };

  // Filter summaries based on search query
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return summaries;
    const query = searchQuery.toLowerCase();
    return summaries.filter(summary => 
      formatDate(summary.date)?.toLowerCase().includes(query)
    );
  }, [summaries, searchQuery]);

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleView = (summary) => {
    setSelectedSummary(summary);
    setViewDialogOpen(true);
  };

  const SummaryRow = ({ label, value, valueClass = "" }) => (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("font-semibold text-sm", valueClass)}>{value}</span>
    </div>
  );

  // Export functions
  const exportToExcel = () => {
    if (filteredSummaries.length === 0) { toast.error("No data to export"); return; }
    const data = filteredSummaries.map((s, i) => ({
      "#": i+1, "Date": formatDate(s.date),
      "Carryover": s.crate_information?.carryover_today || 0,
      "Purchased": s.crate_information?.purchase_today || 0,
      "Total Crates": s.crate_information?.total_crates || 0,
      "Sold": s.sale_information?.total_sales || 0,
      "Returned": s.sale_information?.returned || 0,
      "Sale Value": s.profit_loss?.sale_value || 0,
      "Net Profit": s.expenses?.net_profit || 0,
      "Carryover Tomorrow": s.expenses?.carryover_tomorrow || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary History");
    XLSX.writeFile(wb, `DailySummaryHistory_${format(new Date(), "dd-MMM-yyyy")}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const exportToPDF = () => {
    if (filteredSummaries.length === 0) { toast.error("No data to export"); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16); doc.setTextColor(34, 84, 61);
    doc.text("Daily Summary History", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Total Records: ${filteredSummaries.length} | Generated: ${format(new Date(), "dd MMM yyyy")}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Date", "Carryover", "Purchased", "Total", "Sold", "Returned", "Sale Value", "Net Profit", "Tomorrow"]],
      body: filteredSummaries.map(s => [formatDate(s.date), s.crate_information?.carryover_today || 0, s.crate_information?.purchase_today || 0, s.crate_information?.total_crates || 0, s.sale_information?.total_sales || 0, s.sale_information?.returned || 0, `₹${(s.profit_loss?.sale_value||0).toLocaleString()}`, `₹${(s.expenses?.net_profit||0).toLocaleString()}`, s.expenses?.carryover_tomorrow || 0]),
      theme: "grid", headStyles: { fillColor: [34, 84, 61], fontSize: 8 }, bodyStyles: { fontSize: 8 }
    });
    doc.save(`DailySummaryHistory_${format(new Date(), "dd-MMM-yyyy")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePrint = () => {
    if (filteredSummaries.length === 0) { toast.error("No data to print"); return; }
    const html = `<html><head><title>Summary History</title><style>body{font-family:Arial;padding:20px}h1{color:#22543d}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#22543d;color:#fff;padding:6px}td{padding:5px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}.text-right{text-align:right}.profit{color:green}.loss{color:red}</style></head><body><h1>Daily Summary History</h1><p>Total: ${filteredSummaries.length} records</p><table><tr><th>Date</th><th>Carryover</th><th>Purchased</th><th>Total</th><th>Sold</th><th>Returned</th><th>Sale Value</th><th>Net Profit</th><th>Tomorrow</th></tr>${filteredSummaries.map(s=>`<tr><td>${formatDate(s.date)}</td><td class="text-right">${s.crate_information?.carryover_today||0}</td><td class="text-right">${s.crate_information?.purchase_today||0}</td><td class="text-right">${s.crate_information?.total_crates||0}</td><td class="text-right">${s.sale_information?.total_sales||0}</td><td class="text-right">${s.sale_information?.returned||0}</td><td class="text-right">₹${(s.profit_loss?.sale_value||0).toLocaleString()}</td><td class="text-right ${(s.expenses?.net_profit||0)>=0?'profit':'loss'}">₹${(s.expenses?.net_profit||0).toLocaleString()}</td><td class="text-right">${s.expenses?.carryover_tomorrow||0}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  // Export single summary from View Dialog
  const exportSingleToPDF = (summary) => {
    if (!summary) { toast.error("No summary to export"); return; }
    const doc = new jsPDF();
    const dateStr = formatDate(summary.date);
    
    doc.setFontSize(18);
    doc.setTextColor(34, 84, 61);
    doc.text("Gowda Egg Distributors", 14, 15);
    doc.setFontSize(14);
    doc.text(`Daily Summary - ${dateStr}`, 14, 24);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, 14, 31);
    
    let yPos = 40;
    
    // Crate Information
    doc.setFontSize(12);
    doc.setTextColor(34, 84, 61);
    doc.text("Crate Information", 14, yPos);
    autoTable(doc, {
      startY: yPos + 3,
      head: [["Description", "Value"]],
      body: [
        ["Carryover", summary.crate_information?.carryover_today || 0],
        ["Purchased", summary.crate_information?.purchase_today || 0],
        ["Total Crates", summary.crate_information?.total_crates || 0],
        ["Damage", summary.crate_information?.damage || 0],
        ["Net Crates", summary.crate_information?.net_crates || 0],
      ],
      theme: "grid",
      headStyles: { fillColor: [34, 84, 61], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" } }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // Sale Information
    doc.text("Sale Information", 14, yPos);
    autoTable(doc, {
      startY: yPos + 3,
      head: [["Description", "Value"]],
      body: [
        ["Initial Load", summary.sale_information?.total_initial_load || 0],
        ["Total Sales", summary.sale_information?.total_sales || 0],
        ["Damages", summary.sale_information?.total_damages || 0],
        ["Returned", summary.sale_information?.returned || 0],
      ],
      theme: "grid",
      headStyles: { fillColor: [34, 84, 61], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" } }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // Expenses & Summary
    doc.text("Expenses & Summary", 14, yPos);
    autoTable(doc, {
      startY: yPos + 3,
      head: [["Description", "Amount"]],
      body: [
        ["Salesman Expenses", `₹${(summary.expenses?.salesman_expenses || 0).toLocaleString()}`],
        ["Other Expenses", `₹${(summary.expenses?.other_expenses || 0).toLocaleString()}`],
        ["Total Expenses", `₹${(summary.expenses?.total_expenses || 0).toLocaleString()}`],
        ["Buy Value", `₹${(summary.profit_loss?.buy_value || 0).toLocaleString()}`],
        ["Sale Value", `₹${(summary.profit_loss?.sale_value || 0).toLocaleString()}`],
        ["Net Profit", `₹${(summary.expenses?.net_profit || 0).toLocaleString()}`],
        ["Carryover Tomorrow", `${summary.expenses?.carryover_tomorrow || 0} crates`],
      ],
      theme: "grid",
      headStyles: { fillColor: [34, 84, 61], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: "right" } }
    });
    
    doc.save(`DailySummary_${format(new Date(summary.date), "dd-MMM-yyyy")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const printSingleSummary = (summary) => {
    if (!summary) { toast.error("No summary to print"); return; }
    const dateStr = formatDate(summary.date);
    const html = `
      <html>
      <head>
        <title>Daily Summary - ${dateStr}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #22543d; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; color: #22543d; border-bottom: 2px solid #22543d; padding-bottom: 5px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; }
          .text-right { text-align: right; }
          .highlight { font-weight: bold; background: #e8f5e9; }
          .profit { color: green; }
          .loss { color: red; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Gowda Egg Distributors</h1>
        <p class="subtitle">Daily Summary - ${dateStr}</p>
        
        <div class="section">
          <div class="section-title">Crate Information</div>
          <table>
            <tr><td>Carryover</td><td class="text-right">${summary.crate_information?.carryover_today || 0}</td></tr>
            <tr><td>Purchased Today</td><td class="text-right">${summary.crate_information?.purchase_today || 0}</td></tr>
            <tr class="highlight"><td>Total Crates</td><td class="text-right">${summary.crate_information?.total_crates || 0}</td></tr>
            <tr><td>Average Rate</td><td class="text-right">₹${summary.crate_information?.average_rate || 0}</td></tr>
            <tr><td>Damage</td><td class="text-right">${summary.crate_information?.damage || 0}</td></tr>
            <tr class="highlight"><td>Net Crates</td><td class="text-right">${summary.crate_information?.net_crates || 0}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">Sale Information</div>
          <table>
            <tr><td>Initial Load</td><td class="text-right">${summary.sale_information?.total_initial_load || 0}</td></tr>
            <tr class="highlight"><td>Total Sales</td><td class="text-right">${summary.sale_information?.total_sales || 0}</td></tr>
            <tr><td>Damages</td><td class="text-right">${summary.sale_information?.total_damages || 0}</td></tr>
            <tr><td>Returned</td><td class="text-right">${summary.sale_information?.returned || 0}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">Profit | Loss</div>
          <table>
            <tr><td>Buy Value</td><td class="text-right loss">₹${(summary.profit_loss?.buy_value || 0).toLocaleString()}</td></tr>
            <tr><td>Sale Value</td><td class="text-right profit">₹${(summary.profit_loss?.sale_value || 0).toLocaleString()}</td></tr>
            <tr><td>Buy Rate</td><td class="text-right">₹${summary.profit_loss?.buy_rate || 0}</td></tr>
            <tr><td>Sale Rate</td><td class="text-right">₹${summary.profit_loss?.sale_rate || 0}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <div class="section-title">Expenses & Summary</div>
          <table>
            <tr><td>Salesman Expenses</td><td class="text-right loss">₹${(summary.expenses?.salesman_expenses || 0).toLocaleString()}</td></tr>
            <tr><td>Other Expenses</td><td class="text-right loss">₹${(summary.expenses?.other_expenses || 0).toLocaleString()}</td></tr>
            <tr class="highlight"><td>Total Expenses</td><td class="text-right loss">₹${(summary.expenses?.total_expenses || 0).toLocaleString()}</td></tr>
            <tr><td>Net Purchase (COGS)</td><td class="text-right">₹${(summary.expenses?.net_purchase || 0).toLocaleString()}</td></tr>
            <tr class="highlight"><td>Net Profit</td><td class="text-right ${(summary.expenses?.net_profit || 0) >= 0 ? 'profit' : 'loss'}">₹${(summary.expenses?.net_profit || 0).toLocaleString()}</td></tr>
            <tr><td>Carryover Tomorrow</td><td class="text-right">${summary.expenses?.carryover_tomorrow || 0} crates</td></tr>
          </table>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6" data-testid="daily-submit-history-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Daily Summary History</h1>
          <p className="text-muted-foreground">View all submitted daily summaries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading || filteredSummaries.length === 0}>
            <FileSpreadsheet size={16} className="mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loading || filteredSummaries.length === 0}>
            <FileText size={16} className="mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || filteredSummaries.length === 0}>
            <Printer size={16} className="mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
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
                      "w-[160px] justify-start text-left font-normal",
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
                      "w-[160px] justify-start text-left font-normal",
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

              {/* Clear Filters */}
              {(fromDate || toDate) && (
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

            {/* Total count */}
            <div className="lg:ml-auto flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-muted-foreground">Total Records:</span>
              <span className="text-lg font-semibold text-blue-600">{summaries.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search by date..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="daily-history-search-input"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-primary" />
        </div>
      ) : summaries.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-20 text-center">
            <CalendarDays size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No submitted summaries yet</p>
            <p className="text-sm text-muted-foreground">
              Summaries will appear here once they are submitted from the Daily Summary page.
            </p>
          </CardContent>
        </Card>
      ) : filteredSummaries.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-20 text-center">
            <CalendarDays size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No summaries match your search</p>
            <p className="text-sm text-muted-foreground">Try a different search term</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays size={20} className="text-primary" />
              Submitted Summaries ({filteredSummaries.length}{searchQuery && ` of ${summaries.length}`})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total Crates</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Sales</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Sale Value</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Expenses</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Net Profit</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Submitted At</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummaries.map((summary, index) => (
                    <tr 
                      key={summary.id}
                      className={cn(
                        "border-b last:border-b-0 hover:bg-gray-50/50",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-green-500" />
                          <span className="font-medium">{formatDate(summary.date)}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-medium">
                        {formatNumber(summary.crate_information?.total_crates)}
                      </td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">
                        {formatNumber(summary.sale_information?.total_sales)}
                      </td>
                      <td className="text-right py-3 px-4 text-green-600">
                        {formatCurrency(summary.profit_loss?.sale_value)}
                      </td>
                      <td className="text-right py-3 px-4 text-red-600">
                        {formatCurrency(summary.expenses?.total_expenses)}
                      </td>
                      <td className={cn(
                        "text-right py-3 px-4 font-semibold",
                        (summary.expenses?.net_profit || 0) >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCurrency(summary.expenses?.net_profit)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDateTime(summary.submitted_at)}
                      </td>
                      <td className="text-center py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(summary)}
                          className="text-primary hover:text-primary-600"
                          data-testid={`view-btn-${index}`}
                        >
                          <Eye size={16} className="mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays size={20} className="text-primary" />
              Daily Summary - {selectedSummary ? formatDate(selectedSummary.date) : ""}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Crate Information */}
              <Card className="border-border/50">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package size={16} className="text-blue-600" />
                    Crate Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <SummaryRow label="Carryover" value={formatNumber(selectedSummary.crate_information?.carryover_today)} />
                  <SummaryRow label="Purchase" value={formatNumber(selectedSummary.crate_information?.purchase_today)} valueClass="text-blue-600" />
                  <SummaryRow label="Total Crates" value={formatNumber(selectedSummary.crate_information?.total_crates)} valueClass="text-primary font-bold" />
                  <SummaryRow label="Average Rate" value={`₹${selectedSummary.crate_information?.average_rate || 0}`} />
                  <SummaryRow label="Damage" value={formatNumber(selectedSummary.crate_information?.damage)} valueClass="text-red-600" />
                  <SummaryRow label="Net Crates" value={formatNumber(selectedSummary.crate_information?.net_crates)} valueClass="text-green-600 font-bold" />
                </CardContent>
              </Card>

              {/* Sale Information */}
              <Card className="border-border/50">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart size={16} className="text-green-600" />
                    Sale Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <SummaryRow label="Initial Load" value={formatNumber(selectedSummary.sale_information?.total_initial_load)} />
                  <SummaryRow label="Total Sales" value={formatNumber(selectedSummary.sale_information?.total_sales)} valueClass="text-green-600 font-bold" />
                  <SummaryRow label="Damages" value={formatNumber(selectedSummary.sale_information?.total_damages)} valueClass="text-red-600" />
                  <SummaryRow label="Returned" value={formatNumber(selectedSummary.sale_information?.returned)} valueClass="text-orange-600" />
                </CardContent>
              </Card>

              {/* Profit | Loss */}
              <Card className="border-border/50">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp size={16} className="text-purple-600" />
                    Profit | Loss
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <SummaryRow label="Buy Value" value={formatCurrency(selectedSummary.profit_loss?.buy_value)} valueClass="text-red-600" />
                  <SummaryRow label="Sale Value" value={formatCurrency(selectedSummary.profit_loss?.sale_value)} valueClass="text-green-600" />
                  <SummaryRow label="Buy Rate" value={`₹${selectedSummary.profit_loss?.buy_rate || 0}`} />
                  <SummaryRow label="Sale Rate" value={`₹${selectedSummary.profit_loss?.sale_rate || 0}`} />
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card className="border-border/50">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wallet size={16} className="text-orange-600" />
                    Expenses & Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <SummaryRow label="Salesman Expenses" value={formatCurrency(selectedSummary.expenses?.salesman_expenses)} valueClass="text-red-600" />
                  <SummaryRow label="Other Expenses" value={formatCurrency(selectedSummary.expenses?.other_expenses)} valueClass="text-red-600" />
                  <SummaryRow label="Total Expenses" value={formatCurrency(selectedSummary.expenses?.total_expenses)} valueClass="text-red-600 font-bold" />
                  <div className="my-2 border-t border-dashed" />
                  <SummaryRow label="Net Purchase (COGS)" value={formatCurrency(selectedSummary.expenses?.net_purchase)} valueClass="text-red-600" />
                  <SummaryRow 
                    label="Net Profit" 
                    value={formatCurrency(selectedSummary.expenses?.net_profit)} 
                    valueClass={cn(
                      "font-bold",
                      (selectedSummary.expenses?.net_profit || 0) >= 0 ? "text-green-600" : "text-red-600"
                    )} 
                  />
                  <SummaryRow label="Carryover Tomorrow" value={`${formatNumber(selectedSummary.expenses?.carryover_tomorrow)} crates`} valueClass="text-blue-600" />
                </CardContent>
              </Card>
            </div>
          )}

          {selectedSummary && (
            <div className="mt-4 flex items-center justify-between">
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-muted-foreground">
                Submitted on {formatDateTime(selectedSummary.submitted_at)}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportSingleToPDF(selectedSummary)}
                  data-testid="dialog-pdf-btn"
                >
                  <FileText size={16} className="mr-1" /> PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => printSingleSummary(selectedSummary)}
                  data-testid="dialog-print-btn"
                >
                  <Printer size={16} className="mr-1" /> Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailySubmitHistoryPage;
