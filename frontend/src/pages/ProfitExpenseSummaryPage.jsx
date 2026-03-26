import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
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
  TrendingUp,
  CalendarIcon,
  Loader2,
  CheckCircle2,
  Receipt,
  Car,
  Banknote,
  ArrowDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ProfitExpenseSummaryPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await api.get(`/profit-expense-summary?date=${dateStr}`);
      setData(response.data.data);
    } catch (error) {
      console.error("Error fetching profit expense summary:", error);
      toast.error("Failed to fetch summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  return (
    <div className="space-y-6" data-testid="profit-expense-summary-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-950">Profit & Expense Summary</h1>
          <p className="text-muted-foreground text-sm">Daily gross profit and detailed expense breakdown</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="date-picker-btn">
              <CalendarIcon size={16} className="mr-2" />
              {format(selectedDate, "dd MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : !data ? (
        <div className="text-center py-24 text-muted-foreground">No data available for this date</div>
      ) : (
        <div className="space-y-6">
          {/* Submitted badge */}
          {data.is_submitted && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2 w-fit">
              <CheckCircle2 size={16} />
              Summary submitted on {format(selectedDate, "dd MMM yyyy")}
            </div>
          )}

          {/* Gross Profit Card */}
          <Card className="border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-muted-foreground">Gross Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-purple-600">{formatCurrency(data.gross_profit)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total Sale {formatCurrency(data.total_sale)} - COGS {formatCurrency(data.net_purchase)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Breakdown */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ArrowDown size={18} className="text-red-500" />
              Expenses Breakdown
            </h2>

            {/* General Expenses */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-orange-500" />
                    General Expenses
                  </div>
                  <span className="text-orange-600 font-bold">{formatCurrency(data.general_total)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.general_expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No expenses</p>
                ) : (
                  <div className="divide-y">
                    {data.general_expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium">{exp.category || "General"}</p>
                          {exp.description && <p className="text-xs text-muted-foreground">{exp.description}</p>}
                        </div>
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transportation Expenses */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car size={18} className="text-blue-500" />
                    Transportation Expenses
                  </div>
                  <span className="text-blue-600 font-bold">{formatCurrency(data.transportation_total)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.transportation_expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No transportation expenses</p>
                ) : (
                  <div className="divide-y">
                    {data.transportation_expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium">{exp.description}</p>
                          {exp.comments && <p className="text-xs text-muted-foreground">{exp.comments}</p>}
                        </div>
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Salary Expenses */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote size={18} className="text-green-500" />
                    Salary Expenses
                  </div>
                  <span className="text-green-600 font-bold">{formatCurrency(data.salary_total)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.salary_expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No salary expenses</p>
                ) : (
                  <div className="divide-y">
                    {data.salary_expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium">{exp.description}</p>
                          {exp.remarks && <p className="text-xs text-muted-foreground">{exp.remarks}</p>}
                        </div>
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Salesman Expenses */}
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-purple-500" />
                    Salesman Expenses
                  </div>
                  <span className="text-purple-600 font-bold">{formatCurrency(data.salesman_expense_total || 0)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!data.salesman_expenses || data.salesman_expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No salesman expenses</p>
                ) : (
                  <div className="divide-y">
                    {data.salesman_expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium">{exp.description}</p>
                          <div className="flex gap-3 mt-0.5">
                            {exp.food_expense > 0 && <span className="text-[11px] text-muted-foreground">Food: {formatCurrency(exp.food_expense)}</span>}
                            {exp.diesel_expense > 0 && <span className="text-[11px] text-muted-foreground">Diesel: {formatCurrency(exp.diesel_expense)}</span>}
                            {exp.other_expense > 0 && <span className="text-[11px] text-muted-foreground">Other: {formatCurrency(exp.other_expense)}</span>}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Total Expenses + Net Profit */}
          <div className="space-y-3">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-5 pb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    General ({formatCurrency(data.general_total)}) + Transportation ({formatCurrency(data.transportation_total)}) + Salary ({formatCurrency(data.salary_total)}) + Salesman ({formatCurrency(data.salesman_expense_total || 0)})
                  </p>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(data.total_expenses)}</p>
              </CardContent>
            </Card>

            <Card className={cn("border-2", data.net_profit >= 0 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50")}>
              <CardContent className="pt-5 pb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Gross Profit ({formatCurrency(data.gross_profit)}) - Total Expenses ({formatCurrency(data.total_expenses)})
                  </p>
                </div>
                <p className={cn("text-3xl font-bold", data.net_profit >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(data.net_profit)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitExpenseSummaryPage;
