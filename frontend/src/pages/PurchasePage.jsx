import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, ShoppingCart, Loader2, CalendarIcon, Filter, X, Package, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PurchasePage = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePurchase, setDeletePurchase] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [totals, setTotals] = useState({
    total_records: 0,
    total_amount: 0,
    total_paid: 0,
    total_pending: 0
  });
  
  // Date filters
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    supplier_id: "",
    crates: "",
    price: "",
    amount_paid: "",
    payment_mode: "",
  });
  
  // Calculated fields
  const [selectedSupplierData, setSelectedSupplierData] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`, getAuthHeaders());
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      let url = `${API}/purchases`;
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
      
      const response = await axios.get(url, getAuthHeaders());
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

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      crates: "",
      price: "",
      amount_paid: "",
      payment_mode: "",
    });
    setSelectedSupplierData(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (supplierId) => {
    setFormData((prev) => ({ ...prev, supplier_id: supplierId }));
    const supplier = suppliers.find(s => s.id === supplierId);
    setSelectedSupplierData(supplier || null);
  };

  // Calculate derived values
  const crates = parseInt(formData.crates) || 0;
  const price = parseFloat(formData.price) || 0;
  const amountPaid = parseFloat(formData.amount_paid) || 0;
  const previousDues = selectedSupplierData?.previous_dues || 0;
  const total = crates * 30 * price;
  const grandTotal = total + previousDues;
  const pendingAmount = grandTotal - amountPaid;

  const validateForm = () => {
    if (!formData.supplier_id) {
      toast.error("Please select a supplier");
      return false;
    }
    if (!formData.crates || parseInt(formData.crates) <= 0) {
      toast.error("Please enter valid number of crates");
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Please enter valid price per egg");
      return false;
    }
    if (formData.amount_paid === "" || parseFloat(formData.amount_paid) < 0) {
      toast.error("Please enter valid amount paid");
      return false;
    }
    if (!formData.payment_mode) {
      toast.error("Please select payment mode");
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
        supplier_id: formData.supplier_id,
        crates: parseInt(formData.crates),
        price: parseFloat(formData.price),
        amount_paid: parseFloat(formData.amount_paid),
        payment_mode: formData.payment_mode,
      };

      await axios.post(`${API}/purchases`, payload, getAuthHeaders());
      toast.success("Purchase added successfully");
      handleCloseDialog();
      fetchPurchases();
      fetchSuppliers(); // Refresh suppliers to get updated dues
    } catch (error) {
      console.error("Error saving purchase:", error);
      toast.error(error.response?.data?.detail || "Failed to save purchase");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (purchase) => {
    setDeletePurchase(purchase);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletePurchase) return;

    try {
      await axios.delete(`${API}/purchases/${deletePurchase.id}`, getAuthHeaders());
      toast.success("Purchase deleted successfully");
      fetchPurchases();
    } catch (error) {
      console.error("Error deleting purchase:", error);
      toast.error(error.response?.data?.detail || "Failed to delete purchase");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletePurchase(null);
    }
  };

  const clearFilters = () => {
    setFromDate(null);
    setToDate(null);
    setSelectedSupplier("");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeIST = (timeString) => {
    if (!timeString) return "-";
    try {
      const [hours, minutes] = timeString.split(":");
      let hour = parseInt(hours, 10);
      let minute = parseInt(minutes, 10);
      
      minute += 30;
      if (minute >= 60) {
        minute -= 60;
        hour += 1;
      }
      hour += 5;
      if (hour >= 24) {
        hour -= 24;
      }
      
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      const formattedHour = hour12.toString().padStart(2, "0");
      const formattedMinute = minute.toString().padStart(2, "0");
      
      return `${formattedHour}:${formattedMinute} ${period}`;
    } catch {
      return timeString;
    }
  };

  const paymentModes = ["Cash", "Cheque", "Online", "Bill"];

  return (
    <div className="space-y-6" data-testid="purchase-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Purchase Management</h1>
          <p className="text-muted-foreground">Track purchases from suppliers</p>
        </div>
        <Button
          onClick={handleOpenDialog}
          data-testid="add-purchase-btn"
          className="rounded-full bg-primary hover:bg-primary-600"
        >
          <Plus size={20} className="mr-2" />
          Add Purchase
        </Button>
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

              {/* Supplier Filter */}
              <Select value={selectedSupplier || "all"} onValueChange={(val) => setSelectedSupplier(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[170px]" data-testid="supplier-filter">
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Purchases</p>
            <p className="text-xl font-semibold text-primary-950">{totals.total_records}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-xl font-semibold text-blue-600">{formatCurrency(totals.total_amount)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-xl font-semibold text-green-600">{formatCurrency(totals.total_paid)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Pending</p>
            <p className="text-xl font-semibold text-red-600">{formatCurrency(totals.total_pending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary" />
            Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No purchases found</p>
              <p className="text-sm text-muted-foreground">
                {fromDate || toDate || selectedSupplier 
                  ? "Try adjusting your filters" 
                  : "Click \"Add Purchase\" to record your first purchase"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="py-4">Date & Time</TableHead>
                    <TableHead className="py-4">Supplier</TableHead>
                    <TableHead className="py-4">Payment Mode</TableHead>
                    <TableHead className="text-right py-4">Crates</TableHead>
                    <TableHead className="text-right py-4">Price/Egg</TableHead>
                    <TableHead className="text-right py-4">Total</TableHead>
                    <TableHead className="text-right py-4">Prev Dues</TableHead>
                    <TableHead className="text-right py-4">Grand Total</TableHead>
                    <TableHead className="text-right py-4">Paid</TableHead>
                    <TableHead className="text-right py-4">Pending</TableHead>
                    <TableHead className="text-right py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase, index) => (
                    <TableRow 
                      key={purchase.id} 
                      data-testid={`purchase-row-${index}`}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50/70"}
                    >
                      <TableCell className="whitespace-nowrap py-4">
                        <div>
                          <p>{formatDate(purchase.purchase_date)}</p>
                          <p className="text-xs text-muted-foreground">{formatTimeIST(purchase.purchase_time)} IST</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium py-4">{purchase.supplier_name}</TableCell>
                      <TableCell className="py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          purchase.payment_mode === "Cash" ? "bg-green-100 text-green-700" :
                          purchase.payment_mode === "Online" ? "bg-blue-100 text-blue-700" :
                          purchase.payment_mode === "Cheque" ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        )}>
                          {purchase.payment_mode}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium py-4">{purchase.crates}</TableCell>
                      <TableCell className="text-right py-4">₹{purchase.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right py-4">{formatCurrency(purchase.total)}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-4">{formatCurrency(purchase.previous_dues)}</TableCell>
                      <TableCell className="text-right font-medium py-4">{formatCurrency(purchase.grand_total)}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium py-4">{formatCurrency(purchase.amount_paid)}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium py-4">{formatCurrency(purchase.pending_amount)}</TableCell>
                      <TableCell className="text-right py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(purchase)}
                          data-testid={`delete-purchase-${index}`}
                          className="hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 size={16} />
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

      {/* Add Purchase Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Purchase</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Supplier */}
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={formData.supplier_id} onValueChange={handleSupplierChange}>
                  <SelectTrigger data-testid="supplier-select">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Crates and Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crates">Crates *</Label>
                  <Input
                    id="crates"
                    type="number"
                    placeholder="Enter crates"
                    value={formData.crates}
                    onChange={(e) => handleInputChange("crates", e.target.value)}
                    data-testid="crates-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Egg (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="Enter price"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    data-testid="price-input"
                  />
                </div>
              </div>
              
              {/* Auto-calculated Total */}
              <div className="space-y-2">
                <Label>Total (Crates × 30 × Price)</Label>
                <Input
                  value={formatCurrency(total)}
                  readOnly
                  className="bg-muted"
                  data-testid="total-display"
                />
              </div>
              
              {/* Previous Dues */}
              <div className="space-y-2">
                <Label>Previous Dues (from Supplier)</Label>
                <Input
                  value={formatCurrency(previousDues)}
                  readOnly
                  className="bg-muted"
                  data-testid="previous-dues-display"
                />
              </div>
              
              {/* Grand Total */}
              <div className="space-y-2">
                <Label>Grand Total</Label>
                <Input
                  value={formatCurrency(grandTotal)}
                  readOnly
                  className="bg-muted font-semibold"
                  data-testid="grand-total-display"
                />
              </div>
              
              {/* Amount Paid */}
              <div className="space-y-2">
                <Label htmlFor="amount_paid">Amount Paid (₹) *</Label>
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount paid"
                  value={formData.amount_paid}
                  onChange={(e) => handleInputChange("amount_paid", e.target.value)}
                  data-testid="amount-paid-input"
                />
              </div>
              
              {/* Pending Amount */}
              <div className="space-y-2">
                <Label>Pending Amount</Label>
                <Input
                  value={formatCurrency(pendingAmount)}
                  readOnly
                  className={cn("bg-muted font-semibold", pendingAmount > 0 ? "text-red-600" : "text-green-600")}
                  data-testid="pending-amount-display"
                />
              </div>
              
              {/* Payment Mode */}
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={formData.payment_mode} onValueChange={(val) => handleInputChange("payment_mode", val)}>
                  <SelectTrigger data-testid="payment-mode-select">
                    <SelectValue placeholder="Select Payment Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                data-testid="save-purchase-btn"
                className="bg-primary hover:bg-primary-600"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Purchase"
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
            <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this purchase from {deletePurchase?.supplier_name}? This action cannot be undone.
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

export default PurchasePage;
