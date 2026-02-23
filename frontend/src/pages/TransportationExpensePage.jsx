import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Pencil, Trash2, Car, Loader2, CalendarIcon, Filter, X, Search, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TransportationExpensePage = () => {
  const [expenses, setExpenses] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Date filters - default to today
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [selectedSalesman, setSelectedSalesman] = useState("");
  
  const [formData, setFormData] = useState({
    salesman_id: "",
    amount_given: "",
    diesel: "",
    driver_bata: "",
    toll_over_load: "",
    loading_charges: "",
    other_expenses: "",
  });

  // Auto-calculate totals
  const calculatedValues = useMemo(() => {
    const diesel = parseFloat(formData.diesel) || 0;
    const driverBata = parseFloat(formData.driver_bata) || 0;
    const tollOverLoad = parseFloat(formData.toll_over_load) || 0;
    const loadingCharges = parseFloat(formData.loading_charges) || 0;
    const otherExpenses = parseFloat(formData.other_expenses) || 0;
    const amountGiven = parseFloat(formData.amount_given) || 0;
    
    const totalExpense = diesel + driverBata + tollOverLoad + loadingCharges + otherExpenses;
    const balanceGivenBack = amountGiven - totalExpense;
    
    return {
      totalExpense: totalExpense.toFixed(2),
      balanceGivenBack: balanceGivenBack.toFixed(2)
    };
  }, [formData]);

  const fetchSalesmen = async () => {
    try {
      const response = await api.get(`/salesmen`);
      setSalesmen(response.data.salesmen || []);
    } catch (error) {
      console.error("Error fetching salesmen:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let url = `/transportation-expenses`;
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
      setExpenses(data.expenses || []);
      setTotalAmount(data.total_amount || 0);
    } catch (error) {
      console.error("Error fetching transportation expenses:", error);
      toast.error("Failed to fetch transportation expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fromDate, toDate, selectedSalesman]);

  // Filter expenses based on search query
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const query = searchQuery.toLowerCase();
    return expenses.filter(expense => 
      expense.salesman_name?.toLowerCase().includes(query)
    );
  }, [expenses, searchQuery]);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        salesman_id: expense.salesman_id || "",
        amount_given: expense.amount_given?.toString() || "",
        diesel: expense.diesel?.toString() || "",
        driver_bata: expense.driver_bata?.toString() || "",
        toll_over_load: expense.toll_over_load?.toString() || "",
        loading_charges: expense.loading_charges?.toString() || "",
        other_expenses: expense.other_expenses?.toString() || "",
      });
    } else {
      setEditingExpense(null);
      setFormData({
        salesman_id: "",
        amount_given: "",
        diesel: "",
        driver_bata: "",
        toll_over_load: "",
        loading_charges: "",
        other_expenses: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
    setFormData({
      salesman_id: "",
      amount_given: "",
      diesel: "",
      driver_bata: "",
      toll_over_load: "",
      loading_charges: "",
      other_expenses: "",
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.salesman_id) {
      toast.error("Please select a salesman");
      return;
    }
    
    if (!formData.amount_given || parseFloat(formData.amount_given) < 0) {
      toast.error("Please enter a valid amount given to driver");
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        salesman_id: formData.salesman_id,
        amount_given: parseFloat(formData.amount_given) || 0,
        diesel: parseFloat(formData.diesel) || 0,
        driver_bata: parseFloat(formData.driver_bata) || 0,
        toll_over_load: parseFloat(formData.toll_over_load) || 0,
        loading_charges: parseFloat(formData.loading_charges) || 0,
        other_expenses: parseFloat(formData.other_expenses) || 0,
      };
      
      if (editingExpense) {
        await api.put(`/transportation-expenses/${editingExpense.id}`, payload);
        toast.success("Transportation expense updated successfully");
      } else {
        await api.post(`/transportation-expenses`, payload);
        toast.success("Transportation expense added successfully");
      }
      
      handleCloseDialog();
      fetchExpenses();
    } catch (error) {
      console.error("Error saving transportation expense:", error);
      toast.error(error.response?.data?.detail || "Failed to save transportation expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (expense) => {
    setDeleteExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteExpense) return;
    
    try {
      await api.delete(`/transportation-expenses/${deleteExpense.id}`);
      toast.success("Transportation expense deleted successfully");
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting transportation expense:", error);
      toast.error("Failed to delete transportation expense");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteExpense(null);
    }
  };

  // Export functions
  const exportToExcel = () => {
    if (filteredExpenses.length === 0) { toast.error("No data to export"); return; }
    const data = filteredExpenses.map((e, i) => ({
      "#": i+1, 
      "Date": formatDate(e.expense_date), 
      "Salesman": e.salesman_name,
      "Amount Given": e.amount_given,
      "Diesel": e.diesel,
      "Driver Bata": e.driver_bata,
      "Toll/Overload": e.toll_over_load,
      "Loading": e.loading_charges,
      "Other": e.other_expenses,
      "Total Expense": e.total_expense,
      "Balance Back": e.balance_given_back
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transportation Expenses");
    const fromStr = fromDate ? format(fromDate, "dd-MMM-yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd-MMM-yyyy") : "All";
    XLSX.writeFile(wb, `TransportationExpenses_${fromStr}_to_${toStr}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const exportToPDF = () => {
    if (filteredExpenses.length === 0) { toast.error("No data to export"); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    doc.setFontSize(16); doc.setTextColor(34, 84, 61);
    doc.text("Transportation Expenses", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Date: ${fromStr} to ${toStr} | Total: ${formatCurrency(totalAmount)}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Date", "Salesman", "Given", "Diesel", "Bata", "Toll", "Loading", "Other", "Total", "Balance"]],
      body: filteredExpenses.map(e => [
        formatDate(e.expense_date), e.salesman_name, `₹${e.amount_given}`, `₹${e.diesel}`, 
        `₹${e.driver_bata}`, `₹${e.toll_over_load}`, `₹${e.loading_charges}`, `₹${e.other_expenses}`,
        `₹${e.total_expense}`, `₹${e.balance_given_back}`
      ]),
      theme: "grid", headStyles: { fillColor: [34, 84, 61], fontSize: 7 }, bodyStyles: { fontSize: 7 }
    });
    doc.save(`TransportationExpenses_${fromStr.replace(/ /g,"-")}_to_${toStr.replace(/ /g,"-")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePrint = () => {
    if (filteredExpenses.length === 0) { toast.error("No data to print"); return; }
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    const html = `<html><head><title>Transportation Expenses</title><style>body{font-family:Arial;padding:20px}h1{color:#22543d}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#22543d;color:#fff;padding:5px}td{padding:4px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}.text-right{text-align:right}</style></head><body><h1>Transportation Expenses</h1><p>Date: ${fromStr} to ${toStr} | Total: ${formatCurrency(totalAmount)}</p><table><tr><th>Date</th><th>Salesman</th><th>Given</th><th>Diesel</th><th>Bata</th><th>Toll</th><th>Loading</th><th>Other</th><th>Total</th><th>Balance</th></tr>${filteredExpenses.map(e=>`<tr><td>${formatDate(e.expense_date)}</td><td>${e.salesman_name}</td><td class="text-right">₹${e.amount_given}</td><td class="text-right">₹${e.diesel}</td><td class="text-right">₹${e.driver_bata}</td><td class="text-right">₹${e.toll_over_load}</td><td class="text-right">₹${e.loading_charges}</td><td class="text-right">₹${e.other_expenses}</td><td class="text-right">₹${e.total_expense}</td><td class="text-right">₹${e.balance_given_back}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div className="space-y-6" data-testid="transportation-expense-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Transportation Expenses</h1>
          <p className="text-muted-foreground">Manage driver transportation expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading || filteredExpenses.length === 0}>
            <FileSpreadsheet size={16} className="mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loading || filteredExpenses.length === 0}>
            <FileText size={16} className="mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || filteredExpenses.length === 0}>
            <Printer size={16} className="mr-1" /> Print
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-primary hover:bg-primary-600" data-testid="add-expense-btn">
            <Plus size={18} className="mr-1" /> Add Expense
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

            {/* Total */}
            <div className="lg:ml-auto flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-muted-foreground">Total Expense:</span>
              <span className="text-lg font-semibold text-orange-600">{formatCurrency(totalAmount)}</span>
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
          data-testid="expense-search-input"
        />
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car size={20} className="text-orange-500" />
            Transportation Expenses ({filteredExpenses.length}{searchQuery && ` of ${expenses.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <Car size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No transportation expenses found</p>
              <p className="text-sm text-muted-foreground">Click "Add Expense" to add your first entry</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Car size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No expenses match your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12 py-4">#</TableHead>
                    <TableHead className="py-4">Date</TableHead>
                    <TableHead className="py-4">Salesman</TableHead>
                    <TableHead className="text-right py-4">Amount Given</TableHead>
                    <TableHead className="text-right py-4">Diesel</TableHead>
                    <TableHead className="text-right py-4">Driver Bata</TableHead>
                    <TableHead className="text-right py-4">Toll/Overload</TableHead>
                    <TableHead className="text-right py-4">Loading</TableHead>
                    <TableHead className="text-right py-4">Other</TableHead>
                    <TableHead className="text-right py-4">Total Expense</TableHead>
                    <TableHead className="text-right py-4">Balance Back</TableHead>
                    <TableHead className="text-center py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense, index) => (
                    <TableRow 
                      key={expense.id} 
                      data-testid={`expense-row-${index}`}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50/70"}
                    >
                      <TableCell className="font-medium py-4">{index + 1}</TableCell>
                      <TableCell className="py-4">{formatDate(expense.expense_date)}</TableCell>
                      <TableCell className="font-medium py-4">{expense.salesman_name}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(expense.amount_given)}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(expense.diesel)}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(expense.driver_bata)}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(expense.toll_over_load)}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(expense.loading_charges)}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(expense.other_expenses)}</TableCell>
                      <TableCell className="text-right py-4 font-semibold text-orange-600">{formatCurrency(expense.total_expense)}</TableCell>
                      <TableCell className={cn(
                        "text-right py-4 font-semibold",
                        expense.balance_given_back >= 0 ? "text-green-600" : "text-red-600"
                      )}>{formatCurrency(expense.balance_given_back)}</TableCell>
                      <TableCell className="text-center py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(expense)}
                            data-testid={`edit-expense-${index}`}
                            className="hover:bg-blue-100 hover:text-blue-600"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(expense)}
                            data-testid={`delete-expense-${index}`}
                            className="hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-orange-50 font-semibold border-t-2 border-orange-200">
                    <TableCell className="py-4"></TableCell>
                    <TableCell className="py-4 font-bold text-orange-800">TOTAL</TableCell>
                    <TableCell className="py-4"></TableCell>
                    <TableCell className="text-right py-4 font-bold">{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.amount_given || 0), 0))}</TableCell>
                    <TableCell className="text-right py-4 font-bold">{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.diesel || 0), 0))}</TableCell>
                    <TableCell className="text-right py-4 font-bold">{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.driver_bata || 0), 0))}</TableCell>
                    <TableCell className="text-right py-4 font-bold">{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.toll_over_load || 0), 0))}</TableCell>
                    <TableCell className="text-right py-4 font-bold">{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.loading_charges || 0), 0))}</TableCell>
                    <TableCell className="text-right py-4 font-bold">{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.other_expenses || 0), 0))}</TableCell>
                    <TableCell className="text-right py-4 font-bold text-orange-600">{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.total_expense || 0), 0))}</TableCell>
                    <TableCell className="text-right py-4 font-bold">{formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.balance_given_back || 0), 0))}</TableCell>
                    <TableCell className="py-4"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car size={20} className="text-orange-500" />
              {editingExpense ? "Edit Transportation Expense" : "Add Transportation Expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Salesman Selection */}
              <div className="space-y-2">
                <Label htmlFor="salesman">Select Salesman *</Label>
                <Select 
                  value={formData.salesman_id} 
                  onValueChange={(val) => handleInputChange("salesman_id", val)}
                >
                  <SelectTrigger data-testid="salesman-select">
                    <SelectValue placeholder="Select a salesman" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesmen.map((salesman) => (
                      <SelectItem key={salesman.id} value={salesman.id}>
                        {salesman.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Given */}
              <div className="space-y-2">
                <Label htmlFor="amount_given">Amount Given to Driver (₹) *</Label>
                <Input
                  id="amount_given"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount_given}
                  onChange={(e) => handleInputChange("amount_given", e.target.value)}
                  placeholder="Enter amount given"
                  data-testid="amount-given-input"
                />
              </div>

              {/* Expense Fields */}
              <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <p className="text-sm font-medium text-gray-700">Expense Breakdown</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="diesel" className="text-xs">Diesel (₹)</Label>
                    <Input
                      id="diesel"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.diesel}
                      onChange={(e) => handleInputChange("diesel", e.target.value)}
                      placeholder="0"
                      data-testid="diesel-input"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="driver_bata" className="text-xs">Driver Bata (₹)</Label>
                    <Input
                      id="driver_bata"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.driver_bata}
                      onChange={(e) => handleInputChange("driver_bata", e.target.value)}
                      placeholder="0"
                      data-testid="driver-bata-input"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="toll_over_load" className="text-xs">Toll/Overload (₹)</Label>
                    <Input
                      id="toll_over_load"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.toll_over_load}
                      onChange={(e) => handleInputChange("toll_over_load", e.target.value)}
                      placeholder="0"
                      data-testid="toll-input"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="loading_charges" className="text-xs">Loading Charges (₹)</Label>
                    <Input
                      id="loading_charges"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.loading_charges}
                      onChange={(e) => handleInputChange("loading_charges", e.target.value)}
                      placeholder="0"
                      data-testid="loading-input"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="other_expenses" className="text-xs">Other Expenses (₹)</Label>
                  <Input
                    id="other_expenses"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.other_expenses}
                    onChange={(e) => handleInputChange("other_expenses", e.target.value)}
                    placeholder="0"
                    data-testid="other-expenses-input"
                  />
                </div>
              </div>

              {/* Auto-calculated Summary */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800 mb-3">Auto-Calculated Summary</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Total Expense</p>
                    <p className="text-xl font-bold text-orange-600">₹{calculatedValues.totalExpense}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Balance Given Back</p>
                    <p className={cn(
                      "text-xl font-bold",
                      parseFloat(calculatedValues.balanceGivenBack) >= 0 ? "text-green-600" : "text-red-600"
                    )}>₹{calculatedValues.balanceGivenBack}</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</> : editingExpense ? "Update Expense" : "Add Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transportation Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transportation expense for {deleteExpense?.salesman_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TransportationExpensePage;
