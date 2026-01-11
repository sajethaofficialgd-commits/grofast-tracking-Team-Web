import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

const COLORS = ["#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState("7");

  // Fetch attendance data for charts
  const { data: attendanceData = [] } = useQuery({
    queryKey: ["attendance-analytics", timeRange],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(timeRange)), "yyyy-MM-dd");
      const { data } = await supabase
        .from("attendance_sessions")
        .select("date, duration_minutes, user_id")
        .gte("date", startDate)
        .order("date");
      return data || [];
    },
  });

  // Fetch task data for charts
  const { data: taskData = [] } = useQuery({
    queryKey: ["task-analytics"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("status, created_at");
      return data || [];
    },
  });

  // Fetch leave data for charts
  const { data: leaveData = [] } = useQuery({
    queryKey: ["leave-analytics"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests").select("status, type");
      return data || [];
    },
  });

  // Fetch profiles for team data
  const { data: profileData = [] } = useQuery({
    queryKey: ["profile-analytics"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("status, department");
      return data || [];
    },
  });

  // Process attendance data by date
  const attendanceByDate = eachDayOfInterval({
    start: subDays(new Date(), parseInt(timeRange) - 1),
    end: new Date(),
  }).map(date => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayData = attendanceData.filter((a: any) => a.date === dateStr);
    const totalHours = dayData.reduce((acc: number, a: any) => acc + (a.duration_minutes || 0), 0) / 60;
    const uniqueUsers = new Set(dayData.map((a: any) => a.user_id)).size;
    return {
      date: format(date, "MMM d"),
      hours: parseFloat(totalHours.toFixed(1)),
      members: uniqueUsers,
    };
  });

  // Task status distribution
  const taskStatusData = [
    { name: "Pending", value: taskData.filter((t: any) => t.status === "pending").length },
    { name: "In Progress", value: taskData.filter((t: any) => t.status === "in_progress").length },
    { name: "Completed", value: taskData.filter((t: any) => t.status === "completed").length },
  ].filter(d => d.value > 0);

  // Leave status distribution
  const leaveStatusData = [
    { name: "Pending", value: leaveData.filter((l: any) => l.status === "pending").length },
    { name: "Approved", value: leaveData.filter((l: any) => l.status === "approved").length },
    { name: "Rejected", value: leaveData.filter((l: any) => l.status === "rejected").length },
  ].filter(d => d.value > 0);

  // Team status distribution
  const teamStatusData = [
    { name: "Active", value: profileData.filter((p: any) => p.status === "active").length },
    { name: "Away", value: profileData.filter((p: any) => p.status === "away").length },
    { name: "Busy", value: profileData.filter((p: any) => p.status === "busy").length },
    { name: "Offline", value: profileData.filter((p: any) => !p.status || p.status === "offline").length },
  ].filter(d => d.value > 0);

  // Department distribution
  const departmentCounts = profileData.reduce((acc: Record<string, number>, p: any) => {
    const dept = p.department || "Unassigned";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});
  const departmentData = Object.entries(departmentCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Team performance overview</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-6 space-y-6">
          {/* Hours Trend */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Daily Working Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceByDate}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Members Present */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Daily Active Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceByDate}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="members" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {taskStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Task Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {taskStatusData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-2xl font-bold">{item.value}</span>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Tasks</span>
                    <span className="text-2xl font-bold">{taskData.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Team Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={teamStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {teamStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Leave Request Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leaveStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {leaveStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Leave Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {leaveStatusData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-2xl font-bold">{item.value}</span>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Requests</span>
                    <span className="text-2xl font-bold">{leaveData.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
