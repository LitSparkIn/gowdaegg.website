import { useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Loader2, Search } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const getMonthStart = () => {
  const now = new Date();
  return format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
};

const AllTransactionsReportPage = () => {
  const [fromDate, setFromDate] = useState(getMonthStart());
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const formatCurrency = (value) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

  const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(value || 0);

  const fetchTransactions = async (event) => {
    event.preventDefault();
    if (!fromDate || !toDate) {
      toast.error("Start date and end date are required");
      return;
    }
    if (fromDate > toDate) {
      toast.error("Start date cannot be after end date");
      return;
    }

    try {
      setLoading(true);
      const response = await api.get("/sales/all-transactions-report", {
        params: { from_date: fromDate, to_date: toDate },
      });
      setTransactions(response.data.data.transactions || []);
      setTotals(response.data.data.totals || null);
      setHasSearched(true);
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      toast.error(error.response?.data?.detail || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!transactions.length) {
      toast.error("No transactions to export");
      return;
    }

    const rows = transactions.map((item, index) => ({
      "#": index + 1,
      "Transaction ID": item.id || "",
      "Date": item.sale_date || "",
      "Time": item.sale_time || "",
      "Transaction Type": item.transaction_type || "",
      "Route": item.route_name || "",
      "Salesman": item.salesman_name || "",
      "Shop": item.shop_name || "",
      "Shop Phone": item.shop_phone || "",
      "Crates": item.crates || 0,
      "Rate Per Egg": item.price || 0,
      "Order Amount": item.order_amount || 0,
      "Previous Dues": item.shop_previous_dues || 0,
      "Total Amount": item.total_amount || 0,
      "Collected Amount": item.collected_amount || 0,
      "Pending Amount": item.pending_amount || 0,
      "Payment Type": item.payment_type || "",
      "Returned Trays": item.return_tray || 0,
      "Previous Tray Balance": item.previous_tray_balance || 0,
      "Current Tray Balance": item.current_tray_balance || 0,
      "Report Submitted": item.report_submitted ? "Yes" : "No",
      "Image URL": item.image_url || "",
      "Created At": item.created_at || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!autofilter"] = { ref: worksheet["!ref"] };
    worksheet["!cols"] = Object.keys(rows[0]).map((key) => ({
      wch: Math.min(Math.max(key.length + 2, 14), 28),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Transactions");
    XLSX.writeFile(workbook, `AllTransactions_${fromDate}_to_${toDate}.xlsx`);
    toast.success(`Exported ${transactions.length.toLocaleString("en-IN")} transactions`);
  };

  return (
    <div className="space-y-6" data-testid="all-transactions-report-page">
      <div>
        <h1 className="text-2xl font-semibold text-primary-950">All Transactions Report</h1>
        <p className="text-muted-foreground">Load and export every sale and collection between two dates without pagination.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <form onSubmit={fetchTransactions} className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="w-full space-y-2 md:w-56">
              <Label htmlFor="all-transactions-from">Start Date</Label>
              <Input
                id="all-transactions-from"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div className="w-full space-y-2 md:w-56">
              <Label htmlFor="all-transactions-to">End Date</Label>
              <Input
                id="all-transactions-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="md:min-w-32">
              {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Search size={16} className="mr-2" />}
              {loading ? "Loading..." : "Submit"}
            </Button>
            <Button type="button" variant="outline" onClick={exportToExcel} disabled={loading || !transactions.length}>
              <Download size={16} className="mr-2" />
              Convert to Excel
            </Button>
          </form>
        </CardContent>
      </Card>

      {totals && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            ["Transactions", formatNumber(totals.total_records)],
            ["Crates", formatNumber(totals.total_crates)],
            ["Order Amount", formatCurrency(totals.total_order_amount)],
            ["Collected", formatCurrency(totals.total_collected)],
            ["Pending", formatCurrency(totals.total_pending)],
            ["Returned Trays", formatNumber(totals.total_return_tray)],
          ].map(([label, value]) => (
            <Card key={label} className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-bold text-primary-950">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet size={20} className="text-green-600" />
            Results {hasSearched && `(${transactions.length.toLocaleString("en-IN")})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={36} className="animate-spin text-primary" />
            </div>
          ) : !hasSearched ? (
            <p className="py-16 text-center text-muted-foreground">Select a date range and click Submit.</p>
          ) : transactions.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No transactions found in this date range.</p>
          ) : (
            <div className="max-h-[70vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Salesman</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead className="text-right">Crates</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Order</TableHead>
                    <TableHead className="text-right">Previous Dues</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Return Tray</TableHead>
                    <TableHead className="text-right">Tray Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p className="font-medium">{item.sale_date}</p>
                        <p className="text-xs text-muted-foreground">{item.sale_time || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.transaction_type === "Collection" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {item.transaction_type}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{item.route_name || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{item.salesman_name || "-"}</TableCell>
                      <TableCell className="min-w-48">
                        <p className="font-medium">{item.shop_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{item.shop_phone || ""}</p>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(item.crates)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.order_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.shop_previous_dues)}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">{formatCurrency(item.collected_amount)}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">{formatCurrency(item.pending_amount)}</TableCell>
                      <TableCell>{item.payment_type || "-"}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.return_tray)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.current_tray_balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AllTransactionsReportPage;
