import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, MessageCircle, MessageSquare, Save, Eye, EyeOff, FileText } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

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
      toast.error("Failed to update setting");
      // Revert on error
      setSettings(prev => ({ ...prev, [field]: !value }));
    }
  };

  const handleSaveCredentials = async () => {
    try {
      setSaving(true);
      
      const updateData = {};
      
      // Only send credentials if they've been changed (not empty)
      if (settings.whatsapp_api_token) {
        updateData.whatsapp_api_token = settings.whatsapp_api_token;
      }
      if (settings.whatsapp_phone_number_id) {
        updateData.whatsapp_phone_number_id = settings.whatsapp_phone_number_id;
      }
      if (settings.whatsapp_template_id) {
        updateData.whatsapp_template_id = settings.whatsapp_template_id;
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
      toast.success("Settings saved successfully");
      
      // Refresh to get updated state
      await fetchSettings();
      
      // Clear sensitive fields after save
      setSettings(prev => ({
        ...prev,
        whatsapp_api_token: "",
        msg91_auth_key: ""
      }));
      
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="config-settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-primary-950">Config Settings</h1>
        <p className="text-muted-foreground">Manage notification settings for sales transactions</p>
      </div>

      {/* Notification Toggles */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Enable or disable notifications sent to shops after each sale transaction
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

      {/* WhatsApp Configuration */}
      <Card className="border-border/50">
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
        </CardContent>
      </Card>

      {/* SMS Configuration */}
      <Card className="border-border/50">
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
    </div>
  );
};

export default ConfigSettingsPage;
