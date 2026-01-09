import { Users, CheckSquare, Clock, Calendar, TrendingUp, UserCheck, UserX, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const [profiles, tasks, attendance, approvals] = await Promise.all([
        supabase.from("profiles").select("id, status"),
        supabase.from("tasks").select("id, status"),
        supabase.from("attendance").select("id, status").eq("date", today),
        supabase.from("approvals").select("id, status").eq("status", "pending"),
      ]);

      const totalMembers = profiles.data?.length || 0;
      const activeMembers = profiles.data?.filter(p => p.status === "active").length || 0;
      const awayMembers = profiles.data?.filter(p => p.status === "away" || p.status === "busy").length || 0;
      
      const totalTasks = tasks.data?.length || 0;
      const completedTasks = tasks.data?.filter(t => t.status === "completed").length || 0;
      const inProgressTasks = tasks.data?.filter(t => t.status === "in_progress").length || 0;
      
      const todayPresent = attendance.data?.filter(a => a.status === "present").length || 0;
      const todayAbsent = attendance.data?.filter(a => a.status === "absent").length || 0;
      
      const pendingApprovals = approvals.data?.length || 0;

      return {
        totalMembers,
        activeMembers,
        awayMembers,
        totalTasks,
        completedTasks,
        inProgressTasks,
        todayPresent,
        todayAbsent,
        pendingApprovals,
        avgHours: 7.5,
      };
    },
  });

  const statCards = [
    {
      title: "Team Members",
      value: stats?.totalMembers || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Tasks",
      value: stats?.totalTasks || 0,
      icon: CheckSquare,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
    {
      title: "In Progress",
      value: stats?.inProgressTasks || 0,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Completed",
      value: stats?.completedTasks || 0,
      icon: ClipboardCheck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Avg Hours",
      value: `${stats?.avgHours || 0}h`,
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Present Today",
      value: stats?.todayPresent || 0,
      icon: UserCheck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Absent Today",
      value: stats?.todayAbsent || 0,
      icon: UserX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Pending Approvals",
      value: stats?.pendingApprovals || 0,
      icon: Calendar,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your team's performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="card-elevated hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">Team Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-success rounded-full" />
                  <span className="text-sm text-muted-foreground">Active Members</span>
                </div>
                <span className="font-semibold">{stats?.activeMembers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-warning rounded-full" />
                  <span className="text-sm text-muted-foreground">Away/Busy</span>
                </div>
                <span className="font-semibold">{stats?.awayMembers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-muted-foreground rounded-full" />
                  <span className="text-sm text-muted-foreground">Offline</span>
                </div>
                <span className="font-semibold">
                  {(stats?.totalMembers || 0) - (stats?.activeMembers || 0) - (stats?.awayMembers || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">Task Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-semibold">
                    {stats?.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats?.totalTasks ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-muted-foreground">
                    {stats?.totalTasks ? stats.totalTasks - stats.completedTasks - stats.inProgressTasks : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning">{stats?.inProgressTasks || 0}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">{stats?.completedTasks || 0}</p>
                  <p className="text-xs text-muted-foreground">Done</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
