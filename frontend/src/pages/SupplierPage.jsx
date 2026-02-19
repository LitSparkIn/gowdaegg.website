import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Truck, Loader2, Search, FileSpreadsheet, FileText, Printer, RotateCcw } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SupplierPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [inactiveSuppliers, setInactiveSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    previous_dues: 0,
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/suppliers`);
      setSuppliers(response.data.suppliers || []);
      setInactiveSuppliers(response.data.inactive_suppliers || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter suppliers based on search query
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(supplier => 
      supplier.name?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  const resetForm = () => {
    setFormData({ name: "", previous_dues: 0 });
  };

  const handleOpenDialog = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        previous_dues: supplier.previous_dues,
      });
    } else {
      setEditingSupplier(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    resetForm();
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Supplier name is required");
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
        name: formData.name.trim(),
        previous_dues: parseFloat(formData.previous_dues) || 0,
      };

      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, payload);
        toast.success("Supplier updated successfully");
      } else {
        await api.post(`/suppliers`, payload);
        toast.success("Supplier created successfully");
      }
      handleCloseDialog();
      fetchSuppliers();
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error(error.response?.data?.detail || "Failed to save supplier");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (supplier) => {
    setDeleteSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteSupplier) return;

    try {
      await api.delete(`/suppliers/${deleteSupplier.id}`);
      toast.success("Supplier deleted successfully");
      fetchSuppliers();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error(error.response?.data?.detail || "Failed to delete supplier");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteSupplier(null);
    }
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
    if (filteredSuppliers.length === 0) { toast.error("No data to export"); return; }
    const data = filteredSuppliers.map((s, i) => ({ "#": i+1, "Name": s.name, "Previous Dues": s.previous_dues, "Created": formatDate(s.created_at) }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
    XLSX.writeFile(wb, `Suppliers_${format(new Date(), "dd-MMM-yyyy")}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const exportToPDF = () => {
    if (filteredSuppliers.length === 0) { toast.error("No data to export"); return; }
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(34, 84, 61);
    doc.text("Gowda Egg Distributors - Suppliers", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy")} | Total: ${filteredSuppliers.length}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Name", "Previous Dues", "Created"]],
      body: filteredSuppliers.map((s, i) => [i+1, s.name, `₹${s.previous_dues.toLocaleString()}`, formatDate(s.created_at)]),
      theme: "grid", headStyles: { fillColor: [34, 84, 61] }
    });
    doc.save(`Suppliers_${format(new Date(), "dd-MMM-yyyy")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePrint = () => {
    if (filteredSuppliers.length === 0) { toast.error("No data to print"); return; }
    const html = `<html><head><title>Suppliers</title><style>body{font-family:Arial;padding:20px}h1{color:#22543d}table{width:100%;border-collapse:collapse}th{background:#22543d;color:#fff;padding:8px}td{padding:6px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}.text-right{text-align:right}</style></head><body><h1>Suppliers List</h1><p>Generated: ${format(new Date(), "dd MMM yyyy")} | Total: ${filteredSuppliers.length}</p><table><tr><th>#</th><th>Name</th><th class="text-right">Previous Dues</th><th>Created</th></tr>${filteredSuppliers.map((s,i)=>`<tr><td>${i+1}</td><td>${s.name}</td><td class="text-right">₹${s.previous_dues.toLocaleString()}</td><td>${formatDate(s.created_at)}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div className="space-y-6" data-testid="supplier-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Supplier Management</h1>
          <p className="text-muted-foreground">Manage your egg suppliers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading || filteredSuppliers.length === 0}>
            <FileSpreadsheet size={16} className="mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loading || filteredSuppliers.length === 0}>
            <FileText size={16} className="mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || filteredSuppliers.length === 0}>
            <Printer size={16} className="mr-1" /> Print
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            data-testid="add-supplier-btn"
            className="rounded-full bg-primary hover:bg-primary-600"
          >
            <Plus size={20} className="mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="supplier-search-input"
        />
      </div>

      {/* Suppliers Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck size={20} className="text-primary" />
            Suppliers ({filteredSuppliers.length}{searchQuery && ` of ${suppliers.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No suppliers found</p>
              <p className="text-sm text-muted-foreground">Click "Add Supplier" to create your first supplier</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No suppliers match your search</p>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Previous Dues</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier, index) => (
                  <TableRow key={supplier.id} data-testid={`supplier-row-${index}`}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="text-right">
                      <span className={supplier.previous_dues > 0 ? "text-red-600 font-medium" : ""}>
                        {formatCurrency(supplier.previous_dues)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(supplier.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(supplier)}
                          data-testid={`edit-supplier-${index}`}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(supplier)}
                          data-testid={`delete-supplier-${index}`}
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
          )}
        </CardContent>
      </Card>

      {/* Inactive Suppliers Section */}
      {inactiveSuppliers.length > 0 && (
        <Card className="border-border/50 mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                <Truck size={20} />
                Inactive Suppliers ({inactiveSuppliers.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInactive(!showInactive)}
              >
                {showInactive ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>
          {showInactive && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Previous Dues</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveSuppliers.map((supplier, index) => (
                    <TableRow key={supplier.id} className="opacity-60">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(supplier.previous_dues)}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Inactive
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter supplier name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  data-testid="supplier-name-input"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="previous_dues">Previous Dues (₹)</Label>
                <Input
                  id="previous_dues"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.previous_dues}
                  onChange={(e) => handleInputChange("previous_dues", e.target.value)}
                  data-testid="supplier-dues-input"
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
                data-testid="save-supplier-btn"
                className="bg-primary hover:bg-primary-600"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingSupplier ? (
                  "Update Supplier"
                ) : (
                  "Add Supplier"
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
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSupplier?.name}"? This action cannot be undone.
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

export default SupplierPage;
