import { useEffect, useState } from "react";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  BookOpen,
  FileText,
  Play,
  Pause
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

const TeamDashboard = () => {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  // Fetch today's attendance
  const { data: todayAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ["today-attendance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch tasks assigned to user
  const { data: tasks = [] } = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent work updates
  const { data: recentWorkUpdates = [] } = useQuery({
    queryKey: ["my-work-updates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("work_updates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent learning updates
  const { data: recentLearning = [] } = useQuery({
    queryKey: ["my-learning", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("learning_updates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (todayAttendance?.check_in && !todayAttendance?.check_out) {
      setIsCheckedIn(true);
      setCheckInTime(todayAttendance.check_in);
    }
  }, [todayAttendance]);

  // Update elapsed time
  useEffect(() => {
    if (!isCheckedIn || !checkInTime) return;

    const interval = setInterval(() => {
      const start = new Date(checkInTime).getTime();
      const now = Date.now();
      const diff = now - start;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime]);

  const handleCheckIn = async () => {
    if (!user?.id) return;
    
    const now = new Date().toISOString();
    const today = format(new Date(), "yyyy-MM-dd");

    const { error } = await supabase.from("attendance").insert({
      user_id: user.id,
      date: today,
      check_in: now,
      status: "present",
    });

    if (error) {
      toast.error("Failed to check in");
      return;
    }

    setIsCheckedIn(true);
    setCheckInTime(now);
    toast.success("Checked in successfully!");
    refetchAttendance();
  };

  const handleCheckOut = async () => {
    if (!user?.id || !todayAttendance?.id) return;

    const now = new Date().toISOString();
    const checkIn = new Date(checkInTime!).getTime();
    const hoursWorked = (Date.now() - checkIn) / (1000 * 60 * 60);

    const { error } = await supabase
      .from("attendance")
      .update({
        check_out: now,
        hours_worked: parseFloat(hoursWorked.toFixed(2)),
      })
      .eq("id", todayAttendance.id);

    if (error) {
      toast.error("Failed to check out");
      return;
    }

    setIsCheckedIn(false);
    toast.success("Checked out successfully!");
    refetchAttendance();
  };

  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.user_metadata?.full_name || "Team Member"}!
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Time Tracker Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center">
                <Clock className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Work Time</p>
                <p className="text-4xl font-bold text-foreground font-mono">
                  {isCheckedIn ? elapsedTime : todayAttendance?.hours_worked 
                    ? `${todayAttendance.hours_worked.toFixed(2)} hrs` 
                    : "00:00:00"}
                </p>
                {checkInTime && isCheckedIn && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Checked in at {format(new Date(checkInTime), "h:mm a")}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
              size="lg"
              className={isCheckedIn 
                ? "bg-destructive hover:bg-destructive/90" 
                : "bg-green-600 hover:bg-green-700"
              }
            >
              {isCheckedIn ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Check Out
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Check In
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingTasks}</p>
              <p className="text-sm text-muted-foreground">Pending Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressTasks}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{recentLearning.length}</p>
              <p className="text-sm text-muted-foreground">Learnings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Updates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Recent Work Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentWorkUpdates.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No work updates yet. Start logging your work!
              </p>
            ) : (
              <div className="space-y-3">
                {recentWorkUpdates.map((update) => (
                  <div key={update.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground">{update.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(update.date), "MMM d")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {update.description || "No description"}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {update.start_time} - {update.end_time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Learning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-primary" />
              Recent Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLearning.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No learning logs yet. Start tracking your learning!
              </p>
            ) : (
              <div className="space-y-3">
                {recentLearning.map((learning) => (
                  <div key={learning.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground">{learning.topic}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(learning.date), "MMM d")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {learning.key_learnings || learning.description || "No notes"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No tasks assigned yet.
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      task.status === "completed" ? "bg-green-500" :
                      task.status === "in_progress" ? "bg-blue-500" :
                      "bg-yellow-500"
                    }`} />
                    <div>
                      <h4 className="font-medium text-foreground">{task.title}</h4>
                      {task.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    task.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    task.status === "in_progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}>
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDashboard;
