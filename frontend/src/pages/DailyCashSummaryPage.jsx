import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Coins,
  CalendarIcon,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  CheckCircle2,
  Banknote,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NOTE_DENOMINATIONS = [500, 200, 100, 50, 20, 10];
const COIN_DENOMINATIONS = [20, 10, 5, 2, 1];

const DailyCashSummaryPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [txnType, setTxnType] = useState("credit");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnComments, setTxnComments] = useState("");
  const [notes, setNotes] = useState({});
  const [coins, setCoins] = useState({});

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatTime = (isoStr) => {
    if (!isoStr) return "";
    try {
      return new Date(isoStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch { return ""; }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await api.get(`/cash-summary?date=${dateStr}`);
      setSummary(response.data.data);
    } catch (error) {
      console.error("Error fetching cash summary:", error);
      toast.error("Failed to fetch cash summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  const calcDenominationTotal = () => {
    let total = 0;
    for (const d of NOTE_DENOMINATIONS) {
      total += d * (parseInt(notes[d]) || 0);
    }
    for (const d of COIN_DENOMINATIONS) {
      total += d * (parseInt(coins[d]) || 0);
    }
    return total;
  };

  const resetForm = () => {
    setTxnType("credit");
    setTxnAmount("");
    setTxnComments("");
    setNotes({});
    setCoins({});
  };

  const handleSubmitTransaction = async () => {
    const amount = parseFloat(txnAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const hasDenom = Object.values(notes).some(v => parseInt(v) > 0) || Object.values(coins).some(v => parseInt(v) > 0);
      const denomination = hasDenom ? {
        notes: Object.fromEntries(NOTE_DENOMINATIONS.map(d => [d, parseInt(notes[d]) || 0]).filter(([, v]) => v > 0)),
        coins: Object.fromEntries(COIN_DENOMINATIONS.map(d => [d, parseInt(coins[d]) || 0]).filter(([, v]) => v > 0)),
      } : null;

      await api.post("/cash-summary/transaction", {
        type: txnType,
        amount,
        denomination,
        comments: txnComments,
      });

      toast.success(`Cash ${txnType} recorded successfully`);
      setShowAddDialog(false);
      resetForm();
      fetchSummary();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.response?.data?.detail || "Failed to record transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/cash-summary/transaction/${id}`);
      toast.success("Transaction deleted");
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete");
    }
  };

  const denomTotal = calcDenominationTotal();

  const renderDenomination = (denom) => {
    if (!denom) return null;
    const items = [];
    if (denom.notes) {
      for (const [d, count] of Object.entries(denom.notes)) {
        if (count > 0) items.push({ label: `${d} x ${count}`, value: parseInt(d) * count, type: "note" });
      }
    }
    if (denom.coins) {
      for (const [d, count] of Object.entries(denom.coins)) {
        if (count > 0) items.push({ label: `${d} x ${count}`, value: parseInt(d) * count, type: "coin" });
      }
    }
    if (items.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {items.map((item, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
            {item.label} = {formatCurrency(item.value)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="daily-cash-summary-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Daily Cash Summary</h1>
          <p className="text-muted-foreground text-sm">Track daily cash credits and debits</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }} data-testid="update-cash-btn">
          <Plus size={16} className="mr-2" />
          Update Cash
        </Button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Summary */}
        <div className="space-y-4">
          {/* Date Picker */}
          <Card className="border-border/50">
            <CardContent className="pt-5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="date-picker-btn">
                    <CalendarIcon size={16} className="mr-2" />
                    {format(selectedDate, "dd MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : summary ? (
            <div className="space-y-3">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">Total Credit</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_credit)}</p>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">Total Debit</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_debit)}</p>
                </CardContent>
              </Card>
              <Card className={cn("border-blue-200", summary.net_cash >= 0 ? "bg-blue-50" : "bg-orange-50")}>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">Net Cash</p>
                  <p className={cn("text-2xl font-bold", summary.net_cash >= 0 ? "text-blue-600" : "text-orange-600")}>
                    {formatCurrency(summary.net_cash)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold text-purple-600">{summary.transaction_count}</p>
                </CardContent>
              </Card>
              {summary.is_submitted && (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle2 size={14} />
                  Summary submitted
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Right - Transactions */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Banknote size={20} className="text-green-600" />
                Transactions — {format(selectedDate, "dd MMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : !summary || summary.transactions.length === 0 ? (
                <div className="text-center py-16">
                  <Coins size={48} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No cash transactions for this date</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {summary.transactions.map((txn) => (
                    <div
                      key={txn.id}
                      data-testid={`cash-txn-${txn.id}`}
                      className={cn(
                        "p-3 rounded-lg border",
                        txn.type === "credit" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {txn.type === "credit" ? (
                            <ArrowUpCircle size={18} className="text-green-600 mt-0.5" />
                          ) : (
                            <ArrowDownCircle size={18} className="text-red-600 mt-0.5" />
                          )}
                          <div>
                            <span className={cn(
                              "font-semibold text-base",
                              txn.type === "credit" ? "text-green-700" : "text-red-700"
                            )}>
                              {txn.type === "credit" ? "+" : "-"}{formatCurrency(txn.amount)}
                            </span>
                            <p className="text-sm text-muted-foreground mt-0.5">{txn.comments || "-"}</p>
                            {renderDenomination(txn.denomination)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{formatTime(txn.created_at)}</span>
                          {txn.source === "manual" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-red-100 hover:text-red-600"
                              onClick={() => handleDelete(txn.id)}
                              data-testid={`delete-txn-${txn.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                          txn.source === "sale_report" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                        )}>
                          {txn.source === "sale_report" ? "Sale Report" : "Manual"}
                        </span>
                        <span>by {txn.created_by}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins size={20} className="text-green-600" />
              Update Cash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={txnType} onValueChange={setTxnType}>
                <SelectTrigger data-testid="txn-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (Money In)</SelectItem>
                  <SelectItem value="debit">Debit (Money Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={txnAmount}
                onChange={(e) => setTxnAmount(e.target.value)}
                data-testid="txn-amount-input"
              />
            </div>

            {/* Denominations */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Denominations (optional)</Label>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Notes</p>
                <div className="grid grid-cols-2 gap-2">
                  {NOTE_DENOMINATIONS.map((d) => (
                    <div key={`n-${d}`} className="flex items-center gap-2">
                      <span className="text-xs w-10 text-right font-medium">{d} x</span>
                      <Input
                        type="number"
                        className="h-8 text-sm"
                        placeholder="0"
                        value={notes[d] || ""}
                        onChange={(e) => setNotes(prev => ({ ...prev, [d]: e.target.value }))}
                        data-testid={`note-${d}-input`}
                      />
                      <span className="text-xs text-muted-foreground w-14">= {formatCurrency(d * (parseInt(notes[d]) || 0))}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Coins</p>
                <div className="grid grid-cols-2 gap-2">
                  {COIN_DENOMINATIONS.map((d) => (
                    <div key={`c-${d}`} className="flex items-center gap-2">
                      <span className="text-xs w-10 text-right font-medium">{d} x</span>
                      <Input
                        type="number"
                        className="h-8 text-sm"
                        placeholder="0"
                        value={coins[d] || ""}
                        onChange={(e) => setCoins(prev => ({ ...prev, [d]: e.target.value }))}
                        data-testid={`coin-${d}-input`}
                      />
                      <span className="text-xs text-muted-foreground w-14">= {formatCurrency(d * (parseInt(coins[d]) || 0))}</span>
                    </div>
                  ))}
                </div>
              </div>
              {denomTotal > 0 && (
                <div className="text-sm font-semibold text-right border-t pt-2">
                  Denomination Total: {formatCurrency(denomTotal)}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea
                placeholder="Enter comments..."
                value={txnComments}
                onChange={(e) => setTxnComments(e.target.value)}
                data-testid="txn-comments-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmitTransaction} disabled={submitting} data-testid="submit-txn-btn">
              {submitting ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              {submitting ? "Saving..." : "Save Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyCashSummaryPage;
