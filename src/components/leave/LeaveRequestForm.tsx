import { useState } from "react";
import { Calendar, Clock, FileText, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

interface LeaveRequest {
  id: string;
  type: "full_day" | "half_day" | "permission";
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
  created_at: string;
}

const LeaveRequestForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "full_day" as "full_day" | "half_day" | "permission",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  // Fetch user's leave requests
  const { data: requests = [] } = useQuery({
    queryKey: ["my-leave-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return (data || []) as LeaveRequest[];
    },
    enabled: !!user?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.startDate || !formData.reason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.type === "permission" && (!formData.startTime || !formData.endTime)) {
      toast.error("Please specify time range for permission");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.from("leave_requests").insert({
      user_id: user.id,
      type: formData.type,
      start_date: formData.startDate,
      end_date: formData.type === "full_day" && formData.endDate ? formData.endDate : formData.startDate,
      start_time: formData.type === "permission" ? formData.startTime : null,
      end_time: formData.type === "permission" ? formData.endTime : null,
      reason: formData.reason.trim(),
    });

    setIsLoading(false);

    if (error) {
      toast.error("Failed to submit request");
      console.error(error);
      return;
    }

    toast.success("Leave request submitted!");
    setFormData({
      type: "full_day",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      reason: "",
    });
    queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "full_day": return "Full Day Leave";
      case "half_day": return "Half Day Leave";
      case "permission": return "Permission";
      default: return type;
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leave & Permission</h1>
        <p className="text-muted-foreground">
          Apply for leave or request permission for time off
        </p>
      </div>

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            New Request
          </CardTitle>
          <CardDescription>Submit a new leave or permission request</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Request Type */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Request Type *
              </label>
              <Select
                value={formData.type}
                onValueChange={(value: "full_day" | "half_day" | "permission") => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">Full Day Leave</SelectItem>
                  <SelectItem value="half_day">Half Day Leave</SelectItem>
                  <SelectItem value="permission">Permission (Hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {formData.type === "permission" ? "Date *" : "Start Date *"}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {formData.type === "full_day" && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    End Date (Optional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="pl-10"
                      min={formData.startDate}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Time Range for Permission */}
            {formData.type === "permission" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    From Time *
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
                    To Time *
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
            )}

            {/* Reason */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Reason *
              </label>
              <Textarea
                placeholder="Please provide the reason for your request..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 rounded-lg border bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <span className="text-sm font-medium">{getTypeLabel(request.type)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.start_date), "MMM d, yyyy")}
                      {request.end_date && request.end_date !== request.start_date && (
                        <> - {format(new Date(request.end_date), "MMM d, yyyy")}</>
                      )}
                      {request.start_time && request.end_time && (
                        <> ({request.start_time} - {request.end_time})</>
                      )}
                    </p>
                    <p className="text-sm mt-2">{request.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request History</CardTitle>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              No processed requests yet
            </p>
          ) : (
            <div className="space-y-3">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        <span className="text-sm font-medium">{getTypeLabel(request.type)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.start_date), "MMM d, yyyy")}
                        {request.end_date && request.end_date !== request.start_date && (
                          <> - {format(new Date(request.end_date), "MMM d, yyyy")}</>
                        )}
                      </p>
                      <p className="text-sm mt-1">{request.reason}</p>
                      {request.review_notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          Note: {request.review_notes}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), "MMM d")}
                    </span>
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

export default LeaveRequestForm;
