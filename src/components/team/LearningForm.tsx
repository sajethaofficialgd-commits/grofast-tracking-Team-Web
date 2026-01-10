import { useState } from "react";
import { BookOpen, Clock, Link as LinkIcon, Plus, X, Save, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

const LearningForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    keyLearnings: "",
    startTime: "",
    endTime: "",
    links: [""],
    notes: "",
  });

  // Fetch today's learning updates
  const { data: todayLearning = [] } = useQuery({
    queryKey: ["today-learning", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("learning_updates")
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

    if (!formData.topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsLoading(true);

    const today = format(new Date(), "yyyy-MM-dd");
    const filteredLinks = formData.links.filter((link) => link.trim());

    const { error } = await supabase.from("learning_updates").insert({
      user_id: user.id,
      topic: formData.topic.trim(),
      description: formData.description.trim() || null,
      key_learnings: formData.keyLearnings.trim() || null,
      date: today,
      start_time: formData.startTime || null,
      end_time: formData.endTime || null,
      links: filteredLinks.length ? filteredLinks : null,
      notes: formData.notes.trim() || null,
    });

    setIsLoading(false);

    if (error) {
      toast.error("Failed to save learning update");
      console.error(error);
      return;
    }

    toast.success("Learning update saved!");
    setFormData({
      topic: "",
      description: "",
      keyLearnings: "",
      startTime: "",
      endTime: "",
      links: [""],
      notes: "",
    });
    queryClient.invalidateQueries({ queryKey: ["today-learning"] });
    queryClient.invalidateQueries({ queryKey: ["my-learning"] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("learning_updates").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted!");
    queryClient.invalidateQueries({ queryKey: ["today-learning"] });
    queryClient.invalidateQueries({ queryKey: ["my-learning"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Learning Updates</h1>
        <p className="text-muted-foreground">
          Track your learning journey and key takeaways
        </p>
      </div>

      {/* Add New Learning Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Log Learning Activity
          </CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Topic */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Topic / Subject *
              </label>
              <Input
                placeholder="What did you learn about?"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Description
              </label>
              <Textarea
                placeholder="Brief overview of what you studied..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Key Learnings */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Key Takeaways
              </label>
              <Textarea
                placeholder="What are the main things you learned? Key insights, concepts, or skills..."
                value={formData.keyLearnings}
                onChange={(e) => setFormData({ ...formData, keyLearnings: e.target.value })}
                rows={3}
              />
            </div>

            {/* Time Range (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Start Time (Optional)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  End Time (Optional)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Resource Links */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Resource Links
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
                  Add Resource Link
                </Button>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Additional Notes
              </label>
              <Textarea
                placeholder="Any other notes, questions, or areas to explore further..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Learning Update"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Today's Learning List */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Learning</CardTitle>
        </CardHeader>
        <CardContent>
          {todayLearning.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              No learning logged today. Start tracking your progress!
            </p>
          ) : (
            <div className="space-y-4">
              {todayLearning.map((learning) => (
                <div
                  key={learning.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        {learning.topic}
                      </h4>
                      {learning.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {learning.description}
                        </p>
                      )}
                      {learning.key_learnings && (
                        <div className="mt-2 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-foreground flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            {learning.key_learnings}
                          </p>
                        </div>
                      )}
                      {(learning.start_time || learning.end_time) && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {learning.start_time && learning.end_time
                            ? `${learning.start_time} - ${learning.end_time}`
                            : learning.start_time || learning.end_time}
                        </div>
                      )}
                      {learning.links && learning.links.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(learning.links as string[]).map((link, i) => (
                            <a
                              key={i}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <LinkIcon className="w-3 h-3" />
                              Resource {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(learning.id)}
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

export default LearningForm;
