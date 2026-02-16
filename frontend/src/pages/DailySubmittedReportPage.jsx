import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Loader2, CalendarIcon, Filter, X, Eye, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DailySubmittedReportPage = () => {
  const [reports, setReports] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
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

  return (
    <div className="space-y-6" data-testid="daily-submitted-report-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Daily Submitted Reports</h1>
          <p className="text-muted-foreground">View all submitted sale reports by salesmen</p>
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

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Submitted Reports
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
                  {reports.map((report, index) => (
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(report)}
                          data-testid={`view-report-${index}`}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <Eye size={16} />
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
    </div>
  );
};

export default DailySubmittedReportPage;
