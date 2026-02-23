import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Store,
  Phone,
  MapPin,
  Route,
  Loader2,
  CalendarIcon,
  FileText,
  FileSpreadsheet,
  Printer,
  Package,
  IndianRupee,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const ShopDetailsPage = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({});
  const [fromDate, setFromDate] = useState(subDays(new Date(), 30));
  const [toDate, setToDate] = useState(new Date());

  const fetchShopDetails = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.append("from_date", format(fromDate, "yyyy-MM-dd"));
      if (toDate) params.append("to_date", format(toDate, "yyyy-MM-dd"));

      const response = await api.get(`/shops/${shopId}/transactions?${params.toString()}`);
      const data = response.data.data || {};
      setShop(data.shop);
      setTransactions(data.transactions || []);
      setTotals(data.totals || {});
    } catch (error) {
      console.error("Error fetching shop details:", error);
      toast.error("Failed to fetch shop details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      fetchShopDetails();
    }
  }, [shopId, fromDate, toDate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return "-";
    try {
      const time = timeStr || "00:00:00";
      return `${format(new Date(dateStr), "dd MMM")} ${time.substring(0, 5)}`;
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString("en-IN")}`;
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";

    // Title
    doc.setFontSize(18);
    doc.setTextColor(34, 84, 61);
    doc.text(`Shop Transaction History`, 14, 20);

    // Shop Info
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Shop: ${shop?.name || "N/A"}`, 14, 30);
    doc.text(`Phone: ${shop?.phone || "N/A"}`, 14, 36);
    doc.text(`Route: ${shop?.route_name || "N/A"}`, 14, 42);
    doc.text(`Period: ${fromStr} to ${toStr}`, 14, 48);
    doc.text(`Current Dues: ${formatCurrency(shop?.previous_dues)}`, 14, 54);
    doc.text(`Tray Balance: ${shop?.tray_balance || 0}`, 100, 54);

    // Table
    const tableData = transactions.map((t, i) => [
      i + 1,
      formatDateTime(t.sale_date, t.sale_time),
      t.salesman_name || "N/A",
      t.transaction_type || "Sale",
      t.crates || 0,
      formatCurrency(t.order_amount),
      formatCurrency(t.collected_amount),
      formatCurrency(t.pending_amount),
      t.payment_type || "-",
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["#", "Date/Time", "Salesman", "Type", "Crates", "Order Amt", "Collected", "Pending", "Payment"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 84, 61] },
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total Transactions: ${totals.total_transactions || 0}`, 14, finalY);
    doc.text(`Total Crates: ${totals.total_crates || 0}`, 14, finalY + 6);
    doc.text(`Total Order Amount: ${formatCurrency(totals.total_order_amount)}`, 14, finalY + 12);
    doc.text(`Total Collected: ${formatCurrency(totals.total_collected)}`, 100, finalY + 6);
    doc.text(`Total Pending: ${formatCurrency(totals.total_pending)}`, 100, finalY + 12);

    doc.save(`${shop?.name || "shop"}_transactions_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF exported successfully");
  };

  // Export to Excel
  const exportToExcel = () => {
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";

    const worksheetData = [
      ["Shop Transaction History"],
      [`Shop: ${shop?.name || "N/A"}`],
      [`Phone: ${shop?.phone || "N/A"}`],
      [`Route: ${shop?.route_name || "N/A"}`],
      [`Period: ${fromStr} to ${toStr}`],
      [`Current Dues: ${formatCurrency(shop?.previous_dues)}`],
      [`Tray Balance: ${shop?.tray_balance || 0}`],
      [],
      ["#", "Date", "Time", "Salesman", "Type", "Crates", "Order Amount", "Collected", "Pending", "Payment Type"],
      ...transactions.map((t, i) => [
        i + 1,
        t.sale_date,
        t.sale_time,
        t.salesman_name || "N/A",
        t.transaction_type || "Sale",
        t.crates || 0,
        t.order_amount || 0,
        t.collected_amount || 0,
        t.pending_amount || 0,
        t.payment_type || "-",
      ]),
      [],
      ["Totals"],
      ["Total Transactions", totals.total_transactions || 0],
      ["Total Crates", totals.total_crates || 0],
      ["Total Order Amount", totals.total_order_amount || 0],
      ["Total Collected", totals.total_collected || 0],
      ["Total Pending", totals.total_pending || 0],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `${shop?.name || "shop"}_transactions_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("Excel exported successfully");
  };

  // Print
  const handlePrint = () => {
    const fromStr = fromDate ? format(fromDate, "dd MMM yyyy") : "All";
    const toStr = toDate ? format(toDate, "dd MMM yyyy") : "All";

    const printContent = `
      <html>
        <head>
          <title>Shop Transactions - ${shop?.name || "Shop"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #22543d; margin-bottom: 5px; }
            .info { margin-bottom: 20px; }
            .info p { margin: 3px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background: #22543d; color: white; padding: 8px; text-align: left; }
            td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9f9f9; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; font-size: 12px; }
            .totals p { margin: 3px 0; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Shop Transaction History</h1>
          <div class="info">
            <p><strong>Shop:</strong> ${shop?.name || "N/A"} | <strong>Phone:</strong> ${shop?.phone || "N/A"}</p>
            <p><strong>Route:</strong> ${shop?.route_name || "N/A"} | <strong>Address:</strong> ${shop?.address || "N/A"}</p>
            <p><strong>Period:</strong> ${fromStr} to ${toStr}</p>
            <p><strong>Current Dues:</strong> ${formatCurrency(shop?.previous_dues)} | <strong>Tray Balance:</strong> ${shop?.tray_balance || 0}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date/Time</th>
                <th>Salesman</th>
                <th>Type</th>
                <th class="text-right">Crates</th>
                <th class="text-right">Order Amt</th>
                <th class="text-right">Collected</th>
                <th class="text-right">Pending</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map((t, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${formatDateTime(t.sale_date, t.sale_time)}</td>
                  <td>${t.salesman_name || "N/A"}</td>
                  <td>${t.transaction_type || "Sale"}</td>
                  <td class="text-right">${t.crates || 0}</td>
                  <td class="text-right">${formatCurrency(t.order_amount)}</td>
                  <td class="text-right">${formatCurrency(t.collected_amount)}</td>
                  <td class="text-right">${formatCurrency(t.pending_amount)}</td>
                  <td>${t.payment_type || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="totals">
            <p><strong>Total Transactions:</strong> ${totals.total_transactions || 0} | <strong>Total Crates:</strong> ${totals.total_crates || 0}</p>
            <p><strong>Total Order Amount:</strong> ${formatCurrency(totals.total_order_amount)} | <strong>Total Collected:</strong> ${formatCurrency(totals.total_collected)} | <strong>Total Pending:</strong> ${formatCurrency(totals.total_pending)}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle size={48} className="text-muted-foreground" />
        <p className="text-muted-foreground">Shop not found</p>
        <Button variant="outline" onClick={() => navigate("/admin/shop")}>
          <ArrowLeft size={16} className="mr-2" />
          Back to Shops
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="shop-details-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/shop")}
            data-testid="back-btn"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-primary-950">Shop Details</h1>
            <p className="text-muted-foreground">View shop information and transaction history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} data-testid="print-btn">
            <Printer size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} data-testid="pdf-btn">
            <FileText size={16} className="mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="excel-btn">
            <FileSpreadsheet size={16} className="mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Shop Info Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store size={20} className="text-primary" />
            {shop.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Phone size={18} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{shop.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <MapPin size={18} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium text-sm">{shop.address || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Route size={18} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Route</p>
                <p className="font-medium">{shop.route_name || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Package size={18} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tray Balance</p>
                <p className="font-medium">{shop.tray_balance || 0}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <CreditCard size={16} />
                <span className="text-xs font-medium">Current Dues</span>
              </div>
              <p className="text-xl font-bold text-red-700">{formatCurrency(shop.previous_dues)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <IndianRupee size={16} />
                <span className="text-xs font-medium">Credit Limit</span>
              </div>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(shop.credit_threshold)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Package size={16} />
                <span className="text-xs font-medium">Total Crates (Period)</span>
              </div>
              <p className="text-xl font-bold text-green-700">{totals.total_crates || 0}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <IndianRupee size={16} />
                <span className="text-xs font-medium">Total Collected (Period)</span>
              </div>
              <p className="text-xl font-bold text-purple-700">{formatCurrency(totals.total_collected)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">
              Transaction History ({transactions.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <CalendarIcon size={14} className="mr-2" />
                    {fromDate ? format(fromDate, "dd MMM") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <CalendarIcon size={14} className="mr-2" />
                    {toDate ? format(toDate, "dd MMM") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No transactions found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Salesman</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Crates</TableHead>
                    <TableHead className="text-right">Order Amt</TableHead>
                    <TableHead className="text-right">Prev Dues</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, index) => (
                    <TableRow key={txn.id || index} data-testid={`txn-row-${index}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(txn.sale_date, txn.sale_time)}
                      </TableCell>
                      <TableCell className="text-sm">{txn.salesman_name || "N/A"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          txn.transaction_type === "Collection"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {txn.transaction_type || "Sale"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{txn.crates || 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(txn.order_amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(txn.shop_previous_dues)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(txn.total_amount)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(txn.collected_amount)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatCurrency(txn.pending_amount)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          txn.payment_type === "Cash"
                            ? "bg-green-100 text-green-700"
                            : txn.payment_type === "Cheque"
                            ? "bg-yellow-100 text-yellow-700"
                            : txn.payment_type === "Bill"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {txn.payment_type || "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Totals Footer */}
          {transactions.length > 0 && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Crates:</span>
                <span className="font-semibold">{totals.total_crates || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Order:</span>
                <span className="font-semibold">{formatCurrency(totals.total_order_amount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Collected:</span>
                <span className="font-semibold text-green-600">{formatCurrency(totals.total_collected)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Pending:</span>
                <span className="font-semibold text-red-600">{formatCurrency(totals.total_pending)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopDetailsPage;
