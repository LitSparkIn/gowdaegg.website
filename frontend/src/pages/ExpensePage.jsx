import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, Receipt, Loader2, CalendarIcon, Filter, X, Search, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useUserRole } from "@/hooks/useUserRole";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ExpensePage = () => {
  const { isReadOnly } = useUserRole();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Date filters
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    description: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let url = `/expenses`;
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
      setExpenses(response.data.expenses || []);
      setTotalAmount(response.data.total_amount || 0);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [fromDate, toDate]);

  // Filter expenses based on search query
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const query = searchQuery.toLowerCase();
    return expenses.filter(expense => 
      expense.description?.toLowerCase().includes(query) ||
      expense.category?.toLowerCase().includes(query)
    );
  }, [expenses, searchQuery]);

  const resetForm = () => {
    setFormData({ amount: "", category: "", description: "" });
  };

  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        amount: expense.amount,
        category: expense.category || "",
        description: expense.description,
      });
    } else {
      setEditingExpense(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
    resetForm();
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid expense amount");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        category: formData.category.trim(),
        description: formData.description.trim(),
      };

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload);
        toast.success("Expense updated successfully");
      } else {
        await api.post(`/expenses`, payload);
        toast.success("Expense added successfully");
      }
      handleCloseDialog();
      fetchExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error(error.response?.data?.detail || "Failed to save expense");
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
      await api.delete(`/expenses/${deleteExpense.id}`);
      toast.success("Expense deleted successfully");
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error(error.response?.data?.detail || "Failed to delete expense");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteExpense(null);
    }
  };

  const clearFilters = () => {
    setFromDate(null);
    setToDate(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Export functions
  const exportToExcel = () => {
    if (filteredExpenses.length === 0) { toast.error("No data to export"); return; }
    const data = filteredExpenses.map((e, i) => ({ "#": i+1, "Date": formatDate(e.expense_date), "Amount": e.amount, "Description": e.description, "Category": e.category || "N/A" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    const fromStr = fromDate ? format(fromDate, "dd-MMM-yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd-MMM-yyyy") : "All";
    XLSX.writeFile(wb, `Expenses_${fromStr}_to_${toStr}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const exportToPDF = () => {
    if (filteredExpenses.length === 0) { toast.error("No data to export"); return; }
    const doc = new jsPDF();
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    doc.setFontSize(16); doc.setTextColor(34, 84, 61);
    doc.text("Gowda Egg Distributors - Expenses", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Date: ${fromStr} to ${toStr} | Total: Rs.${totalAmount.toLocaleString()}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Date", "Amount", "Description", "Category"]],
      body: filteredExpenses.map((e, i) => [i+1, formatDate(e.expense_date), `Rs.${e.amount.toLocaleString()}`, e.description, e.category || "N/A"]),
      theme: "grid", headStyles: { fillColor: [34, 84, 61] }
    });
    doc.save(`Expenses_${fromStr.replace(/ /g,"-")}_to_${toStr.replace(/ /g,"-")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePrint = () => {
    if (filteredExpenses.length === 0) { toast.error("No data to print"); return; }
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";
    const html = `<html><head><title>Expenses</title><style>body{font-family:Arial;padding:20px}h1{color:#22543d}table{width:100%;border-collapse:collapse}th{background:#22543d;color:#fff;padding:8px}td{padding:6px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}.text-right{text-align:right}</style></head><body><h1>Expenses Report</h1><p>Date: ${fromStr} to ${toStr} | Total: ₹${totalAmount.toLocaleString()}</p><table><tr><th>#</th><th>Date</th><th class="text-right">Amount</th><th>Description</th><th>Category</th></tr>${filteredExpenses.map((e,i)=>`<tr><td>${i+1}</td><td>${formatDate(e.expense_date)}</td><td class="text-right">₹${e.amount.toLocaleString()}</td><td>${e.description}</td><td>${e.category||"N/A"}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div className="space-y-6" data-testid="expense-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Expense Tracking</h1>
          <p className="text-muted-foreground">Track and manage your expenses</p>
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
          {!isReadOnly && (
            <Button
              onClick={() => handleOpenDialog()}
              data-testid="add-expense-btn"
              className="rounded-full bg-primary hover:bg-primary-600"
            >
              <Plus size={20} className="mr-2" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Date Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Date:</span>
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

            {/* Total Amount */}
            <div className="sm:ml-auto flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-lg font-semibold text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search by description, category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="expense-search-input"
        />
      </div>

      {/* Expenses Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt size={20} className="text-primary" />
            Expenses ({filteredExpenses.length}{searchQuery && ` of ${expenses.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No expenses found</p>
              <p className="text-sm text-muted-foreground">
                {fromDate || toDate ? "Try adjusting your date filters" : "Click \"Add Expense\" to record your first expense"}
              </p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No expenses match your search</p>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Expense</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense, index) => (
                    <TableRow key={expense.id} data-testid={`expense-row-${index}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(expense.expense_date)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-2">{expense.description}</span>
                      </TableCell>
                      <TableCell>
                        {expense.category ? (
                          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                            {expense.category}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(expense)}
                            data-testid={`edit-expense-${index}`}
                            className="hover:bg-primary/10 hover:text-primary"
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
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Expense Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  data-testid="expense-amount-input"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  placeholder="e.g., Transport, Food, Repairs"
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  data-testid="expense-category-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Enter expense details..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  data-testid="expense-description-input"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                data-testid="save-expense-btn"
                className="bg-primary hover:bg-primary-600"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingExpense ? (
                  "Update Expense"
                ) : (
                  "Add Expense"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense of {deleteExpense && formatCurrency(deleteExpense.amount)}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              data-testid="confirm-delete-btn"
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpensePage;
