import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Pencil, Trash2, Route as RouteIcon, Loader2, Search, FileSpreadsheet, FileText, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

const RoutePage = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [deleteRoute, setDeleteRoute] = useState(null);
  const [routeName, setRouteName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/routes`);
      setRoutes(response.data.routes || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
      toast.error("Failed to fetch routes");
    } finally {
      setLoading(false);
    }
  };

  // Filter routes based on search query
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return routes;
    const query = searchQuery.toLowerCase();
    return routes.filter(route => 
      route.route_name?.toLowerCase().includes(query)
    );
  }, [routes, searchQuery]);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleOpenDialog = (route = null) => {
    if (route) {
      setEditingRoute(route);
      setRouteName(route.route_name);
    } else {
      setEditingRoute(null);
      setRouteName("");
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRoute(null);
    setRouteName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!routeName.trim()) {
      toast.error("Route name is required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingRoute) {
        await api.put(`/routes/${editingRoute.id}`, { route_name: routeName.trim() });
        toast.success("Route updated successfully");
      } else {
        await api.post(`/routes`, { route_name: routeName.trim() });
        toast.success("Route created successfully");
      }
      handleCloseDialog();
      fetchRoutes();
    } catch (error) {
      console.error("Error saving route:", error);
      toast.error(error.response?.data?.detail || "Failed to save route");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (route) => {
    setDeleteRoute(route);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteRoute) return;

    try {
      await api.delete(`/routes/${deleteRoute.id}`);
      toast.success("Route deleted successfully");
      fetchRoutes();
    } catch (error) {
      console.error("Error deleting route:", error);
      toast.error(error.response?.data?.detail || "Failed to delete route");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteRoute(null);
    }
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
    if (filteredRoutes.length === 0) { toast.error("No data to export"); return; }
    const data = filteredRoutes.map((r, i) => ({ "#": i+1, "Route Name": r.route_name, "Created": formatDate(r.created_at), "Updated": formatDate(r.updated_at) }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Routes");
    XLSX.writeFile(wb, `Routes_${format(new Date(), "dd-MMM-yyyy")}.xlsx`);
    toast.success("Excel downloaded!");
  };

  const exportToPDF = () => {
    if (filteredRoutes.length === 0) { toast.error("No data to export"); return; }
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setTextColor(34, 84, 61);
    doc.text("Gowda Egg Distributors - Routes", 14, 15);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), "dd MMM yyyy")} | Total: ${filteredRoutes.length}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Route Name", "Created", "Updated"]],
      body: filteredRoutes.map((r, i) => [i+1, r.route_name, formatDate(r.created_at), formatDate(r.updated_at)]),
      theme: "grid", headStyles: { fillColor: [34, 84, 61] }
    });
    doc.save(`Routes_${format(new Date(), "dd-MMM-yyyy")}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handlePrint = () => {
    if (filteredRoutes.length === 0) { toast.error("No data to print"); return; }
    const html = `<html><head><title>Routes</title><style>body{font-family:Arial;padding:20px}h1{color:#22543d}table{width:100%;border-collapse:collapse}th{background:#22543d;color:#fff;padding:8px}td{padding:6px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}</style></head><body><h1>Routes List</h1><p>Generated: ${format(new Date(), "dd MMM yyyy")} | Total: ${filteredRoutes.length}</p><table><tr><th>#</th><th>Route Name</th><th>Created</th><th>Updated</th></tr>${filteredRoutes.map((r,i)=>`<tr><td>${i+1}</td><td>${r.route_name}</td><td>${formatDate(r.created_at)}</td><td>${formatDate(r.updated_at)}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
  };

  return (
    <div className="space-y-6" data-testid="route-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Route Management</h1>
          <p className="text-muted-foreground">Manage your delivery routes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading || filteredRoutes.length === 0}>
            <FileSpreadsheet size={16} className="mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={loading || filteredRoutes.length === 0}>
            <FileText size={16} className="mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || filteredRoutes.length === 0}>
            <Printer size={16} className="mr-1" /> Print
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            data-testid="add-route-btn"
            className="rounded-full bg-primary hover:bg-primary-600"
          >
            <Plus size={20} className="mr-2" />
            Add Route
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search routes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Routes Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RouteIcon size={20} className="text-primary" />
            Routes ({filteredRoutes.length}{searchQuery && ` of ${routes.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="text-center py-12">
              <RouteIcon size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{searchQuery ? "No routes match your search" : "No routes found"}</p>
              <p className="text-sm text-muted-foreground">{searchQuery ? "Try a different search term" : 'Click "Add Route" to create your first route'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Route Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map((route, index) => (
                  <TableRow key={route.id} data-testid={`route-row-${index}`}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell 
                      className="font-medium text-primary cursor-pointer hover:underline"
                      onClick={() => navigate(`/admin/shop?route=${route.id}`)}
                    >
                      {route.route_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(route.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(route.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(route)}
                          data-testid={`edit-route-${index}`}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(route)}
                          data-testid={`delete-route-${index}`}
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? "Edit Route" : "Add New Route"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="routeName">Route Name</Label>
                <Input
                  id="routeName"
                  placeholder="Enter route name"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  data-testid="route-name-input"
                  autoFocus
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
                data-testid="save-route-btn"
                className="bg-primary hover:bg-primary-600"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingRoute ? (
                  "Update Route"
                ) : (
                  "Add Route"
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
            <AlertDialogTitle>Delete Route</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRoute?.route_name}"? This action cannot be undone.
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

export default RoutePage;
