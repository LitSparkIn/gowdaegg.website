import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  History,
  CalendarDays,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SalaryHistoryPage = () => {
  const { setupId } = useParams();
  const navigate = useNavigate();

  const [setup, setSetup] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Attendance calendar state
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [attendance, setAttendance] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  // Balance history month state (independent of calendar)
  const [histMonth, setHistMonth] = useState(now.getMonth() + 1);
  const [histYear, setHistYear] = useState(now.getFullYear());

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatCurrencyPdf = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const daysInMonth = (m, y) => new Date(y, m, 0).getDate();

  const fetchSetup = async () => {
    try {
      setLoadingSetup(true);
      const response = await api.get(`/salary-setup/${setupId}`);
      setSetup(response.data.data);
    } catch (error) {
      console.error("Error fetching setup:", error);
      toast.error("Failed to load salary setup");
    } finally {
      setLoadingSetup(false);
    }
  };

  const fetchActivities = async (month, year) => {
    try {
      setLoadingActivities(true);
      const dim = daysInMonth(month, year);
      const from_date = `${year}-${String(month).padStart(2, "0")}-01`;
      const to_date = `${year}-${String(month).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;
      const response = await api.get(`/salary-setup/${setupId}/activities?limit=500&from_date=${from_date}&to_date=${to_date}`);
      setActivities(response.data.data?.activities || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error("Failed to load activity history");
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchAttendance = async (month, year) => {
    if (!setup) return;
    try {
      setLoadingAttendance(true);
      const response = await api.get(
        `/attendance/salesman/${setup.salesman_id}?month=${month}&year=${year}`
      );
      setAttendance(response.data.data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchSetup();
  }, [setupId]);

  useEffect(() => {
    fetchActivities(histMonth, histYear);
  }, [setupId, histMonth, histYear]);

  useEffect(() => {
    if (setup) {
      fetchAttendance(calMonth, calYear);
    }
  }, [setup, calMonth, calYear]);

  // Calendar navigation
  const handlePrevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  // History month navigation
  const handleHistPrevMonth = () => {
    if (histMonth === 1) { setHistMonth(12); setHistYear(histYear - 1); }
    else setHistMonth(histMonth - 1);
  };
  const handleHistNextMonth = () => {
    if (histMonth === 12) { setHistMonth(1); setHistYear(histYear + 1); }
    else setHistMonth(histMonth + 1);
  };

  // Build calendar grid
  const buildCalendarGrid = () => {
    if (!attendance) return [];
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const rows = [];
    let currentRow = new Array(firstDay).fill(null);
    for (const d of attendance.days) {
      currentRow.push(d);
      if (currentRow.length === 7) { rows.push(currentRow); currentRow = []; }
    }
    if (currentRow.length > 0) {
      while (currentRow.length < 7) currentRow.push(null);
      rows.push(currentRow);
    }
    return rows;
  };

  // PDF Statement generation
  const generateStatement = async () => {
    if (!setup) return;

    // Fetch attendance for the history month (might differ from calendar month)
    let stmtAttendance = null;
    try {
      const res = await api.get(
        `/attendance/salesman/${setup.salesman_id}?month=${histMonth}&year=${histYear}`
      );
      stmtAttendance = res.data.data;
    } catch (e) {
      console.error("Error fetching attendance for statement:", e);
    }

    const monthLabel = `${MONTHS[histMonth - 1]} ${histYear}`;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Header
    doc.setFontSize(16);
    doc.setTextColor(34, 84, 61);
    doc.text("Salary Statement", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Salesman: ${setup.salesman_name}`, 14, 26);
    doc.text(`Month: ${monthLabel}`, 14, 32);
    doc.text(`Monthly Salary: ${formatCurrencyPdf(setup.monthly_salary)}  |  Current Balance: ${formatCurrencyPdf(setup.current_balance)}`, 14, 38);

    // Balance History Table
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Balance History", 14, 48);

    if (activities.length > 0) {
      const tableData = activities.map((a) => [
        formatDate(a.activity_date),
        a.activity_type === "credit" ? "Credit" : "Debit",
        a.remarks || "-",
        formatCurrencyPdf(a.amount),
        formatCurrencyPdf(a.balance_before),
        formatCurrencyPdf(a.balance_after),
      ]);

      autoTable(doc, {
        startY: 52,
        head: [["Date", "Type", "Remarks", "Amount", "Before", "After"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [34, 84, 61], textColor: 255, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 18 },
          2: { cellWidth: 50 },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 28, halign: "right" },
          5: { cellWidth: 28, halign: "right" },
        },
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("No transactions for this month.", 14, 56);
    }

    // Attendance Section
    let nextY = (doc.lastAutoTable?.finalY || 60) + 12;
    if (nextY > 260) { doc.addPage(); nextY = 18; }

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Attendance Summary", 14, nextY);
    nextY += 4;

    if (stmtAttendance) {
      const presentDates = [];
      const absentDates = [];
      for (const d of stmtAttendance.days) {
        if (d.status === "present") presentDates.push(d.day);
        else absentDates.push(d.day);
      }

      autoTable(doc, {
        startY: nextY + 2,
        head: [["", "Count", "Days"]],
        body: [
          ["Present", stmtAttendance.present_count, presentDates.join(", ") || "-"],
          ["Absent", stmtAttendance.absent_count, absentDates.join(", ") || "-"],
        ],
        theme: "grid",
        headStyles: { fillColor: [34, 84, 61], textColor: 255, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: "bold" },
          1: { cellWidth: 18, halign: "center" },
          2: { cellWidth: 140 },
        },
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("Attendance data not available.", 14, nextY + 6);
    }

    doc.save(`Salary_Statement_${setup.salesman_name.replace(/\s+/g, "_")}_${monthLabel.replace(/\s+/g, "_")}.pdf`);
    toast.success("Statement PDF downloaded!");
  };

  if (loadingSetup) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p>Salary setup not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/salary-setup")}>
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
      </div>
    );
  }

  const calendarGrid = buildCalendarGrid();

  return (
    <div className="space-y-6" data-testid="salary-history-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/salary-setup")} data-testid="back-btn">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">{setup.salesman_name}</h1>
          <p className="text-muted-foreground text-sm">Salary & Attendance Details</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Monthly Salary</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(setup.monthly_salary)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(setup.current_balance)}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Joining Date</p>
            <p className="text-xl font-bold text-purple-600">{formatDate(setup.joining_date)}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">{MONTHS[calMonth - 1]} Attendance</p>
            {attendance ? (
              <p className="text-xl font-bold text-orange-600">
                {attendance.present_count}P / {attendance.absent_count}A
              </p>
            ) : (
              <p className="text-xl font-bold text-orange-600">-</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Calendar */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays size={20} className="text-teal-600" />
                Attendance Calendar
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth} data-testid="prev-month-btn">
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm font-medium min-w-[130px] text-center">
                  {MONTHS[calMonth - 1]} {calYear}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth} data-testid="next-month-btn">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingAttendance ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-green-500"></span> Present ({attendance?.present_count || 0})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-400"></span> Absent ({attendance?.absent_count || 0})
                  </span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-7 bg-gray-100 border-b">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
                    ))}
                  </div>
                  {calendarGrid.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-7 border-b last:border-b-0">
                      {row.map((cell, ci) => (
                        <div
                          key={ci}
                          className={cn(
                            "py-2.5 text-center text-sm border-r last:border-r-0 min-h-[42px] flex items-center justify-center",
                            !cell && "bg-gray-50",
                            cell?.status === "present" && "bg-green-50",
                            cell?.status === "absent" && "bg-red-50"
                          )}
                        >
                          {cell && (
                            <span className={cn(
                              "w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium",
                              cell.status === "present" && "bg-green-500 text-white",
                              cell.status === "absent" && "bg-red-400 text-white"
                            )}>
                              {cell.day}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Balance History */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={20} className="text-purple-600" />
                Balance History ({activities.length})
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleHistPrevMonth} data-testid="hist-prev-month-btn">
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm font-medium min-w-[130px] text-center">
                  {MONTHS[histMonth - 1]} {histYear}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleHistNextMonth} data-testid="hist-next-month-btn">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </CardTitle>
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateStatement}
                disabled={loadingActivities}
                className="text-xs"
                data-testid="get-statement-btn"
              >
                <FileText size={14} className="mr-1.5" />
                Get Statement
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingActivities ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <History size={40} className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No transactions for {MONTHS[histMonth - 1]} {histYear}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    data-testid={`activity-${activity.id}`}
                    className={cn(
                      "p-3 rounded-lg border",
                      activity.activity_type === "credit" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {activity.activity_type === "credit" ? (
                          <ArrowUpCircle size={16} className="text-green-600" />
                        ) : (
                          <ArrowDownCircle size={16} className="text-red-600" />
                        )}
                        <span className={cn(
                          "font-semibold",
                          activity.activity_type === "credit" ? "text-green-700" : "text-red-700"
                        )}>
                          {activity.activity_type === "credit" ? "+" : "-"}{formatCurrency(activity.amount)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(activity.activity_date)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{activity.remarks}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>Before: {formatCurrency(activity.balance_before)}</span>
                      <span>After: {formatCurrency(activity.balance_after)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalaryHistoryPage;
