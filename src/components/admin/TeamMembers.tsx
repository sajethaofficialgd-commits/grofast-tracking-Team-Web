import { useState } from "react";
import { Users } from "lucide-react";
import { Search, Circle, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  status: string | null;
}

const TeamMembers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      return data as Profile[] || [];
    },
  });

  const { data: memberDetails } = useQuery({
    queryKey: ["member-details", selectedMember?.user_id],
    enabled: !!selectedMember,
    queryFn: async () => {
      if (!selectedMember) return null;
      
      const today = new Date().toISOString().split("T")[0];
      const [workUpdates, learnings, attendance] = await Promise.all([
        supabase
          .from("work_updates")
          .select("*")
          .eq("user_id", selectedMember.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("learning_updates")
          .select("*")
          .eq("user_id", selectedMember.user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("attendance")
          .select("*")
          .eq("user_id", selectedMember.user_id)
          .order("date", { ascending: false })
          .limit(30),
      ]);

      return {
        workUpdates: workUpdates.data || [],
        learnings: learnings.data || [],
        attendance: attendance.data || [],
      };
    },
  });

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    active: "bg-success",
    away: "bg-warning",
    busy: "bg-destructive",
    offline: "bg-muted-foreground",
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      {/* Members List */}
      <Card className="w-96 card-elevated flex-shrink-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Team Members</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-1 px-4 pb-4">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedMember?.id === member.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={selectedMember?.id === member.id ? "bg-primary-foreground/20 text-primary-foreground" : "gradient-bg text-primary-foreground"}>
                        {member.full_name.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[member.status || "offline"]} rounded-full border-2 border-card`}
                      fill="currentColor"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.full_name}</p>
                    <p className={`text-xs truncate ${selectedMember?.id === member.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {member.designation || member.department || "Team Member"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Member Details */}
      <Card className="flex-1 card-elevated">
        {selectedMember ? (
          <>
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="gradient-bg text-primary-foreground text-xl">
                      {selectedMember.full_name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{selectedMember.full_name}</CardTitle>
                    <p className="text-muted-foreground">{selectedMember.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {selectedMember.department || "No Department"}
                      </Badge>
                      <Badge className={`${statusColors[selectedMember.status || "offline"]} text-white capitalize`}>
                        {selectedMember.status || "offline"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="work" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b h-12 bg-transparent px-4">
                  <TabsTrigger value="work" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Work Updates
                  </TabsTrigger>
                  <TabsTrigger value="learning" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Learning
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    Attendance
                  </TabsTrigger>
                </TabsList>
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <TabsContent value="work" className="p-4 space-y-3 mt-0">
                    {memberDetails?.workUpdates.length ? (
                      memberDetails.workUpdates.map((update: any) => (
                        <div key={update.id} className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{update.title}</h4>
                            <Badge variant="outline">
                              {update.start_time} - {update.end_time}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{update.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(update.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No work updates yet</p>
                    )}
                  </TabsContent>
                  <TabsContent value="learning" className="p-4 space-y-3 mt-0">
                    {memberDetails?.learnings.length ? (
                      memberDetails.learnings.map((learning: any) => (
                        <div key={learning.id} className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">{learning.topic}</h4>
                          {learning.key_learnings && (
                            <p className="text-sm text-muted-foreground">{learning.key_learnings}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(learning.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No learning updates yet</p>
                    )}
                  </TabsContent>
                  <TabsContent value="attendance" className="p-4 mt-0">
                    <div className="space-y-2">
                      {memberDetails?.attendance.length ? (
                        memberDetails.attendance.map((record: any) => (
                          <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="font-medium">{format(new Date(record.date), "MMM d, yyyy")}</span>
                            <Badge className={
                              record.status === "present" ? "bg-success" :
                              record.status === "absent" ? "bg-destructive" :
                              "bg-warning"
                            }>
                              {record.status}
                            </Badge>
                            {record.hours_worked && (
                              <span className="text-sm text-muted-foreground">{record.hours_worked}h</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-8">No attendance records</p>
                      )}
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Select a team member to view their details</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TeamMembers;
