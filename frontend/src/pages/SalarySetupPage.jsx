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
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Banknote, 
  Loader2, 
  CalendarIcon, 
  History, 
  PlusCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const SalarySetupPage = () => {
  const [setups, setSetups] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Add/Edit dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSetup, setEditingSetup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Update Balance dialog state
  const [isUpdateBalanceDialogOpen, setIsUpdateBalanceDialogOpen] = useState(false);
  const [updatingSetup, setUpdatingSetup] = useState(null);
  const [updateAmount, setUpdateAmount] = useState("");
  const [updateRemarks, setUpdateRemarks] = useState("Monthly salary credit");
  
  // Activity/History dialog state
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [activitySetup, setActivitySetup] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteSetup, setDeleteSetup] = useState(null);
  
  const [formData, setFormData] = useState({
    salesman_id: "",
    joining_date: null,
    monthly_salary: "",
    current_balance: "0",
  });

  const fetchSalesmen = async () => {
    try {
      const response = await api.get(`/salesmen`);
      setSalesmen(response.data.salesmen || []);
    } catch (error) {
      console.error("Error fetching salesmen:", error);
    }
  };

  const fetchSetups = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/salary-setup`);
      setSetups(response.data.data?.setups || []);
    } catch (error) {
      console.error("Error fetching salary setups:", error);
      toast.error("Failed to fetch salary setups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesmen();
    fetchSetups();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
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

  // Get salesmen who don't have salary setup yet
  const availableSalesmen = salesmen.filter(
    s => !setups.some(setup => setup.salesman_id === s.id) || 
         (editingSetup && editingSetup.salesman_id === s.id)
  );

  const handleOpenDialog = (setup = null) => {
    if (setup) {
      setEditingSetup(setup);
      setFormData({
        salesman_id: setup.salesman_id,
        joining_date: setup.joining_date ? new Date(setup.joining_date) : null,
        monthly_salary: setup.monthly_salary?.toString() || "",
        current_balance: setup.current_balance?.toString() || "0",
      });
    } else {
      setEditingSetup(null);
      setFormData({
        salesman_id: "",
        joining_date: null,
        monthly_salary: "",
        current_balance: "0",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSetup(null);
    setFormData({
      salesman_id: "",
      joining_date: null,
      monthly_salary: "",
      current_balance: "0",
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingSetup && !formData.salesman_id) {
      toast.error("Please select a salesman");
      return;
    }
    
    if (!formData.joining_date) {
      toast.error("Please select a joining date");
      return;
    }
    
    if (!formData.monthly_salary && formData.monthly_salary !== "0" && formData.monthly_salary !== 0) {
      toast.error("Please enter a monthly salary");
      return;
    }
    
    setSubmitting(true);
    try {
      if (editingSetup) {
        await api.put(`/salary-setup/${editingSetup.id}`, {
          joining_date: format(formData.joining_date, "yyyy-MM-dd"),
          monthly_salary: parseFloat(formData.monthly_salary) || 0,
        });
        toast.success("Salary setup updated successfully");
      } else {
        await api.post(`/salary-setup`, {
          salesman_id: formData.salesman_id,
          joining_date: format(formData.joining_date, "yyyy-MM-dd"),
          monthly_salary: parseFloat(formData.monthly_salary) || 0,
          current_balance: parseFloat(formData.current_balance) || 0,
        });
        toast.success("Salary setup created successfully");
      }
      
      handleCloseDialog();
      fetchSetups();
    } catch (error) {
      console.error("Error saving salary setup:", error);
      toast.error(error.response?.data?.detail || "Failed to save salary setup");
    } finally {
      setSubmitting(false);
    }
  };

  // Update Balance functions
  const handleOpenUpdateBalance = (setup) => {
    setUpdatingSetup(setup);
    setUpdateAmount(setup.monthly_salary?.toString() || "");
    setUpdateRemarks("Monthly salary credit");
    setIsUpdateBalanceDialogOpen(true);
  };

  const handleUpdateBalance = async () => {
    if (!updateAmount || parseFloat(updateAmount) === 0) {
      toast.error("Please enter an amount");
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post(`/salary-setup/${updatingSetup.id}/update-balance`, {
        amount: parseFloat(updateAmount),
        remarks: updateRemarks || "Monthly salary credit"
      });
      
      toast.success("Balance updated successfully");
      setIsUpdateBalanceDialogOpen(false);
      setUpdatingSetup(null);
      fetchSetups();
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error(error.response?.data?.detail || "Failed to update balance");
    } finally {
      setSubmitting(false);
    }
  };

  // Activity/History functions
  const handleOpenActivityHistory = async (setup) => {
    setActivitySetup(setup);
    setIsActivityDialogOpen(true);
    setLoadingActivities(true);
    
    try {
      const response = await api.get(`/salary-setup/${setup.id}/activities`);
      setActivities(response.data.data?.activities || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("Failed to fetch activity history");
    } finally {
      setLoadingActivities(false);
    }
  };

  // Delete functions
  const handleDeleteClick = (setup) => {
    setDeleteSetup(setup);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteSetup) return;
    
    try {
      await api.delete(`/salary-setup/${deleteSetup.id}`);
      toast.success("Salary setup deleted successfully");
      fetchSetups();
    } catch (error) {
      console.error("Error deleting salary setup:", error);
      toast.error("Failed to delete salary setup");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteSetup(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="salary-setup-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Salary Setup</h1>
          <p className="text-muted-foreground">Manage salesman salary configurations</p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()} 
          className="bg-primary hover:bg-primary-600" 
          data-testid="add-salary-setup-btn"
          disabled={availableSalesmen.length === 0 && !editingSetup}
        >
          <Plus size={18} className="mr-1" /> Add Salary Setup
        </Button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <Banknote size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Monthly Salary</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(setups.reduce((sum, s) => sum + (s.monthly_salary || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Banknote size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Current Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(setups.reduce((sum, s) => sum + (s.current_balance || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">
                <Banknote size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salesmen with Salary Setup</p>
                <p className="text-2xl font-bold text-purple-600">{setups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote size={20} className="text-primary" />
            Salary Configurations ({setups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : setups.length === 0 ? (
            <div className="text-center py-12">
              <Banknote size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No salary setups found</p>
              <p className="text-sm text-muted-foreground">Click "Add Salary Setup" to configure salaries</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12 py-4">#</TableHead>
                    <TableHead className="py-4">Salesman</TableHead>
                    <TableHead className="py-4">Joining Date</TableHead>
                    <TableHead className="text-right py-4">Monthly Salary</TableHead>
                    <TableHead className="text-right py-4">Current Balance</TableHead>
                    <TableHead className="text-center py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setups.map((setup, index) => (
                    <TableRow 
                      key={setup.id} 
                      data-testid={`setup-row-${index}`}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50/70"}
                    >
                      <TableCell className="font-medium py-4">{index + 1}</TableCell>
                      <TableCell className="font-medium py-4">{setup.salesman_name}</TableCell>
                      <TableCell className="py-4">{formatDate(setup.joining_date)}</TableCell>
                      <TableCell className="text-right py-4 font-semibold text-green-600">
                        {formatCurrency(setup.monthly_salary)}
                      </TableCell>
                      <TableCell className="text-right py-4 font-semibold text-blue-600">
                        {formatCurrency(setup.current_balance)}
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenUpdateBalance(setup)}
                            data-testid={`update-balance-${index}`}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            <PlusCircle size={14} className="mr-1" />
                            Update Balance
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenActivityHistory(setup)}
                            data-testid={`view-history-${index}`}
                            className="hover:bg-purple-100 hover:text-purple-600"
                            title="View History"
                          >
                            <History size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(setup)}
                            data-testid={`edit-setup-${index}`}
                            className="hover:bg-blue-100 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(setup)}
                            data-testid={`delete-setup-${index}`}
                            className="hover:bg-red-100 hover:text-red-600"
                            title="Delete"
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
            <DialogTitle className="flex items-center gap-2">
              <Banknote size={20} className="text-primary" />
              {editingSetup ? "Edit Salary Setup" : "Add Salary Setup"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Salesman Selection (only for new) */}
              {!editingSetup && (
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
                      {availableSalesmen.map((salesman) => (
                        <SelectItem key={salesman.id} value={salesman.id}>
                          {salesman.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableSalesmen.length === 0 && (
                    <p className="text-xs text-orange-600">All salesmen already have salary setup</p>
                  )}
                </div>
              )}

              {/* Joining Date */}
              <div className="space-y-2">
                <Label>Joining Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.joining_date && "text-muted-foreground"
                      )}
                      data-testid="joining-date-btn"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.joining_date ? format(formData.joining_date, "dd MMM yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.joining_date}
                      onSelect={(date) => handleInputChange("joining_date", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Monthly Salary */}
              <div className="space-y-2">
                <Label htmlFor="monthly_salary">Monthly Salary (₹) *</Label>
                <Input
                  id="monthly_salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_salary}
                  onChange={(e) => handleInputChange("monthly_salary", e.target.value)}
                  placeholder="Enter monthly salary"
                  data-testid="monthly-salary-input"
                />
              </div>

              {/* Initial Balance (only for new) */}
              {!editingSetup && (
                <div className="space-y-2">
                  <Label htmlFor="current_balance">Current Salary Balance (₹)</Label>
                  <Input
                    id="current_balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.current_balance}
                    onChange={(e) => handleInputChange("current_balance", e.target.value)}
                    placeholder="0"
                    data-testid="current-balance-input"
                  />
                  <p className="text-xs text-muted-foreground">Initial balance if any pending salary</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-600">
                {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</> : editingSetup ? "Update Setup" : "Add Setup"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Balance Dialog */}
      <Dialog open={isUpdateBalanceDialogOpen} onOpenChange={setIsUpdateBalanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle size={20} className="text-green-500" />
              Update Salary Balance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {updatingSetup && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-medium text-blue-800">{updatingSetup.salesman_name}</p>
                <p className="text-sm text-blue-600">Current Balance: {formatCurrency(updatingSetup.current_balance)}</p>
                <p className="text-sm text-blue-600">Monthly Salary: {formatCurrency(updatingSetup.monthly_salary)}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="update_amount">Amount to Add (₹) *</Label>
              <Input
                id="update_amount"
                type="number"
                step="0.01"
                value={updateAmount}
                onChange={(e) => setUpdateAmount(e.target.value)}
                placeholder="Enter amount"
                data-testid="update-amount-input"
              />
              <p className="text-xs text-muted-foreground">Pre-filled with monthly salary. You can modify if needed.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="update_remarks">Remarks</Label>
              <Textarea
                id="update_remarks"
                value={updateRemarks}
                onChange={(e) => setUpdateRemarks(e.target.value)}
                placeholder="Enter remarks..."
                rows={2}
                data-testid="update-remarks-input"
              />
            </div>

            {/* Preview */}
            {updatingSetup && updateAmount && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">After Update:</p>
                <p className="text-lg font-bold text-green-600">
                  New Balance: {formatCurrency((updatingSetup.current_balance || 0) + (parseFloat(updateAmount) || 0))}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsUpdateBalanceDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBalance} disabled={submitting} className="bg-green-500 hover:bg-green-600">
              {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Updating...</> : "Update Balance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity History Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={20} className="text-purple-500" />
              Salary Activity History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activitySetup && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="font-medium text-purple-800">{activitySetup.salesman_name}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                  <div>
                    <p className="text-purple-600">Joining Date</p>
                    <p className="font-semibold">{formatDate(activitySetup.joining_date)}</p>
                  </div>
                  <div>
                    <p className="text-purple-600">Monthly Salary</p>
                    <p className="font-semibold">{formatCurrency(activitySetup.monthly_salary)}</p>
                  </div>
                  <div>
                    <p className="text-purple-600">Current Balance</p>
                    <p className="font-semibold text-blue-600">{formatCurrency(activitySetup.current_balance)}</p>
                  </div>
                </div>
              </div>
            )}
            
            {loadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <History size={40} className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No activity history found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "p-3 rounded-lg border",
                      activity.activity_type === "credit" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {activity.activity_type === "credit" ? (
                          <ArrowUpCircle size={20} className="text-green-600" />
                        ) : (
                          <ArrowDownCircle size={20} className="text-red-600" />
                        )}
                        <span className={cn(
                          "font-semibold",
                          activity.activity_type === "credit" ? "text-green-700" : "text-red-700"
                        )}>
                          {activity.activity_type === "credit" ? "+" : "-"}{formatCurrency(activity.amount)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(activity.activity_date)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{activity.remarks}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Before: {formatCurrency(activity.balance_before)}</span>
                      <span>After: {formatCurrency(activity.balance_after)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivityDialogOpen(false)}>
              <X size={16} className="mr-1" /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary Setup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the salary setup for <strong>{deleteSetup?.salesman_name}</strong>? 
              This will also delete all activity history. This action cannot be undone.
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

export default SalarySetupPage;
