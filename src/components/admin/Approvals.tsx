import { Check, X, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

const Approvals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: approvals = [] } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("approvals")
        .select(`
          *,
          profiles:user_id (full_name, email, designation)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateApproval = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("approvals")
        .update({ status, approved_by: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Approval updated");
    },
    onError: () => {
      toast.error("Failed to update approval");
    },
  });

  const pendingApprovals = approvals.filter((a: any) => a.status === "pending");
  const processedApprovals = approvals.filter((a: any) => a.status !== "pending");

  const statusColors: Record<string, string> = {
    pending: "bg-warning text-warning-foreground",
    approved: "bg-success text-success-foreground",
    rejected: "bg-destructive text-destructive-foreground",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
        <p className="text-muted-foreground">Manage pending approval requests</p>
      </div>

      {/* Pending Approvals */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            Pending Approvals
            <Badge variant="secondary">{pendingApprovals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length > 0 ? (
            <div className="space-y-4">
              {pendingApprovals.map((approval: any) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="gradient-bg text-primary-foreground">
                        {approval.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{approval.profiles?.full_name || "Unknown"}</h4>
                      <p className="text-sm text-muted-foreground">
                        {approval.type} • {format(new Date(approval.created_at), "MMM d, yyyy")}
                      </p>
                      {approval.description && (
                        <p className="text-sm text-muted-foreground mt-1">{approval.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => updateApproval.mutate({ id: approval.id, status: "rejected" })}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90"
                      onClick={() => updateApproval.mutate({ id: approval.id, status: "approved" })}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No pending approvals</p>
          )}
        </CardContent>
      </Card>

      {/* Processed Approvals */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Recent Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          {processedApprovals.length > 0 ? (
            <div className="space-y-3">
              {processedApprovals.slice(0, 10).map((approval: any) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {approval.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{approval.profiles?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{approval.type}</p>
                    </div>
                  </div>
                  <Badge className={statusColors[approval.status]}>{approval.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No processed approvals yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Approvals;
