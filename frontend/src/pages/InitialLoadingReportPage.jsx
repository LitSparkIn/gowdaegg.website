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
import { FileText, Loader2, CalendarIcon, Filter, X, Package, Search, FileSpreadsheet, Printer, Pencil } from "lucide-react";
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

const InitialLoadingReportPage = () => {
  const [loads, setLoads] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCrates, setTotalCrates] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLoad, setEditingLoad] = useState(null);
  const [editCrates, setEditCrates] = useState("");
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

  const fetchLoads = async () => {
    try {
      setLoading(true);
      let url = `/initial-loads`;
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
      setLoads(data.initial_loads || []);
      setTotalCrates(data.total_crates || 0);
      setTotalRecords(data.total_records || 0);
    } catch (error) {
      console.error("Error fetching loads:", error);
      toast.error("Failed to fetch initial loads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    fetchLoads();
  }, [fromDate, toDate, selectedSalesman]);

  // Filter loads based on search query
  const filteredLoads = useMemo(() => {
    if (!searchQuery.trim()) return loads;
    const query = searchQuery.toLowerCase();
    return loads.filter(load => 
      load.salesman_name?.toLowerCase().includes(query) ||
      load.salesman_phone?.toLowerCase().includes(query) ||
      load.route_name?.toLowerCase().includes(query)
    );
  }, [loads, searchQuery]);

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

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Export functions
  const exportToExcel = () => {
    if (filteredLoads.length === 0) { toast.error("No data to export"); return; }
    const data = filteredLoads.map((l, i) => ({ "#": i+1, "Date": formatDate(l.load_date), "Time": formatTime(l.created_at), "Salesman": l.salesman_name, "Phone": l.salesman_phone, "Route": l.route_name || "N/A", "Crates": l.initial_crates }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Initial Loads");
    const fromStr = fromDate ? format(fromDate, "dd-MMM-yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd-MMM-yyyy") : "All";
    XLSX.writeFile(wb, `InitialLoads_${fromStr}_to_${toStr}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const exportToPDF = () => {
    if (filteredLoads.length === 0) { toast.error("No data to export"); return; }
    const doc = new jsPDF();
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    doc.setFontSize(16); doc.setTextColor(34, 84, 61);
    doc.text("Initial Loading Report", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Date: ${fromStr} to ${toStr} | Total Crates: ${totalCrates}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Date", "Time", "Salesman", "Phone", "Route", "Crates"]],
      body: filteredLoads.map((l, i) => [i+1, formatDate(l.load_date), formatTime(l.created_at), l.salesman_name, l.salesman_phone, l.route_name || "N/A", l.initial_crates]),
      theme: "grid", headStyles: { fillColor: [34, 84, 61] }
    });
    doc.save(`InitialLoads_${fromStr.replace(/ /g,"-")}_to_${toStr.replace(/ /g,"-")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePrint = () => {
    if (filteredLoads.length === 0) { toast.error("No data to print"); return; }
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    const html = `<html><head><title>Initial Loads</title><style>body{font-family:Arial;padding:20px}h1{color:#22543d}table{width:100%;border-collapse:collapse}th{background:#22543d;color:#fff;padding:8px}td{padding:6px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}.text-right{text-align:right}</style></head><body><h1>Initial Loading Report</h1><p>Date: ${fromStr} to ${toStr} | Total Crates: ${totalCrates}</p><table><tr><th>#</th><th>Date</th><th>Time</th><th>Salesman</th><th>Phone</th><th>Route</th><th class="text-right">Crates</th></tr>${filteredLoads.map((l,i)=>`<tr><td>${i+1}</td><td>${formatDate(l.load_date)}</td><td>${formatTime(l.created_at)}</td><td>${l.salesman_name}</td><td>${l.salesman_phone}</td><td>${l.route_name||"N/A"}</td><td class="text-right">${l.initial_crates}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  // Edit functions
  const handleEditClick = (load) => {
    setEditingLoad(load);
    setEditCrates(load.initial_crates.toString());
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editCrates || parseInt(editCrates) <= 0) {
      toast.error("Please enter valid number of crates");
      return;
    }
    
    setSubmitting(true);
    try {
      await api.put(`/initial-loads/${editingLoad.id}`, { initial_crates: parseInt(editCrates) });
      toast.success("Initial load updated successfully");
      setIsEditDialogOpen(false);
      setEditingLoad(null);
      fetchLoads();
    } catch (error) {
      console.error("Error updating initial load:", error);
      toast.error(error.response?.data?.detail || "Failed to update initial load");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="initial-loading-report-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Initial Loading Report</h1>
          <p className="text-muted-foreground">View all initial loads by salesmen</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading || filteredLoads.length === 0}>
            <FileSpreadsheet size={16} className="mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loading || filteredLoads.length === 0}>
            <FileText size={16} className="mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || filteredLoads.length === 0}>
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
            <div className="lg:ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                <span className="text-sm text-muted-foreground">Records:</span>
                <span className="text-lg font-semibold text-blue-600">{totalRecords}</span>
              </div>
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                <Package size={18} className="text-primary" />
                <span className="text-sm text-muted-foreground">Total Crates:</span>
                <span className="text-lg font-semibold text-primary">{totalCrates}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search by salesman, phone, route..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="initial-load-search-input"
        />
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Initial Loads ({filteredLoads.length}{searchQuery && ` of ${loads.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : loads.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No initial loads found</p>
              <p className="text-sm text-muted-foreground">
                {fromDate || toDate || selectedSalesman 
                  ? "Try adjusting your filters" 
                  : "Initial loads will appear here when salesmen load crates"}
              </p>
            </div>
          ) : filteredLoads.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No loads match your search</p>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12 py-4">#</TableHead>
                    <TableHead className="py-4">Date</TableHead>
                    <TableHead className="py-4">Time</TableHead>
                    <TableHead className="py-4">Salesman</TableHead>
                    <TableHead className="py-4">Phone</TableHead>
                    <TableHead className="py-4">Route</TableHead>
                    <TableHead className="text-right py-4">Crates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoads.map((load, index) => (
                    <TableRow 
                      key={load.id} 
                      data-testid={`load-row-${index}`}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50/70"}
                    >
                      <TableCell className="font-medium py-4">{index + 1}</TableCell>
                      <TableCell className="py-4">{formatDate(load.load_date)}</TableCell>
                      <TableCell className="text-muted-foreground py-4">
                        {formatTime(load.created_at)}
                      </TableCell>
                      <TableCell className="font-medium py-4">{load.salesman_name}</TableCell>
                      <TableCell className="text-muted-foreground py-4">{load.salesman_phone}</TableCell>
                      <TableCell className="py-4">
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {load.route_name || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <span className="font-semibold text-primary">{load.initial_crates}</span>
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

export default InitialLoadingReportPage;
