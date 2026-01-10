import { useState } from "react";
import { Clock, FileText, Link as LinkIcon, Plus, X, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

const WorkUpdateForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    links: [""],
  });

  // Fetch today's work updates
  const { data: todayUpdates = [] } = useQuery({
    queryKey: ["today-work-updates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("work_updates")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleAddLink = () => {
    setFormData({ ...formData, links: [...formData.links, ""] });
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = formData.links.filter((_, i) => i !== index);
    setFormData({ ...formData, links: newLinks.length ? newLinks : [""] });
  };

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...formData.links];
    newLinks[index] = value;
    setFormData({ ...formData, links: newLinks });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.title.trim()) {
      toast.error("Please enter a title for your work update");
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      toast.error("Please enter start and end times");
      return;
    }

    setIsLoading(true);

    const today = format(new Date(), "yyyy-MM-dd");
    const filteredLinks = formData.links.filter((link) => link.trim());

    const { error } = await supabase.from("work_updates").insert({
      user_id: user.id,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      date: today,
      start_time: formData.startTime,
      end_time: formData.endTime,
      links: filteredLinks.length ? filteredLinks : null,
    });

    setIsLoading(false);

    if (error) {
      toast.error("Failed to save work update");
      console.error(error);
      return;
    }

    toast.success("Work update saved!");
    setFormData({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      links: [""],
    });
    queryClient.invalidateQueries({ queryKey: ["today-work-updates"] });
    queryClient.invalidateQueries({ queryKey: ["my-work-updates"] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("work_updates").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted!");
    queryClient.invalidateQueries({ queryKey: ["today-work-updates"] });
    queryClient.invalidateQueries({ queryKey: ["my-work-updates"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Work Updates</h1>
        <p className="text-muted-foreground">
          Log your daily work activities and progress
        </p>
      </div>

      {/* Add New Update Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Add Work Update
          </CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Task Title *
              </label>
              <Input
                placeholder="What did you work on?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Start Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  End Time *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Description
              </label>
              <Textarea
                placeholder="Describe what you accomplished, challenges faced, etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Links */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Related Links
              </label>
              <div className="space-y-2">
                {formData.links.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={link}
                        onChange={(e) => handleLinkChange(index, e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {formData.links.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveLink(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLink}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Work Update"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Today's Updates List */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Updates</CardTitle>
        </CardHeader>
        <CardContent>
          {todayUpdates.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              No updates logged today. Add your first update above!
            </p>
          ) : (
            <div className="space-y-4">
              {todayUpdates.map((update) => (
                <div
                  key={update.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{update.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {update.start_time} - {update.end_time}
                      </div>
                      {update.description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {update.description}
                        </p>
                      )}
                      {update.links && update.links.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(update.links as string[]).map((link, i) => (
                            <a
                              key={i}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <LinkIcon className="w-3 h-3" />
                              Link {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(update.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkUpdateForm;
