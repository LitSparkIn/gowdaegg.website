import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Loader2, Settings, MessageCircle, MessageSquare, Save, Eye, EyeOff, FileText, 
  Download, Trash2, AlertTriangle, ShieldAlert, Truck, Store, Users, ShoppingCart, 
  Package, Receipt, CalendarDays, CreditCard
} from "lucide-react";

const ConfigSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    whatsapp_enabled: false,
    sms_enabled: false,
    whatsapp_api_token: "",
    whatsapp_phone_number_id: "109780805521902",
    whatsapp_template_id: "gowda_egg_sale_receipt",
    whatsapp_header_image_url: "",
    msg91_auth_key: "",
    msg91_template_id: "",
    whatsapp_api_token_set: false,
    msg91_auth_key_set: false,
    allow_multiple_reports: false,
  });
  
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [showMsg91Key, setShowMsg91Key] = useState(false);
  
  // Critical Section Toggle - always OFF on page load
  const [showCriticalSection, setShowCriticalSection] = useState(false);
  
  // Export/Clear Data state
  const [exporting, setExporting] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [collectionCounts, setCollectionCounts] = useState({});
  const [showClearTodayDialog, setShowClearTodayDialog] = useState(false);
  const [clearingToday, setClearingToday] = useState(false);

  const CLEAR_OPTIONS = [
    { key: "routes", label: "Routes", icon: Truck, color: "text-blue-600" },
    { key: "shops", label: "Shops", icon: Store, color: "text-purple-600" },
    { key: "admins", label: "Admins", icon: Users, color: "text-red-600" },
    { key: "salesmen", label: "Salesmen", icon: Users, color: "text-green-600" },
    { key: "suppliers", label: "Suppliers", icon: ShoppingCart, color: "text-orange-600" },
    { key: "purchases", label: "Purchases", icon: Package, color: "text-cyan-600" },
    { key: "expenses", label: "Expenses", icon: Receipt, color: "text-pink-600" },
    { key: "daily_summaries", label: "Daily Summary", icon: CalendarDays, color: "text-indigo-600" },
    { key: "sales", label: "Transactions", icon: CreditCard, color: "text-emerald-600" },
    { key: "initial_loads", label: "Initial Loads", icon: Package, color: "text-amber-600" },
    { key: "sale_reports", label: "Daily Submitted Reports", icon: FileText, color: "text-slate-600" },
  ];

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/settings`);
      const data = response.data.data;
      setSettings({
        whatsapp_enabled: data.whatsapp_enabled || false,
        sms_enabled: data.sms_enabled || false,
        whatsapp_api_token: "", // Don't show actual token
        whatsapp_phone_number_id: data.whatsapp_phone_number_id || "109780805521902",
        whatsapp_template_id: data.whatsapp_template_id || "gowda_egg_sale_receipt",
        whatsapp_header_image_url: data.whatsapp_header_image_url || "",
        msg91_auth_key: "", // Don't show actual key
        msg91_template_id: data.msg91_template_id || "",
        whatsapp_api_token_set: data.whatsapp_api_token_set || false,
        msg91_auth_key_set: data.msg91_auth_key_set || false,
        allow_multiple_reports: data.allow_multiple_reports || false,
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleChange = async (field, value) => {
    try {
      // Update local state immediately for responsive UI
      setSettings(prev => ({ ...prev, [field]: value }));
      
      // Save to backend
      await api.put(`/settings`, { [field]: value });
      
      // Show appropriate message
      if (field === 'whatsapp_enabled') {
        toast.success(`WhatsApp ${value ? 'enabled' : 'disabled'}`);
      } else if (field === 'sms_enabled') {
        toast.success(`SMS ${value ? 'enabled' : 'disabled'}`);
      } else if (field === 'allow_multiple_reports') {
        toast.success(`Multiple reports ${value ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      // Revert on error
      setSettings(prev => ({ ...prev, [field]: !value }));
      toast.error("Failed to update setting");
    }
  };

  const handleSaveCredentials = async () => {
    try {
      setSaving(true);
      
      // Only send non-empty values
      const updateData = {};
      
      if (settings.whatsapp_api_token) {
        updateData.whatsapp_api_token = settings.whatsapp_api_token;
      }
      if (settings.whatsapp_phone_number_id) {
        updateData.whatsapp_phone_number_id = settings.whatsapp_phone_number_id;
      }
      if (settings.whatsapp_template_id) {
        updateData.whatsapp_template_id = settings.whatsapp_template_id;
      }
      if (settings.whatsapp_header_image_url !== undefined) {
        updateData.whatsapp_header_image_url = settings.whatsapp_header_image_url;
      }
      if (settings.msg91_auth_key) {
        updateData.msg91_auth_key = settings.msg91_auth_key;
      }
      if (settings.msg91_template_id) {
        updateData.msg91_template_id = settings.msg91_template_id;
      }
      
      if (Object.keys(updateData).length === 0) {
        toast.info("No changes to save");
        return;
      }
      
      await api.put(`/settings`, updateData);
      toast.success("Credentials saved successfully");
      
      // Refresh settings to update "configured" status
      fetchSettings();
      
      // Clear password fields after successful save
      setSettings(prev => ({
        ...prev,
        whatsapp_api_token: "",
        msg91_auth_key: ""
      }));
    } catch (error) {
      console.error("Error saving credentials:", error);
      toast.error(error.response?.data?.detail || "Failed to save credentials");
    } finally {
      setSaving(false);
    }
  };

  // Export/Clear handlers
  const handleExportData = async () => {
    try {
      setExporting(true);
      const response = await api.get("/admin/export-data");
      const exportData = response.data.data;
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GowdaEgg_Backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error(error.response?.data?.detail || "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const fetchCollectionCounts = async () => {
    try {
      const response = await api.get("/admin/collection-counts");
      setCollectionCounts(response.data.data || {});
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const handleOpenClearDialog = () => {
    setSelectedCollections([]);
    fetchCollectionCounts();
    setShowClearDialog(true);
  };

  const toggleCollection = (key) => {
    setSelectedCollections(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleClearData = async () => {
    if (selectedCollections.length === 0) {
      toast.error("Please select at least one item to clear");
      return;
    }
    
    try {
      setClearing(true);
      const response = await api.post("/admin/clear-data", {
        collections: selectedCollections
      });
      
      const result = response.data.data;
      const totalDeleted = result.cleared.reduce((sum, c) => sum + c.deleted_count, 0);
      
      toast.success(`Cleared ${totalDeleted} records from ${result.cleared.length} collections`);
      setShowClearDialog(false);
      setSelectedCollections([]);
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error(error.response?.data?.detail || "Failed to clear data");
    } finally {
      setClearing(false);
    }
  };

  const handleClearTodaysData = async () => {
    try {
      setClearingToday(true);
      const response = await api.post("/admin/clear-todays-data");
      const result = response.data.data;
      
      const clearedItems = result.cleared.filter(item => item.deleted_count > 0);
      if (clearedItems.length > 0) {
        const details = clearedItems.map(item => `${item.collection}: ${item.deleted_count}`).join(", ");
        toast.success(`Cleared ${result.total_deleted} records for ${result.date}`, {
          description: details
        });
      } else {
        toast.info(`No records found for today (${result.date})`);
      }
      
      setShowClearTodayDialog(false);
    } catch (error) {
      console.error("Error clearing today's data:", error);
      toast.error(error.response?.data?.detail || "Failed to clear today's data");
    } finally {
      setClearingToday(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="config-settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-primary-950">Configuration Settings</h1>
        <p className="text-muted-foreground">Manage your application settings and integrations</p>
      </div>

      {/* Notification Toggles */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Enable or disable notification channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* WhatsApp Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50/50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <MessageCircle size={24} className="text-green-600" />
              </div>
              <div>
                <Label htmlFor="whatsapp-toggle" className="text-base font-medium cursor-pointer">
                  WhatsApp Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send sale receipts via WhatsApp to shop owners
                </p>
              </div>
            </div>
            <Switch
              id="whatsapp-toggle"
              checked={settings.whatsapp_enabled}
              onCheckedChange={(checked) => handleToggleChange("whatsapp_enabled", checked)}
              className="data-[state=checked]:bg-green-600"
            />
          </div>

          {/* SMS Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-blue-50/50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <MessageSquare size={24} className="text-blue-600" />
              </div>
              <div>
                <Label htmlFor="sms-toggle" className="text-base font-medium cursor-pointer">
                  SMS Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send sale receipts via SMS to shop owners
                </p>
              </div>
            </div>
            <Switch
              id="sms-toggle"
              checked={settings.sms_enabled}
              onCheckedChange={(checked) => handleToggleChange("sms_enabled", checked)}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Salesman Settings */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Salesman Settings
          </CardTitle>
          <CardDescription>
            Configure salesman report submission behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Allow Multiple Reports Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-orange-50/50 border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100">
                <FileText size={24} className="text-orange-600" />
              </div>
              <div>
                <Label htmlFor="multiple-reports-toggle" className="text-base font-medium cursor-pointer">
                  Allow Multiple Reports
                </Label>
                <p className="text-sm text-muted-foreground">
                  {settings.allow_multiple_reports 
                    ? "Salesmen can add sales/initial loads after report submission" 
                    : "Sales and initial loads are blocked after report submission"}
                </p>
              </div>
            </div>
            <Switch
              id="multiple-reports-toggle"
              checked={settings.allow_multiple_reports}
              onCheckedChange={(checked) => handleToggleChange("allow_multiple_reports", checked)}
              className="data-[state=checked]:bg-orange-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Critical Section Toggle */}
      <Card className="border-border/50 border-red-200 bg-red-50/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <ShieldAlert size={24} className="text-red-600" />
              </div>
              <div>
                <Label htmlFor="critical-toggle" className="text-base font-medium cursor-pointer text-red-700">
                  Show Critical Section
                </Label>
                <p className="text-sm text-red-600/80">
                  Toggle to access API configurations and data management tools
                </p>
              </div>
            </div>
            <Switch
              id="critical-toggle"
              checked={showCriticalSection}
              onCheckedChange={setShowCriticalSection}
              className="data-[state=checked]:bg-red-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Critical Sections - Only visible when toggle is ON */}
      {showCriticalSection && (
        <>
          {/* WhatsApp Configuration */}
          <Card className="border-border/50 border-red-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle size={20} className="text-green-600" />
                WhatsApp Configuration
              </CardTitle>
              <CardDescription>
                Configure WhatsApp Business API credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-token">API Token {settings.whatsapp_api_token_set && <span className="text-green-600 text-xs">(configured)</span>}</Label>
                <div className="relative">
                  <Input
                    id="whatsapp-token"
                    type={showWhatsAppToken ? "text" : "password"}
                    placeholder={settings.whatsapp_api_token_set ? "••••••••••••••••" : "Enter WhatsApp API Token"}
                    value={settings.whatsapp_api_token}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_api_token: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showWhatsAppToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-phone-id">Phone Number ID</Label>
                  <Input
                    id="whatsapp-phone-id"
                    type="text"
                    placeholder="109780805521902"
                    value={settings.whatsapp_phone_number_id}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_phone_number_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-template">Template ID</Label>
                  <Input
                    id="whatsapp-template"
                    type="text"
                    placeholder="gowda_egg_sale_receipt"
                    value={settings.whatsapp_template_id}
                    onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_template_id: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="whatsapp-image-url">Header Image URL</Label>
                <Input
                  id="whatsapp-image-url"
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={settings.whatsapp_header_image_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_header_image_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Image displayed in WhatsApp message header (recommended: 300x300px)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SMS Configuration */}
          <Card className="border-border/50 border-red-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare size={20} className="text-blue-600" />
                SMS Configuration (MSG91)
              </CardTitle>
              <CardDescription>
                Configure MSG91 API credentials for SMS notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="msg91-key">Auth Key {settings.msg91_auth_key_set && <span className="text-green-600 text-xs">(configured)</span>}</Label>
                <div className="relative">
                  <Input
                    id="msg91-key"
                    type={showMsg91Key ? "text" : "password"}
                    placeholder={settings.msg91_auth_key_set ? "••••••••••••••••" : "Enter MSG91 Auth Key"}
                    value={settings.msg91_auth_key}
                    onChange={(e) => setSettings(prev => ({ ...prev, msg91_auth_key: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMsg91Key(!showMsg91Key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showMsg91Key ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="msg91-template">Template ID</Label>
                <Input
                  id="msg91-template"
                  type="text"
                  placeholder="Enter MSG91 Template ID"
                  value={settings.msg91_template_id}
                  onChange={(e) => setSettings(prev => ({ ...prev, msg91_template_id: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Reset and Export Section */}
          <Card className="border-border/50 border-red-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                <AlertTriangle size={20} />
                Reset and Export
              </CardTitle>
              <CardDescription>
                Export your data or clear records. These actions may be irreversible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Export Data */}
                <div className="p-4 rounded-lg border bg-blue-50/50 border-blue-200">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-3 rounded-full bg-blue-100">
                      <Download size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Export Data</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Download a JSON backup of all your data
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportData}
                      disabled={exporting}
                      className="w-full border-blue-300 hover:bg-blue-100"
                      data-testid="export-data-btn"
                    >
                      {exporting ? (
                        <>
                          <Loader2 size={14} className="mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download size={14} className="mr-2" />
                          Export Data
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Clear Today's Data */}
                <div className="p-4 rounded-lg border bg-orange-50/50 border-orange-200">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-3 rounded-full bg-orange-100">
                      <Trash2 size={24} className="text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Clear Today's Data</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Delete only today's records
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClearTodayDialog(true)}
                      className="w-full border-orange-300 hover:bg-orange-100"
                      data-testid="clear-today-btn"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Clear Today
                    </Button>
                  </div>
                </div>

                {/* Clear All Data */}
                <div className="p-4 rounded-lg border bg-red-50/50 border-red-200">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-3 rounded-full bg-red-100">
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-red-700">Clear Data</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Selectively delete data from collections
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenClearDialog}
                      className="w-full border-red-300 hover:bg-red-100 text-red-700"
                      data-testid="clear-data-btn"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Clear Data
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveCredentials}
              disabled={saving}
              className="min-w-[150px]"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save Credentials
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Clear Data Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              Clear Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select the data you want to permanently delete. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto">
            {CLEAR_OPTIONS.map(({ key, label, icon: Icon, color }) => (
              <div
                key={key}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCollections.includes(key) 
                    ? "border-red-300 bg-red-50" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => toggleCollection(key)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedCollections.includes(key)}
                    onCheckedChange={() => toggleCollection(key)}
                  />
                  <Icon size={18} className={color} />
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {collectionCounts[key] || 0} records
                </span>
              </div>
            ))}
          </div>
          
          {selectedCollections.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <strong>Warning:</strong> You are about to delete data from {selectedCollections.length} collection(s). 
              This will permanently remove all records.
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={clearing || selectedCollections.length === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {clearing ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Clear Selected
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Today's Data Confirmation Dialog */}
      <AlertDialog open={showClearTodayDialog} onOpenChange={setShowClearTodayDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} />
              Clear Today's Data
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              This will permanently delete <strong>TODAY'S</strong> data only from the following:
              <ul className="mt-3 space-y-1 text-sm">
                <li>• Expenses</li>
                <li>• Transportation Expenses</li>
                <li>• Salary Expenses</li>
                <li>• Initial Loading Report</li>
                <li>• Transaction Report (Sales)</li>
                <li>• Daily Submitted Reports</li>
                <li>• Salary Setup</li>
              </ul>
              <p className="mt-3 font-medium text-red-600">This action cannot be undone!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingToday}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearTodaysData}
              disabled={clearingToday}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-clear-today-btn"
            >
              {clearingToday ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Clear Today's Data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConfigSettingsPage;
