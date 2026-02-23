import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, Loader2, Phone, Mail, RotateCcw, Package } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SalesmanPage = () => {
  const { isReadOnly } = useUserRole();
  const [salesmen, setSalesmen] = useState([]);
  const [inactiveSalesmen, setInactiveSalesmen] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState(null);
  const [deleteSalesman, setDeleteSalesman] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  
  const [formData, setFormData] = useState({
    route_id: "",
    name: "",
    phone: "",
    email: "",
    pin: "",
    confirm_pin: "",
  });

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
      const response = await api.get(`/routes`);
      setRoutes(response.data.routes || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
    }
  };

  const fetchSalesmen = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/salesmen`);
      setSalesmen(response.data.salesmen || []);
      setInactiveSalesmen(response.data.inactive_salesmen || []);
    } catch (error) {
      console.error("Error fetching salesmen:", error);
      toast.error("Failed to fetch salesmen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchSalesmen();
  }, []);

  const resetForm = () => {
    setFormData({
      route_id: "",
      name: "",
      phone: "",
      email: "",
      pin: "",
      confirm_pin: "",
    });
  };

  const handleOpenDialog = (salesman = null) => {
    if (salesman) {
      setEditingSalesman(salesman);
      setFormData({
        route_id: salesman.route_id,
        name: salesman.name,
        phone: salesman.phone,
        email: salesman.email,
        pin: "",
        confirm_pin: "",
      });
    } else {
      setEditingSalesman(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSalesman(null);
    resetForm();
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.route_id) {
      toast.error("Please select a route");
      return false;
    }
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return false;
    }
    if (!formData.phone || !/^\d{10}$/.test(formData.phone.replace(/[\s\-]/g, ''))) {
      toast.error("Phone number must be exactly 10 digits");
      return false;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    
    // PIN validation only for new salesman or if PIN is being changed
    if (!editingSalesman || formData.pin) {
      if (!formData.pin || !/^\d{4}$/.test(formData.pin)) {
        toast.error("PIN must be exactly 4 digits");
        return false;
      }
      if (formData.pin !== formData.confirm_pin) {
        toast.error("PIN and Confirm PIN must match");
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        route_id: formData.route_id,
        name: formData.name.trim(),
        phone: formData.phone.replace(/[\s\-]/g, ''),
        email: formData.email.trim(),
      };

      // Only include PIN if provided
      if (formData.pin) {
        payload.pin = formData.pin;
        payload.confirm_pin = formData.confirm_pin;
      }

      if (editingSalesman) {
        await api.put(`/salesmen/${editingSalesman.id}`, payload);
        toast.success("Salesman updated successfully");
      } else {
        await api.post(`/salesmen`, payload);
        toast.success("Salesman created successfully");
      }
      handleCloseDialog();
      fetchSalesmen();
    } catch (error) {
      console.error("Error saving salesman:", error);
      toast.error(error.response?.data?.detail || "Failed to save salesman");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (salesman) => {
    setDeleteSalesman(salesman);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteSalesman) return;

    try {
      await api.delete(`/salesmen/${deleteSalesman.id}`);
      toast.success("Salesman deleted successfully");
      fetchSalesmen();
    } catch (error) {
      console.error("Error deleting salesman:", error);
      toast.error(error.response?.data?.detail || "Failed to delete salesman");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteSalesman(null);
    }
  };

  const handleActivate = async (salesman) => {
    try {
      await api.post(`/salesmen/${salesman.id}/activate`);
      toast.success("Salesman activated successfully");
      fetchSalesmen();
    } catch (error) {
      console.error("Error activating salesman:", error);
      toast.error(error.response?.data?.detail || "Failed to activate salesman");
    }
  };

  return (
    <div className="space-y-6" data-testid="salesman-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Salesman Management</h1>
          <p className="text-muted-foreground">Manage your sales team</p>
        </div>
        {!isReadOnly && (
          <Button
            onClick={() => handleOpenDialog()}
            data-testid="add-salesman-btn"
            className="rounded-full bg-primary hover:bg-primary-600"
          >
            <Plus size={20} className="mr-2" />
            Add Salesman
          </Button>
        )}
      </div>

      {/* Salesmen Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Salesmen ({salesmen.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : salesmen.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No salesmen found</p>
              <p className="text-sm text-muted-foreground">Click "Add Salesman" to create your first salesman</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead className="text-right">Tray Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesmen.map((salesman, index) => (
                    <TableRow key={salesman.id} data-testid={`salesman-row-${index}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{salesman.name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Phone size={14} className="text-muted-foreground" />
                          {salesman.phone}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Mail size={14} className="text-muted-foreground" />
                          {salesman.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {salesman.route?.route_name || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isReadOnly && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(salesman)}
                              data-testid={`edit-salesman-${index}`}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(salesman)}
                              data-testid={`delete-salesman-${index}`}
                              className="hover:bg-red-100 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Salesmen Section */}
      {inactiveSalesmen.length > 0 && (
        <Card className="border-border/50 mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                <Users size={20} />
                Inactive Salesmen ({inactiveSalesmen.length})
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveSalesmen.map((salesman, index) => (
                      <TableRow key={salesman.id} className="opacity-70 hover:opacity-100">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{salesman.name}</TableCell>
                        <TableCell>{salesman.phone}</TableCell>
                        <TableCell>{salesman.route?.route_name || "N/A"}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            Inactive
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {!isReadOnly && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivate(salesman)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <RotateCcw size={14} className="mr-1" />
                              Activate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSalesman ? "Edit Salesman" : "Add New Salesman"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="route">Route *</Label>
                <Select
                  value={formData.route_id}
                  onValueChange={(value) => handleInputChange("route_id", value)}
                >
                  <SelectTrigger data-testid="salesman-route-select">
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.route_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter salesman name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  data-testid="salesman-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number * (10 digits)</Label>
                <Input
                  id="phone"
                  placeholder="Enter 10-digit phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  data-testid="salesman-phone-input"
                  maxLength={10}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  data-testid="salesman-email-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">
                    PIN * (4 digits)
                    {editingSalesman && <span className="text-xs text-muted-foreground ml-1">(leave empty to keep current)</span>}
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder="****"
                    value={formData.pin}
                    onChange={(e) => handleInputChange("pin", e.target.value)}
                    data-testid="salesman-pin-input"
                    maxLength={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm_pin">Confirm PIN *</Label>
                  <Input
                    id="confirm_pin"
                    type="password"
                    placeholder="****"
                    value={formData.confirm_pin}
                    onChange={(e) => handleInputChange("confirm_pin", e.target.value)}
                    data-testid="salesman-confirm-pin-input"
                    maxLength={4}
                  />
                </div>
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
                data-testid="save-salesman-btn"
                className="bg-primary hover:bg-primary-600"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingSalesman ? (
                  "Update Salesman"
                ) : (
                  "Add Salesman"
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
            <AlertDialogTitle>Delete Salesman</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSalesman?.name}"? This action cannot be undone.
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

export default SalesmanPage;
