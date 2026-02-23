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
import { Plus, Pencil, Trash2, Banknote, Loader2, CalendarIcon, Filter, X, Search, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SalaryExpensePage = () => {
  const [expenses, setExpenses] = useState([]);
  const [salarySetups, setSalarySetups] = useState([]);
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
    amount: "",
    payment_mode: "Cash",
  });

  const fetchSalarySetups = async () => {
    try {
      const response = await api.get(`/salary-setup`);
      setSalarySetups(response.data.data?.setups || []);
    } catch (error) {
      console.error("Error fetching salary setups:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let url = `/salary-expenses`;
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
      console.error("Error fetching salary expenses:", error);
      toast.error("Failed to fetch salary expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalarySetups();
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
    }).format(amount || 0);
  };

  // Get selected salesman's balance
  const getSelectedSalesmanBalance = () => {
    if (!formData.salesman_id) return null;
    const setup = salarySetups.find(s => s.salesman_id === formData.salesman_id);
    return setup?.current_balance || 0;
  };

  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        salesman_id: expense.salesman_id || "",
        amount: expense.amount?.toString() || "",
        payment_mode: expense.payment_mode || "Cash",
      });
    } else {
      setEditingExpense(null);
      setFormData({
        salesman_id: "",
        amount: "",
        payment_mode: "Cash",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
    setFormData({
      salesman_id: "",
      amount: "",
      payment_mode: "Cash",
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingExpense && !formData.salesman_id) {
      toast.error("Please select a salesman");
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        salesman_id: formData.salesman_id,
        amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode,
      };
      
      if (editingExpense) {
        await api.put(`/salary-expenses/${editingExpense.id}`, {
          amount: parseFloat(formData.amount),
          payment_mode: formData.payment_mode,
        });
        toast.success("Salary expense updated successfully");
      } else {
        await api.post(`/salary-expenses`, payload);
        toast.success("Salary expense added successfully");
      }
      
      handleCloseDialog();
      fetchExpenses();
      fetchSalarySetups(); // Refresh to get updated balance
    } catch (error) {
      console.error("Error saving salary expense:", error);
      toast.error(error.response?.data?.detail || "Failed to save salary expense");
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
      await api.delete(`/salary-expenses/${deleteExpense.id}`);
      toast.success("Salary expense deleted and balance restored");
      fetchExpenses();
      fetchSalarySetups(); // Refresh to get updated balance
    } catch (error) {
      console.error("Error deleting salary expense:", error);
      toast.error("Failed to delete salary expense");
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
      "Amount": e.amount,
      "Payment Mode": e.payment_mode
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salary Expenses");
    const fromStr = fromDate ? format(fromDate, "dd-MMM-yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd-MMM-yyyy") : "All";
    XLSX.writeFile(wb, `SalaryExpenses_${fromStr}_to_${toStr}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const exportToPDF = () => {
    if (filteredExpenses.length === 0) { toast.error("No data to export"); return; }
    const doc = new jsPDF();
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    doc.setFontSize(16); doc.setTextColor(34, 84, 61);
    doc.text("Salary Expenses", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Date: ${fromStr} to ${toStr} | Total: ${formatCurrency(totalAmount)}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Date", "Salesman", "Amount", "Payment Mode"]],
      body: filteredExpenses.map((e, i) => [
        i + 1, formatDate(e.expense_date), e.salesman_name, formatCurrency(e.amount), e.payment_mode
      ]),
      theme: "grid", headStyles: { fillColor: [34, 84, 61], fontSize: 9 }, bodyStyles: { fontSize: 9 }
    });
    doc.save(`SalaryExpenses_${fromStr.replace(/ /g,"-")}_to_${toStr.replace(/ /g,"-")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePrint = () => {
    if (filteredExpenses.length === 0) { toast.error("No data to print"); return; }
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    const html = `<html><head><title>Salary Expenses</title><style>body{font-family:Arial;padding:20px}h1{color:#22543d}table{width:100%;border-collapse:collapse}th{background:#22543d;color:#fff;padding:8px}td{padding:6px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}.text-right{text-align:right}</style></head><body><h1>Salary Expenses</h1><p>Date: ${fromStr} to ${toStr} | Total: ${formatCurrency(totalAmount)}</p><table><tr><th>#</th><th>Date</th><th>Salesman</th><th>Amount</th><th>Payment Mode</th></tr>${filteredExpenses.map((e, i)=>`<tr><td>${i+1}</td><td>${formatDate(e.expense_date)}</td><td>${e.salesman_name}</td><td class="text-right">${formatCurrency(e.amount)}</td><td>${e.payment_mode}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div className="space-y-6" data-testid="salary-expense-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Salary Expenses</h1>
          <p className="text-muted-foreground">Manage salary payments to salesmen</p>
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
          <Button 
            onClick={() => handleOpenDialog()} 
            className="bg-primary hover:bg-primary-600" 
            data-testid="add-salary-expense-btn"
            disabled={salarySetups.length === 0}
          >
            <Plus size={18} className="mr-1" /> Add Salary Expense
          </Button>
        </div>
      </div>

      {salarySetups.length === 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-orange-800 text-sm">
              <strong>Note:</strong> No salary setups found. Please configure salary setup for salesmen first before adding salary expenses.
            </p>
          </CardContent>
        </Card>
      )}

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
                  {salarySetups.map((setup) => (
                    <SelectItem key={setup.salesman_id} value={setup.salesman_id}>
                      {setup.salesman_name}
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
            <div className="lg:ml-auto flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-muted-foreground">Total Paid:</span>
              <span className="text-lg font-semibold text-green-600">{formatCurrency(totalAmount)}</span>
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
            <Banknote size={20} className="text-green-500" />
            Salary Payments ({filteredExpenses.length}{searchQuery && ` of ${expenses.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <Banknote size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No salary expenses found</p>
              <p className="text-sm text-muted-foreground">Click "Add Salary Expense" to record a payment</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Banknote size={48} className="mx-auto text-muted-foreground/50 mb-4" />
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
                    <TableHead className="text-right py-4">Amount</TableHead>
                    <TableHead className="py-4">Payment Mode</TableHead>
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
                      <TableCell className="text-right py-4 font-semibold text-green-600">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          expense.payment_mode === "Cash" && "bg-green-100 text-green-700",
                          expense.payment_mode === "Cheque" && "bg-blue-100 text-blue-700",
                          expense.payment_mode === "Online" && "bg-purple-100 text-purple-700"
                        )}>
                          {expense.payment_mode}
                        </span>
                      </TableCell>
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
                  <TableRow className="bg-green-50 font-semibold border-t-2 border-green-200">
                    <TableCell className="py-4"></TableCell>
                    <TableCell className="py-4 font-bold text-green-800">TOTAL</TableCell>
                    <TableCell className="py-4"></TableCell>
                    <TableCell className="text-right py-4 font-bold text-green-600">
                      {formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
                    </TableCell>
                    <TableCell className="py-4"></TableCell>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote size={20} className="text-green-500" />
              {editingExpense ? "Edit Salary Expense" : "Add Salary Expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Salesman Selection (only for new) */}
              {!editingExpense && (
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
                      {salarySetups.map((setup) => (
                        <SelectItem key={setup.salesman_id} value={setup.salesman_id}>
                          {setup.salesman_name} (Balance: {formatCurrency(setup.current_balance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Show current balance for editing */}
              {editingExpense && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-800">{editingExpense.salesman_name}</p>
                  <p className="text-sm text-blue-600">Date: {formatDate(editingExpense.expense_date)}</p>
                </div>
              )}

              {/* Show balance info for new expense */}
              {!editingExpense && formData.salesman_id && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600">Current Salary Balance:</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(getSelectedSalesmanBalance())}</p>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="Enter amount"
                  data-testid="amount-input"
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <Label htmlFor="payment_mode">Payment Mode *</Label>
                <Select 
                  value={formData.payment_mode} 
                  onValueChange={(val) => handleInputChange("payment_mode", val)}
                >
                  <SelectTrigger data-testid="payment-mode-select">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Balance preview for new expense */}
              {!editingExpense && formData.salesman_id && formData.amount && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-600">After this payment:</p>
                  <p className="text-xl font-bold text-orange-700">
                    New Balance: {formatCurrency(getSelectedSalesmanBalance() - (parseFloat(formData.amount) || 0))}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-green-500 hover:bg-green-600">
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
            <AlertDialogTitle>Delete Salary Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this salary expense of {formatCurrency(deleteExpense?.amount)} for {deleteExpense?.salesman_name}? 
              The amount will be restored to their salary balance.
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

export default SalaryExpensePage;
