import { useState } from "react";
import { Calendar, Check, X, Clock, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

interface LeaveRequest {
  id: string;
  user_id: string;
  type: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  status: string;
  review_notes: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    designation: string | null;
    department: string | null;
  };
}

const LeaveApprovals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch all leave requests
  const { data: requests = [] } = useQuery({
    queryKey: ["all-leave-requests", filter],
    queryFn: async () => {
      let query = supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data } = await query;
      
      if (!data) return [];

      // Fetch profiles for requests
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, designation, department")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(r => ({
        ...r,
        profile: profileMap.get(r.user_id),
      })) as LeaveRequest[];
    },
  });

  const handleApprove = async (request: LeaveRequest) => {
    if (!user?.id) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "approved",
        reviewed_by: user.id,
      })
      .eq("id", request.id);

    setIsProcessing(false);

    if (error) {
      toast.error("Failed to approve request");
      return;
    }

    toast.success("Request approved!");
    queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
  };

  const openRejectDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!user?.id || !selectedRequest || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsProcessing(true);

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        review_notes: rejectReason.trim(),
      })
      .eq("id", selectedRequest.id);

    setIsProcessing(false);

    if (error) {
      toast.error("Failed to reject request");
      return;
    }

    toast.success("Request rejected");
    setShowRejectDialog(false);
    setSelectedRequest(null);
    queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "full_day": return "Full Day Leave";
      case "half_day": return "Half Day Leave";
      case "permission": return "Permission";
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-yellow-100 text-yellow-700";
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Approvals</h1>
          <p className="text-muted-foreground">
            {pendingCount} pending request{pendingCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center">
                No {filter === "all" ? "" : filter} requests found
              </p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="gradient-bg text-primary-foreground">
                      {request.profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {request.profile?.full_name || "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.profile?.designation || request.profile?.department || "Team Member"}
                        </p>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <div className="mt-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(request.start_date), "MMM d, yyyy")}
                          {request.end_date && request.end_date !== request.start_date && (
                            <> - {format(new Date(request.end_date), "MMM d, yyyy")}</>
                          )}
                        </span>
                        {request.start_time && request.end_time && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {request.start_time} - {request.end_time}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{request.reason}</p>
                      {request.review_notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          Note: {request.review_notes}
                        </p>
                      )}
                    </div>
                    {request.status === "pending" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request)}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(request)}
                          disabled={isProcessing}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this request. This will be visible to the employee.
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || isProcessing}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveApprovals;
