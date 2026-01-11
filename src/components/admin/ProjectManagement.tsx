import { useState } from "react";
import { Plus, Calendar, Users, Folder, Edit2, Trash2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_at: string;
  members?: { user_id: string; full_name: string }[];
}

interface Profile {
  user_id: string;
  full_name: string;
  designation: string | null;
}

const ProjectManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "active",
  });

  // Fetch projects with members
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!projectsData) return [];

      // Fetch members for each project
      const { data: membersData } = await supabase
        .from("project_members")
        .select("project_id, user_id");

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return projectsData.map(project => ({
        ...project,
        members: (membersData || [])
          .filter(m => m.project_id === project.id)
          .map(m => ({
            user_id: m.user_id,
            full_name: profileMap.get(m.user_id) || "Unknown",
          })),
      })) as Project[];
    },
  });

  // Fetch all team members for assignment
  const { data: allMembers = [] } = useQuery({
    queryKey: ["all-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, designation")
        .order("full_name");
      return (data || []) as Profile[];
    },
  });

  const openCreateDialog = () => {
    setIsEditing(false);
    setSelectedProject(null);
    setFormData({ name: "", description: "", startDate: "", endDate: "", status: "active" });
    setSelectedMembers([]);
    setShowDialog(true);
  };

  const openEditDialog = (project: Project) => {
    setIsEditing(true);
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || "",
      startDate: project.start_date || "",
      endDate: project.end_date || "",
      status: project.status,
    });
    setSelectedMembers(project.members?.map(m => m.user_id) || []);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!user?.id || !formData.name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing && selectedProject) {
        // Update project
        const { error } = await supabase
          .from("projects")
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            start_date: formData.startDate || null,
            end_date: formData.endDate || null,
            status: formData.status,
          })
          .eq("id", selectedProject.id);

        if (error) throw error;

        // Update members
        await supabase
          .from("project_members")
          .delete()
          .eq("project_id", selectedProject.id);

        if (selectedMembers.length > 0) {
          await supabase.from("project_members").insert(
            selectedMembers.map(userId => ({
              project_id: selectedProject.id,
              user_id: userId,
            }))
          );
        }

        toast.success("Project updated!");
      } else {
        // Create project
        const { data: newProject, error } = await supabase
          .from("projects")
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            start_date: formData.startDate || null,
            end_date: formData.endDate || null,
            status: formData.status,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Add members
        if (selectedMembers.length > 0 && newProject) {
          await supabase.from("project_members").insert(
            selectedMembers.map(userId => ({
              project_id: newProject.id,
              user_id: userId,
            }))
          );
        }

        toast.success("Project created!");
      }

      setShowDialog(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (error) {
      toast.error("Failed to save project");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      toast.error("Failed to delete project");
      return;
    }

    toast.success("Project deleted");
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const updateProgress = async (projectId: string, progress: number) => {
    const { error } = await supabase
      .from("projects")
      .update({ progress })
      .eq("id", projectId);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-green-100 text-green-700";
      case "on_hold": return "bg-yellow-100 text-yellow-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">{projects.length} projects</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="card-elevated hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg truncate flex-1">{project.name}</CardTitle>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
              
              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              {/* Dates */}
              {(project.start_date || project.end_date) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {project.start_date && format(new Date(project.start_date), "MMM d")}
                  {project.start_date && project.end_date && " - "}
                  {project.end_date && format(new Date(project.end_date), "MMM d, yyyy")}
                </div>
              )}

              {/* Members */}
              {project.members && project.members.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div className="flex -space-x-2">
                    {project.members.slice(0, 4).map((member) => (
                      <Avatar key={member.user_id} className="w-7 h-7 border-2 border-background">
                        <AvatarFallback className="text-xs gradient-bg text-primary-foreground">
                          {member.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {project.members.length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                        +{project.members.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(project)}
                  className="flex-1"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateProgress(project.id, Math.min(100, project.progress + 10))}
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(project.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No projects yet. Create your first project!</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Project Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Assign Members</label>
              <ScrollArea className="h-40 border rounded-lg p-2">
                <div className="space-y-2">
                  {allMembers.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                      onClick={() => toggleMember(member.user_id)}
                    >
                      <Checkbox checked={selectedMembers.includes(member.user_id)} />
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs gradient-bg text-primary-foreground">
                          {member.full_name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{member.full_name}</p>
                        {member.designation && (
                          <p className="text-xs text-muted-foreground">{member.designation}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectManagement;
