import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  History,
  CalendarDays,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Banknote,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

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

  const fetchActivities = async () => {
    try {
      setLoadingActivities(true);
      const response = await api.get(`/salary-setup/${setupId}/activities?limit=500`);
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
    fetchActivities();
  }, [setupId]);

  useEffect(() => {
    if (setup) {
      fetchAttendance(calMonth, calYear);
    }
  }, [setup, calMonth, calYear]);

  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  // Build calendar grid
  const buildCalendarGrid = () => {
    if (!attendance) return [];
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
    const rows = [];
    let currentRow = new Array(firstDay).fill(null);

    for (const d of attendance.days) {
      currentRow.push(d);
      if (currentRow.length === 7) {
        rows.push(currentRow);
        currentRow = [];
      }
    }
    if (currentRow.length > 0) {
      while (currentRow.length < 7) currentRow.push(null);
      rows.push(currentRow);
    }
    return rows;
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
            <p className="text-xs text-muted-foreground">
              {MONTHS[calMonth - 1]} Attendance
            </p>
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
                {/* Legend */}
                <div className="flex items-center gap-4 mb-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-green-500"></span> Present ({attendance?.present_count || 0})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-400"></span> Absent ({attendance?.absent_count || 0})
                  </span>
                </div>

                {/* Calendar grid */}
                <div className="border rounded-lg overflow-hidden">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 bg-gray-100 border-b">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Day cells */}
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
                            <div className="flex flex-col items-center">
                              <span className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium",
                                cell.status === "present" && "bg-green-500 text-white",
                                cell.status === "absent" && "bg-red-400 text-white"
                              )}>
                                {cell.day}
                              </span>
                            </div>
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
            <CardTitle className="text-lg flex items-center gap-2">
              <History size={20} className="text-purple-600" />
              Balance History ({activities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingActivities ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <History size={40} className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No activity history found</p>
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
