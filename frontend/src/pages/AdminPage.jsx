import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserCog,
  Plus,
  Loader2,
  Pencil,
  UserX,
  UserCheck,
  Key,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AdminPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    new_password: "",
    confirm_password: "",
  });
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewConfirmPassword, setShowNewConfirmPassword] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin-users");
      setAdmins(response.data.data?.admins || []);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Filter admins based on search
  const filteredAdmins = admins.filter((admin) => {
    const query = searchQuery.toLowerCase();
    return (
      admin.name?.toLowerCase().includes(query) ||
      admin.email?.toLowerCase().includes(query) ||
      admin.phone?.includes(query)
    );
  });

  // Separate active and inactive admins
  const activeAdmins = filteredAdmins.filter((a) => a.is_active);
  const inactiveAdmins = filteredAdmins.filter((a) => !a.is_active);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    if (!addForm.name || !addForm.email || !addForm.phone || !addForm.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (addForm.password !== addForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (addForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post("/admin-users", addForm);
      toast.success("Admin created successfully");
      setIsAddDialogOpen(false);
      setAddForm({ name: "", email: "", phone: "", password: "", confirm_password: "" });
      fetchAdmins();
    } catch (error) {
      console.error("Error creating admin:", error);
      toast.error(error.response?.data?.detail || "Failed to create admin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!editForm.name || !editForm.email || !editForm.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setSubmitting(true);
    try {
      await api.put(`/admin-users/${selectedAdmin.id}`, editForm);
      toast.success("Admin updated successfully");
      setIsEditDialogOpen(false);
      setSelectedAdmin(null);
      fetchAdmins();
    } catch (error) {
      console.error("Error updating admin:", error);
      toast.error(error.response?.data?.detail || "Failed to update admin");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordClick = (admin) => {
    setSelectedAdmin(admin);
    setPasswordForm({ new_password: "", confirm_password: "" });
    setIsPasswordDialogOpen(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post(`/admin-users/${selectedAdmin.id}/change-password`, passwordForm);
      toast.success("Password changed successfully");
      setIsPasswordDialogOpen(false);
      setSelectedAdmin(null);
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (admin) => {
    const action = admin.is_active ? "deactivate" : "activate";
    try {
      await api.post(`/admin-users/${admin.id}/${action}`);
      toast.success(`Admin ${action}d successfully`);
      fetchAdmins();
    } catch (error) {
      console.error(`Error ${action}ing admin:`, error);
      toast.error(error.response?.data?.detail || `Failed to ${action} admin`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const AdminCard = ({ admin, showActions = true }) => (
    <div
      className={cn(
        "p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-4",
        admin.is_active ? "bg-white" : "bg-gray-100 border-gray-300"
      )}
      data-testid={`admin-card-${admin.id}`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
          admin.is_active ? "bg-primary" : "bg-gray-400"
        )}>
          {admin.name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-primary-950 truncate">{admin.name}</p>
          <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
          <p className="text-sm text-muted-foreground">{admin.phone}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Created: {formatDate(admin.created_at)}</span>
      </div>
      
      {showActions && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditClick(admin)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            data-testid={`edit-admin-${admin.id}`}
          >
            <Pencil size={14} className="mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePasswordClick(admin)}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            data-testid={`password-admin-${admin.id}`}
          >
            <Key size={14} className="mr-1" />
            Password
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleActive(admin)}
            className={admin.is_active 
              ? "text-red-600 hover:text-red-700 hover:bg-red-50" 
              : "text-green-600 hover:text-green-700 hover:bg-green-50"
            }
            data-testid={`toggle-admin-${admin.id}`}
          >
            {admin.is_active ? (
              <><UserX size={14} className="mr-1" />Deactivate</>
            ) : (
              <><UserCheck size={14} className="mr-1" />Activate</>
            )}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="admin-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Admin Management</h1>
          <p className="text-muted-foreground">Manage admin users and their access</p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-primary hover:bg-primary-600"
          data-testid="add-admin-btn"
        >
          <Plus size={18} className="mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search by name, email, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="admin-search-input"
        />
      </div>

      {/* Active Admins */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog size={20} className="text-primary" />
            Active Admins ({activeAdmins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : activeAdmins.length === 0 ? (
            <div className="text-center py-12">
              <UserCog size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No active admins found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAdmins.map((admin) => (
                <AdminCard key={admin.id} admin={admin} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Admins */}
      {inactiveAdmins.length > 0 && (
        <Card className="border-border/50 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
              <UserX size={20} />
              Inactive Admins ({inactiveAdmins.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveAdmins.map((admin) => (
                <AdminCard key={admin.id} admin={admin} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Admin Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name *</Label>
                <Input
                  id="add-name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Enter admin name"
                  data-testid="add-admin-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email *</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="Enter email address"
                  data-testid="add-admin-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone *</Label>
                <Input
                  id="add-phone"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                  data-testid="add-admin-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password">Password *</Label>
                <div className="relative">
                  <Input
                    id="add-password"
                    type={showPassword ? "text" : "password"}
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="Enter password (min 6 characters)"
                    data-testid="add-admin-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-confirm-password">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="add-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={addForm.confirm_password}
                    onChange={(e) => setAddForm({ ...addForm, confirm_password: e.target.value })}
                    placeholder="Confirm password"
                    data-testid="add-admin-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-600">
                {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Creating...</> : "Create Admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  data-testid="edit-admin-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  data-testid="edit-admin-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  data-testid="edit-admin-phone"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-600">
                {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password - {selectedAdmin?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password *</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    placeholder="Enter new password (min 6 characters)"
                    data-testid="new-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password *</Label>
                <div className="relative">
                  <Input
                    id="confirm-new-password"
                    type={showNewConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    placeholder="Confirm new password"
                    data-testid="confirm-new-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewConfirmPassword(!showNewConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-600">
                {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Changing...</> : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
