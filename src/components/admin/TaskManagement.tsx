import { useState } from "react";
import { Plus, Calendar, Flag, User, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  project_id: string | null;
  created_at: string;
  assignee?: { full_name: string };
  project?: { name: string };
}

interface Profile {
  user_id: string;
  full_name: string;
}

interface Project {
  id: string;
  name: string;
}

const TaskManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    assignedTo: "",
    projectId: "",
    status: "pending",
  });

  // Fetch all tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (!tasksData) return [];

      // Fetch assignee profiles
      const assigneeIds = [...new Set(tasksData.map(t => t.assigned_to).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", assigneeIds as string[]);

      // Fetch projects
      const projectIds = [...new Set(tasksData.map(t => t.project_id).filter(Boolean))];
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds as string[]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

      return tasksData.map(task => ({
        ...task,
        assignee: task.assigned_to ? profileMap.get(task.assigned_to) : undefined,
        project: task.project_id ? projectMap.get(task.project_id) : undefined,
      })) as Task[];
    },
  });

  // Fetch team members
  const { data: members = [] } = useQuery({
    queryKey: ["team-members-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      return (data || []) as Profile[];
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      return (data || []) as Project[];
    },
  });

  const openCreateDialog = () => {
    setIsEditing(false);
    setSelectedTask(null);
    setFormData({ title: "", description: "", dueDate: "", assignedTo: "", projectId: "", status: "pending" });
    setShowDialog(true);
  };

  const openEditDialog = (task: Task) => {
    setIsEditing(true);
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      dueDate: task.due_date || "",
      assignedTo: task.assigned_to || "",
      projectId: task.project_id || "",
      status: task.status,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!user?.id || !formData.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && selectedTask) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            due_date: formData.dueDate || null,
            assigned_to: formData.assignedTo || null,
            project_id: formData.projectId || null,
            status: formData.status as "pending" | "in_progress" | "completed",
          })
          .eq("id", selectedTask.id);

        if (error) throw error;
        toast.success("Task updated!");
      } else {
        const { error } = await supabase.from("tasks").insert([{
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          due_date: formData.dueDate || null,
          assigned_to: formData.assignedTo || null,
          assigned_by: user.id,
          project_id: formData.projectId || null,
          status: formData.status as "pending" | "in_progress" | "completed",
        }]);

        if (error) throw error;
        toast.success("Task created!");
      }

      setShowDialog(false);
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
    } catch (error) {
      toast.error("Failed to save task");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      toast.error("Failed to delete");
      return;
    }

    toast.success("Task deleted");
    queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
  };

  const updateStatus = async (taskId: string, status: "pending" | "in_progress" | "completed") => {
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const pendingTasks = tasks.filter(t => t.status === "pending");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");

  const TaskCard = ({ task }: { task: Task }) => (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-foreground line-clamp-1">{task.title}</h4>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(task)}>
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(task.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {task.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
      )}
      <div className="flex flex-wrap gap-2 mb-2">
        {task.project && (
          <Badge variant="outline" className="text-xs">
            {task.project.name}
          </Badge>
        )}
        {task.due_date && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(task.due_date), "MMM d")}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs gradient-bg text-primary-foreground">
                {task.assignee.full_name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{task.assignee.full_name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
        <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v)}>
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">{tasks.length} total tasks</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <Tabs defaultValue="board" className="w-full">
        <TabsList>
          <TabsTrigger value="board">Board View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pending Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <h3 className="font-semibold">Pending</h3>
                <Badge variant="secondary">{pendingTasks.length}</Badge>
              </div>
              {pendingTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>

            {/* In Progress Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <h3 className="font-semibold">In Progress</h3>
                <Badge variant="secondary">{inProgressTasks.length}</Badge>
              </div>
              {inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>

            {/* Completed Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <h3 className="font-semibold">Completed</h3>
                <Badge variant="secondary">{completedTasks.length}</Badge>
              </div>
              {completedTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                    <div className={`w-3 h-3 rounded-full ${
                      task.status === "completed" ? "bg-green-500" :
                      task.status === "in_progress" ? "bg-blue-500" : "bg-yellow-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {task.assignee?.full_name || "Unassigned"}
                        {task.project && ` • ${task.project.name}`}
                      </p>
                    </div>
                    {task.due_date && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(task.due_date), "MMM d")}
                      </span>
                    )}
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(task)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(task.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Task description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Assign To</label>
              <Select
                value={formData.assignedTo}
                onValueChange={(v) => setFormData({ ...formData, assignedTo: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Project</label>
              <Select
                value={formData.projectId}
                onValueChange={(v) => setFormData({ ...formData, projectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagement;
