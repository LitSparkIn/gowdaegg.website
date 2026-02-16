import { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Loader2, 
  CalendarIcon, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Wallet,
  ArrowRight,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DailySummaryPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const checkSubmissionStatus = async (dateStr) => {
    try {
      const response = await axios.get(
        `${API}/daily-summary/check-submitted?date=${dateStr}`,
        getAuthHeaders()
      );
      const data = response.data.data;
      setIsSubmitted(data.is_submitted);
      setSubmittedAt(data.submitted_at);
    } catch (error) {
      console.error("Error checking submission status:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Check if already submitted
      await checkSubmissionStatus(dateStr);
      
      const response = await axios.get(
        `${API}/daily-summary?date=${dateStr}`,
        getAuthHeaders()
      );
      setSummary(response.data.data);
    } catch (error) {
      console.error("Error fetching daily summary:", error);
      toast.error("Failed to fetch daily summary");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      await axios.post(
        `${API}/daily-summary/submit?date=${dateStr}`,
        {},
        getAuthHeaders()
      );
      
      toast.success(`Daily summary for ${dateStr} submitted successfully!`);
      setIsSubmitted(true);
      setSubmittedAt(new Date().toISOString());
      setShowConfirmDialog(false);
    } catch (error) {
      console.error("Error submitting summary:", error);
      const errorMsg = error.response?.data?.detail || "Failed to submit daily summary";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const SummaryRow = ({ label, value, valueClass = "", highlight = false }) => (
    <div className={cn(
      "flex justify-between items-center py-3 px-4",
      highlight ? "bg-primary/5 rounded-lg" : "border-b border-gray-100 last:border-b-0"
    )}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", valueClass)}>{value}</span>
    </div>
  );

  const SummaryRowWithCalc = ({ label, value, calculation, valueClass = "" }) => (
    <div className="flex justify-between items-center py-3 px-4 border-b border-gray-100 last:border-b-0">
      <div>
        <span className="text-sm text-muted-foreground">{label}</span>
        {calculation && (
          <p className="text-xs text-muted-foreground/70">{calculation}</p>
        )}
      </div>
      <span className={cn("font-semibold", valueClass)}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="daily-summary-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Daily Summary</h1>
          <p className="text-muted-foreground">Overview of daily business operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                data-testid="date-picker-btn"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd MMM yyyy") : "Select Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSummary}
            disabled={loading}
            data-testid="refresh-btn"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Submitted Banner */}
      {isSubmitted && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Lock size={20} className="text-green-600" />
          <div>
            <p className="font-medium text-green-800">
              Summary Submitted & Locked
            </p>
            <p className="text-sm text-green-600">
              Submitted on {formatDateTime(submittedAt)}. No changes can be made for this date.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-primary" />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CRATE INFORMATION */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package size={20} className="text-blue-600" />
                Crate Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-1">
                <SummaryRowWithCalc 
                  label="Carryover Today" 
                  value={formatNumber(summary.crate_information.carryover_today)}
                  calculation="Leftover inventory from previous days"
                />
                <SummaryRowWithCalc 
                  label="Carryover Price" 
                  value={`₹${summary.crate_information.carryover_price}`}
                  calculation={`Value: ${formatCurrency(summary.crate_information.carryover_value)}`}
                />
                <SummaryRow 
                  label="Purchase Today" 
                  value={formatNumber(summary.crate_information.purchase_today)}
                  valueClass="text-blue-600"
                />
                <SummaryRowWithCalc 
                  label="Purchase Rate" 
                  value={`₹${summary.crate_information.purchase_rate}`}
                  calculation={`Value: ${formatCurrency(summary.crate_information.purchase_value)}`}
                />
                <SummaryRow 
                  label="Total Crates" 
                  value={formatNumber(summary.crate_information.total_crates)}
                  valueClass="text-primary font-bold"
                  highlight
                />
                <SummaryRow 
                  label="Average Rate" 
                  value={`₹${summary.crate_information.average_rate}`}
                />
                <SummaryRow 
                  label="Damage" 
                  value={formatNumber(summary.crate_information.damage)}
                  valueClass="text-red-600"
                />
                <SummaryRow 
                  label="Net Crates" 
                  value={formatNumber(summary.crate_information.net_crates)}
                  valueClass="text-green-600 font-bold"
                  highlight
                />
              </div>
            </CardContent>
          </Card>

          {/* SALE INFORMATION */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart size={20} className="text-green-600" />
                Sale Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-1">
                <SummaryRow 
                  label="Total Initial Load" 
                  value={formatNumber(summary.sale_information.total_initial_load)}
                />
                <SummaryRow 
                  label="Total Sales" 
                  value={formatNumber(summary.sale_information.total_sales)}
                  valueClass="text-green-600 font-bold"
                />
                <SummaryRow 
                  label="Total Collected" 
                  value={formatCurrency(summary.sale_information.total_collected || 0)}
                  valueClass="text-purple-600 font-bold"
                />
                <SummaryRow 
                  label="Total Damages" 
                  value={formatNumber(summary.sale_information.total_damages)}
                  valueClass="text-red-600"
                />
                <SummaryRow 
                  label="Returned" 
                  value={formatNumber(summary.sale_information.returned)}
                  valueClass="text-orange-600"
                  highlight
                />
              </div>
              
              {/* Visual breakdown */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-3">Sales Breakdown</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(summary.sale_information.total_initial_load)}</p>
                    <p className="text-xs text-muted-foreground">Loaded</p>
                  </div>
                  <ArrowRight size={20} className="text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{formatNumber(summary.sale_information.total_sales)}</p>
                    <p className="text-xs text-muted-foreground">Sold</p>
                  </div>
                  <ArrowRight size={20} className="text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.sale_information.total_collected || 0)}</p>
                    <p className="text-xs text-muted-foreground">Collected</p>
                  </div>
                  <ArrowRight size={20} className="text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{formatNumber(summary.sale_information.returned)}</p>
                    <p className="text-xs text-muted-foreground">Returned</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PROFIT | LOSS */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp size={20} className="text-purple-600" />
                Profit | Loss
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-1">
                <SummaryRowWithCalc 
                  label="Total Buy" 
                  value={`${formatNumber(summary.profit_loss.total_buy_crates)} crates`}
                  calculation="Net Crates from Crate Information"
                />
                <SummaryRowWithCalc 
                  label="Buy Rate" 
                  value={`₹${summary.profit_loss.buy_rate}`}
                  calculation={`= ${formatCurrency(summary.profit_loss.buy_value)}`}
                  valueClass="text-red-600"
                />
                <SummaryRow 
                  label="Total Sale" 
                  value={`${formatNumber(summary.profit_loss.total_sale_crates)} crates`}
                />
                <SummaryRowWithCalc 
                  label="Sale Rate" 
                  value={`₹${summary.profit_loss.sale_rate}`}
                  calculation={`= ${formatCurrency(summary.profit_loss.sale_value)}`}
                  valueClass="text-green-600"
                />
              </div>
              
              {/* Profit Summary */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Purchase Value</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(summary.profit_loss.buy_value)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Sale Value</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(summary.profit_loss.sale_value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* EXPENSES & FINAL SUMMARY */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet size={20} className="text-orange-600" />
                Expenses & Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-1">
                <SummaryRow 
                  label="Salesman Expenses" 
                  value={formatCurrency(summary.expenses.salesman_expenses)}
                  valueClass="text-red-600"
                />
                <SummaryRow 
                  label="Other Expenses" 
                  value={formatCurrency(summary.expenses.other_expenses)}
                  valueClass="text-red-600"
                />
                <SummaryRow 
                  label="Total Expenses" 
                  value={formatCurrency(summary.expenses.total_expenses)}
                  valueClass="text-red-600 font-bold"
                  highlight
                />
                <div className="my-3 border-t border-dashed" />
                <SummaryRow 
                  label="Total Sale" 
                  value={formatCurrency(summary.expenses.total_sale)}
                  valueClass="text-green-600"
                />
                <SummaryRowWithCalc 
                  label="Net Purchase (COGS)" 
                  value={formatCurrency(summary.expenses.net_purchase)}
                  calculation={`${formatNumber(summary.profit_loss.total_sale_crates)} crates × 30 × ₹${summary.profit_loss.buy_rate}`}
                  valueClass="text-red-600"
                />
                <SummaryRowWithCalc 
                  label="Net Profit" 
                  value={formatCurrency(summary.expenses.net_profit)}
                  calculation={`Total Sale - COGS - Expenses = ${formatCurrency(summary.expenses.total_sale)} - ${formatCurrency(summary.expenses.net_purchase)} - ${formatCurrency(summary.expenses.total_expenses)}`}
                  valueClass={summary.expenses.net_profit >= 0 ? "text-green-600 font-bold text-lg" : "text-red-600 font-bold text-lg"}
                />
                <div className="my-3 border-t border-dashed" />
                <SummaryRowWithCalc 
                  label="Carryover for Tomorrow" 
                  value={`${formatNumber(summary.expenses.carryover_tomorrow)} crates`}
                  calculation={`${formatNumber(summary.crate_information.net_crates)} - ${formatNumber(summary.sale_information.total_sales)}`}
                  valueClass="text-blue-600 font-bold"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No summary data available</p>
        </div>
      )}

      {/* Salesman Submission Status */}
      {summary && summary.salesman_status && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-indigo-600" />
                Salesman Report Status
              </div>
              <div className="flex items-center gap-4 text-sm font-normal">
                <span className="text-muted-foreground">
                  Active Today: {summary.salesman_status.active_salesmen}
                </span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 size={16} />
                  {summary.salesman_status.submitted_count} Submitted
                </span>
                {summary.salesman_status.pending_count > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle size={16} />
                    {summary.salesman_status.pending_count} Pending
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {summary.salesman_status.salesmen.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No salesmen found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Salesman</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Loaded</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Sold</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Collected</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Avg Rate</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.salesman_status.salesmen.map((salesman, index) => (
                      <tr 
                        key={salesman.id}
                        className={cn(
                          "border-b last:border-b-0",
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                          !salesman.is_active_today && "opacity-50"
                        )}
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-sm">{salesman.name}</p>
                            <p className="text-xs text-muted-foreground">{salesman.phone}</p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={cn(
                            "font-semibold",
                            salesman.loaded > 0 ? "text-blue-600" : "text-muted-foreground"
                          )}>
                            {formatNumber(salesman.loaded)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={cn(
                            "font-semibold",
                            salesman.sold > 0 ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {formatNumber(salesman.sold)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <div>
                            <span className={cn(
                              "font-semibold",
                              salesman.collected > 0 ? "text-purple-600" : "text-muted-foreground"
                            )}>
                              {salesman.collected > 0 ? formatCurrency(salesman.collected) : "-"}
                            </span>
                            {salesman.collection_count > 0 && (
                              <p className="text-xs text-muted-foreground">
                                ({salesman.collection_count} txn)
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="text-sm">
                            {salesman.avg_rate > 0 ? `₹${salesman.avg_rate}` : "-"}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          {!salesman.is_active_today ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                              No Activity
                            </span>
                          ) : salesman.submitted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                              <CheckCircle2 size={12} />
                              Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                              <XCircle size={12} />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Warning if not all submitted */}
            {!summary.salesman_status.all_submitted && !isSubmitted && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600" />
                <p className="text-sm text-amber-800">
                  {summary.salesman_status.pending_count} active salesman(s) have not submitted their daily reports yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {summary && (
        <div className="flex justify-end">
          {isSubmitted ? (
            <Button
              size="lg"
              disabled
              className="bg-gray-400 cursor-not-allowed"
              data-testid="submit-summary-btn"
            >
              <Lock size={18} className="mr-2" />
              Already Submitted
            </Button>
          ) : (
            <Button
              size="lg"
              className={cn(
                "bg-primary hover:bg-primary-600",
                !summary.salesman_status?.all_submitted && "opacity-50 cursor-not-allowed"
              )}
              data-testid="submit-summary-btn"
              disabled={!summary.salesman_status?.all_submitted || submitting}
              onClick={() => setShowConfirmDialog(true)}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Daily Summary"
              )}
            </Button>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Daily Summary?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to submit the daily summary for <strong>{format(selectedDate, "dd MMM yyyy")}</strong>.
              </p>
              <p className="text-amber-600 font-medium">
                Warning: Once submitted, no initial loads, sales, expenses, or other transactions can be added or modified for this date.
              </p>
              <p>Are you sure you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary-600"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Yes, Submit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DailySummaryPage;
