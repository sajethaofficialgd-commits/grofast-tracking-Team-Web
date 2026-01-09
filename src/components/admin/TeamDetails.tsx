import { Users, Mail, Phone, Building, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TeamDetails = () => {
  const { data: members = [] } = useQuery({
    queryKey: ["team-details"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("department", { ascending: true });
      return data || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data || [];
    },
  });

  // Group members by department
  const groupedMembers = members.reduce((acc: Record<string, typeof members>, member) => {
    const dept = member.department || "Unassigned";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(member);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team Details</h1>
        <p className="text-muted-foreground">Contact information for all team members</p>
      </div>

      {/* Department Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {departments.map((dept: any) => (
          <Card key={dept.id} className="card-elevated">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium text-sm">{dept.name}</h3>
              <p className="text-2xl font-bold text-primary mt-1">
                {groupedMembers[dept.name]?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">members</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Members by Department */}
      <div className="space-y-6">
        {Object.entries(groupedMembers).map(([department, deptMembers]) => (
          <Card key={department} className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                {department}
                <Badge variant="secondary" className="ml-2">
                  {deptMembers.length} members
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptMembers.map((member: any) => (
                  <div
                    key={member.id}
                    className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="gradient-bg text-primary-foreground">
                          {member.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{member.full_name}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.designation || "Team Member"}
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TeamDetails;
