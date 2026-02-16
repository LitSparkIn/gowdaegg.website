import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
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
import { Plus, Pencil, Trash2, Store, Loader2, Phone, MapPin } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ShopPage = () => {
  const [shops, setShops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [deleteShop, setDeleteShop] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    previous_dues: 0,
    credit_threshold: 0,
    route_id: "",
    tray_balance: 0,
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
      const response = await axios.get(`${API}/routes`, getAuthHeaders());
      setRoutes(response.data.routes || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
    }
  };

  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/shops`, getAuthHeaders());
      setShops(response.data.shops || []);
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast.error("Failed to fetch shops");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchShops();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      address: "",
      previous_dues: 0,
      credit_threshold: 0,
      route_id: "",
      tray_balance: 0,
    });
  };

  const handleOpenDialog = (shop = null) => {
    if (shop) {
      setEditingShop(shop);
      setFormData({
        name: shop.name,
        phone: shop.phone,
        address: shop.address,
        previous_dues: shop.previous_dues,
        credit_threshold: shop.credit_threshold || 0,
        route_id: shop.route_id,
        tray_balance: shop.tray_balance,
      });
    } else {
      setEditingShop(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingShop(null);
    resetForm();
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Shop name is required");
      return false;
    }
    if (!formData.phone || !/^\d{10}$/.test(formData.phone.replace(/[\s\-]/g, ''))) {
      toast.error("Phone number must be exactly 10 digits");
      return false;
    }
    if (!formData.address.trim()) {
      toast.error("Address is required");
      return false;
    }
    if (!formData.route_id) {
      toast.error("Please select a route");
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
        ...formData,
        phone: formData.phone.replace(/[\s\-]/g, ''),
        previous_dues: parseFloat(formData.previous_dues) || 0,
        tray_balance: parseInt(formData.tray_balance) || 0,
      };

      if (editingShop) {
        await axios.put(
          `${API}/shops/${editingShop.id}`,
          payload,
          getAuthHeaders()
        );
        toast.success("Shop updated successfully");
      } else {
        await axios.post(`${API}/shops`, payload, getAuthHeaders());
        toast.success("Shop created successfully");
      }
      handleCloseDialog();
      fetchShops();
    } catch (error) {
      console.error("Error saving shop:", error);
      toast.error(error.response?.data?.detail || "Failed to save shop");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (shop) => {
    setDeleteShop(shop);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteShop) return;

    try {
      await axios.delete(`${API}/shops/${deleteShop.id}`, getAuthHeaders());
      toast.success("Shop deleted successfully");
      fetchShops();
    } catch (error) {
      console.error("Error deleting shop:", error);
      toast.error(error.response?.data?.detail || "Failed to delete shop");
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteShop(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <div className="space-y-6" data-testid="shop-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Shop Management</h1>
          <p className="text-muted-foreground">Manage your shops and their details</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          data-testid="add-shop-btn"
          className="rounded-full bg-primary hover:bg-primary-600"
        >
          <Plus size={20} className="mr-2" />
          Add Shop
        </Button>
      </div>

      {/* Shops Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store size={20} className="text-primary" />
            Shops ({shops.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : shops.length === 0 ? (
            <div className="text-center py-12">
              <Store size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No shops found</p>
              <p className="text-sm text-muted-foreground">Click "Add Shop" to create your first shop</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead className="text-right">Credit Threshold</TableHead>
                    <TableHead className="text-right">Previous Dues</TableHead>
                    <TableHead className="text-right">Tray Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shops.map((shop, index) => {
                    const isAboveThreshold = shop.credit_threshold > 0 && shop.previous_dues > shop.credit_threshold;
                    return (
                    <TableRow key={shop.id} data-testid={`shop-row-${index}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{shop.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin size={12} />
                            {shop.address.length > 30 ? shop.address.substring(0, 30) + "..." : shop.address}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Phone size={14} className="text-muted-foreground" />
                          {shop.phone}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {shop.route?.route_name || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(shop.credit_threshold || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={
                          isAboveThreshold 
                            ? "text-red-600 font-semibold px-2 py-1 border-2 border-red-500 rounded bg-red-50" 
                            : shop.previous_dues > 0 ? "text-red-600 font-medium" : ""
                        }>
                          {formatCurrency(shop.previous_dues)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{shop.tray_balance}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(shop)}
                            data-testid={`edit-shop-${index}`}
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(shop)}
                            data-testid={`delete-shop-${index}`}
                            className="hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
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
            <DialogTitle>
              {editingShop ? "Edit Shop" : "Add New Shop"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Shop Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter shop name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  data-testid="shop-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number * (10 digits)</Label>
                <Input
                  id="phone"
                  placeholder="Enter 10-digit phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  data-testid="shop-phone-input"
                  maxLength={10}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  placeholder="Enter shop address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  data-testid="shop-address-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="route">Route *</Label>
                <Select
                  value={formData.route_id}
                  onValueChange={(value) => handleInputChange("route_id", value)}
                >
                  <SelectTrigger data-testid="shop-route-select">
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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="previous_dues">Previous Dues (₹)</Label>
                  <Input
                    id="previous_dues"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.previous_dues}
                    onChange={(e) => handleInputChange("previous_dues", e.target.value)}
                    data-testid="shop-dues-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="credit_threshold">Credit Threshold (₹)</Label>
                  <Input
                    id="credit_threshold"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.credit_threshold}
                    onChange={(e) => handleInputChange("credit_threshold", e.target.value)}
                    data-testid="shop-threshold-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tray_balance">Tray Balance</Label>
                <Input
                  id="tray_balance"
                  type="number"
                  placeholder="0"
                  value={formData.tray_balance}
                  onChange={(e) => handleInputChange("tray_balance", e.target.value)}
                  data-testid="shop-tray-input"
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
                data-testid="save-shop-btn"
                className="bg-primary hover:bg-primary-600"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingShop ? (
                  "Update Shop"
                ) : (
                  "Add Shop"
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
            <AlertDialogTitle>Delete Shop</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteShop?.name}"? This action cannot be undone.
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

export default ShopPage;
