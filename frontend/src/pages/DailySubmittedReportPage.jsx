import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Loader2, CalendarIcon, Filter, X, Eye, ImageIcon, Search, FileSpreadsheet, Printer, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogFooter,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DailySubmittedReportPage = () => {
  const [reports, setReports] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [editForm, setEditForm] = useState({
    crates_damaged: "",
    expense: "",
    comments: ""
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Filters - default to today
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [selectedSalesman, setSelectedSalesman] = useState("");

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

  const fetchReports = async () => {
    try {
      setLoading(true);
      let url = `/sale-reports`;
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
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      const data = response.data.data || {};
      setReports(data.reports || []);
      setTotalRecords(data.total_records || 0);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to fetch submitted reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate, selectedSalesman]);

  // Filter reports based on search query
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const query = searchQuery.toLowerCase();
    return reports.filter(report => 
      report.salesman_name?.toLowerCase().includes(query)
    );
  }, [reports, searchQuery]);

  const clearFilters = () => {
    const today = new Date();
    setFromDate(today);
    setToDate(today);
    setSelectedSalesman("");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    // Add 5:30 hours for IST
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setIsDetailDialogOpen(true);
  };

  // Edit functions
  const handleEditClick = (report) => {
    setEditingReport(report);
    setEditForm({
      crates_damaged: report.crates_damaged?.toString() || "0",
      expense: report.expense?.toString() || "0",
      comments: report.comments || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    setSubmitting(true);
    try {
      await api.put(`/sale-reports/${editingReport.id}`, {
        crates_damaged: parseInt(editForm.crates_damaged) || 0,
        expense: parseFloat(editForm.expense) || 0,
        comments: editForm.comments || ""
      });
      
      toast.success("Report updated successfully");
      setIsEditDialogOpen(false);
      setEditingReport(null);
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error(error.response?.data?.detail || "Failed to update report");
    } finally {
      setSubmitting(false);
    }
  };

  // Export functions
  const exportToExcel = () => {
    if (filteredReports.length === 0) { toast.error("No data to export"); return; }
    const data = filteredReports.map((r, i) => ({
      "#": i+1, "Report Date": formatDate(r.report_date), "Salesman": r.salesman_name,
      "Initial": r.initial_crates, "Sold": r.crates_sold, "Damaged": r.crates_damaged,
      "Remaining": r.remaining_crates, "Cash": r.cash_collected, "Expense": r.expense,
      "Net Cash": r.net_cash, "Cheque": r.cheque_amount || 0, "Online": r.online_amount || 0,
      "Return Tray": r.empty_crates_returned, "Submitted At": formatDateTime(r.created_at)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Reports");
    const fromStr = fromDate ? format(fromDate, "dd-MMM-yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd-MMM-yyyy") : "All";
    XLSX.writeFile(wb, `DailyReports_${fromStr}_to_${toStr}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const exportToPDF = () => {
    if (filteredReports.length === 0) { toast.error("No data to export"); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    doc.setFontSize(16); doc.setTextColor(34, 84, 61);
    doc.text("Daily Submitted Reports", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Date: ${fromStr} to ${toStr} | Total Reports: ${filteredReports.length}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Date", "Salesman", "Initial", "Sold", "Damaged", "Remain", "Cash", "Expense", "Net Cash", "Cheque", "Online", "Ret Tray"]],
      body: filteredReports.map(r => [formatDate(r.report_date), r.salesman_name, r.initial_crates, r.crates_sold, r.crates_damaged, r.remaining_crates, `₹${r.cash_collected}`, `₹${r.expense}`, `₹${r.net_cash}`, `₹${r.cheque_amount||0}`, `₹${r.online_amount||0}`, r.empty_crates_returned]),
      theme: "grid", headStyles: { fillColor: [34, 84, 61], fontSize: 7 }, bodyStyles: { fontSize: 7 }
    });
    doc.save(`DailyReports_${fromStr.replace(/ /g,"-")}_to_${toStr.replace(/ /g,"-")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePrint = () => {
    if (filteredReports.length === 0) { toast.error("No data to print"); return; }
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    const html = `<html><head><title>Daily Reports</title><style>body{font-family:Arial;padding:20px}h1{color:#22543d}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#22543d;color:#fff;padding:5px}td{padding:4px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}.text-right{text-align:right}</style></head><body><h1>Daily Submitted Reports</h1><p>Date: ${fromStr} to ${toStr} | Total: ${filteredReports.length}</p><table><tr><th>Date</th><th>Salesman</th><th>Initial</th><th>Sold</th><th>Damaged</th><th>Remain</th><th>Cash</th><th>Expense</th><th>Net Cash</th><th>Cheque</th><th>Online</th><th>Tray</th></tr>${filteredReports.map(r=>`<tr><td>${formatDate(r.report_date)}</td><td>${r.salesman_name}</td><td class="text-right">${r.initial_crates}</td><td class="text-right">${r.crates_sold}</td><td class="text-right">${r.crates_damaged}</td><td class="text-right">${r.remaining_crates}</td><td class="text-right">₹${r.cash_collected}</td><td class="text-right">₹${r.expense}</td><td class="text-right">₹${r.net_cash}</td><td class="text-right">₹${r.cheque_amount||0}</td><td class="text-right">₹${r.online_amount||0}</td><td class="text-right">${r.empty_crates_returned}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div className="space-y-6" data-testid="daily-submitted-report-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Daily Submitted Reports</h1>
          <p className="text-muted-foreground">View all submitted sale reports by salesmen</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading || filteredReports.length === 0}>
            <FileSpreadsheet size={16} className="mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loading || filteredReports.length === 0}>
            <FileText size={16} className="mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || filteredReports.length === 0}>
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

              {/* Salesman Filter */}
              <Select value={selectedSalesman || "all"} onValueChange={(val) => setSelectedSalesman(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[180px]" data-testid="salesman-filter">
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

              {/* Clear Filters */}
              {(fromDate || toDate || selectedSalesman) && (
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

            {/* Totals */}
            <div className="lg:ml-auto flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-muted-foreground">Total Reports:</span>
              <span className="text-lg font-semibold text-blue-600">{totalRecords}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search by salesman name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="daily-report-search-input"
        />
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Submitted Reports ({filteredReports.length}{searchQuery && ` of ${reports.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No submitted reports found</p>
              <p className="text-sm text-muted-foreground">
                {fromDate || toDate || selectedSalesman 
                  ? "Try adjusting your filters" 
                  : "Reports will appear here when salesmen submit their daily reports"}
              </p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No reports match your search</p>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12 py-4">#</TableHead>
                    <TableHead className="py-4">Report Date</TableHead>
                    <TableHead className="py-4">Salesman</TableHead>
                    <TableHead className="text-right py-4">Initial</TableHead>
                    <TableHead className="text-right py-4">Sold</TableHead>
                    <TableHead className="text-right py-4">Damaged</TableHead>
                    <TableHead className="text-right py-4">Remaining</TableHead>
                    <TableHead className="text-right py-4">Cash</TableHead>
                    <TableHead className="text-right py-4">Expense</TableHead>
                    <TableHead className="text-right py-4">Net Cash</TableHead>
                    <TableHead className="text-right py-4">Cheque</TableHead>
                    <TableHead className="text-right py-4">Online</TableHead>
                    <TableHead className="text-right py-4">Return Tray</TableHead>
                    <TableHead className="py-4">Image</TableHead>
                    <TableHead className="py-4">Submitted At</TableHead>
                    <TableHead className="text-center py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report, index) => (
                    <TableRow 
                      key={report.id} 
                      data-testid={`report-row-${index}`}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50/70"}
                    >
                      <TableCell className="font-medium py-4">{index + 1}</TableCell>
                      <TableCell className="py-4">{formatDate(report.report_date)}</TableCell>
                      <TableCell className="font-medium py-4">{report.salesman_name}</TableCell>
                      <TableCell className="text-right py-4">{report.initial_crates}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium py-4">{report.crates_sold}</TableCell>
                      <TableCell className="text-right text-red-600 py-4">{report.crates_damaged}</TableCell>
                      <TableCell className="text-right font-medium py-4">{report.remaining_crates}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(report.cash_collected)}</TableCell>
                      <TableCell className="text-right text-red-600 py-4">{formatCurrency(report.expense)}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium py-4">{formatCurrency(report.remaining_cash)}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(report.cheque)}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(report.online)}</TableCell>
                      <TableCell className="text-right py-4">{report.return_tray}</TableCell>
                      <TableCell className="py-4">
                        {report.image_url ? (
                          <a 
                            href={`${BACKEND_URL}${report.image_url}`} 
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
                      <TableCell className="text-xs text-muted-foreground py-4">{formatDateTime(report.submitted_at)}</TableCell>
                      <TableCell className="text-center py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(report)}
                            data-testid={`edit-report-${index}`}
                            className="hover:bg-blue-100 hover:text-blue-600"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(report)}
                            data-testid={`view-report-${index}`}
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Report Date</p>
                  <p className="font-medium">{formatDate(selectedReport.report_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Salesman</p>
                  <p className="font-medium">{selectedReport.salesman_name}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Crates Summary</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Initial</p>
                    <p className="text-lg font-semibold text-blue-600">{selectedReport.initial_crates}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Sold</p>
                    <p className="text-lg font-semibold text-green-600">{selectedReport.crates_sold}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Damaged</p>
                    <p className="text-lg font-semibold text-red-600">{selectedReport.crates_damaged}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="text-lg font-semibold">{selectedReport.remaining_crates}</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Payment Summary</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Cash Collected</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedReport.cash_collected)}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Expense</p>
                    <p className="text-lg font-semibold text-red-600">{formatCurrency(selectedReport.expense)}</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Net Cash</p>
                    <p className="text-lg font-semibold text-primary">{formatCurrency(selectedReport.remaining_cash)}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Cheque</p>
                    <p className="text-lg font-semibold text-purple-600">{formatCurrency(selectedReport.cheque)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Online</p>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(selectedReport.online)}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Return Tray</p>
                    <p className="text-lg font-semibold text-orange-600">{selectedReport.return_tray}</p>
                  </div>
                </div>
              </div>
              
              {selectedReport.comments && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Comments</p>
                  <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                    {selectedReport.comments}
                  </p>
                </div>
              )}
              
              {selectedReport.image_url && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Attached Image</p>
                  <a 
                    href={`${BACKEND_URL}${selectedReport.image_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img 
                      src={`${BACKEND_URL}${selectedReport.image_url}`}
                      alt="Report attachment"
                      className="max-h-48 rounded-lg border hover:opacity-90 transition-opacity cursor-pointer"
                    />
                  </a>
                </div>
              )}
              
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Submitted at: {formatDateTime(selectedReport.submitted_at)} IST
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sale Report</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              {editingReport && (
                <div className="text-sm text-muted-foreground space-y-1 p-3 bg-gray-50 rounded-lg">
                  <p><strong>Salesman:</strong> {editingReport.salesman_name}</p>
                  <p><strong>Date:</strong> {formatDate(editingReport.report_date)}</p>
                  <p><strong>Initial Crates:</strong> {editingReport.initial_crates} | <strong>Sold:</strong> {editingReport.crates_sold}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit-damaged">Damaged Crates</Label>
                <Input
                  id="edit-damaged"
                  type="number"
                  min="0"
                  value={editForm.crates_damaged}
                  onChange={(e) => handleEditFormChange("crates_damaged", e.target.value)}
                  data-testid="edit-damaged-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-expense">Expense (₹)</Label>
                <Input
                  id="edit-expense"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.expense}
                  onChange={(e) => handleEditFormChange("expense", e.target.value)}
                  data-testid="edit-expense-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-comments">Comments</Label>
                <Textarea
                  id="edit-comments"
                  placeholder="Add comments..."
                  value={editForm.comments}
                  onChange={(e) => handleEditFormChange("comments", e.target.value)}
                  data-testid="edit-comments-input"
                  rows={3}
                />
              </div>

              {/* Preview calculated values */}
              {editingReport && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm space-y-1">
                  <p className="font-medium text-blue-800">After Update:</p>
                  <div className="grid grid-cols-2 gap-2 text-blue-700">
                    <span>Remaining Crates: {editingReport.initial_crates - editingReport.crates_sold - (parseInt(editForm.crates_damaged) || 0)}</span>
                    <span>Net Cash: ₹{(editingReport.cash_collected - (parseFloat(editForm.expense) || 0)).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-600">
                {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</> : "Update Report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailySubmittedReportPage;
