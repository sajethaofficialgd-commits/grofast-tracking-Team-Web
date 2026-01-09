import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BookOpen, 
  MessageSquare, 
  Calendar,
  Settings,
  LogOut,
  Bell,
  UserPlus,
  CheckSquare,
  Clock
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const AppSidebar = ({ activeView, onViewChange }: AppSidebarProps) => {
  const { user, userRole, signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const adminMenuItems = [
    { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
    { id: "team-members", title: "Team Members", icon: Users },
    { id: "team-details", title: "Team Details", icon: FileText },
    { id: "add-member", title: "Add Member", icon: UserPlus },
    { id: "approvals", title: "Approvals", icon: CheckSquare },
    { id: "calendar", title: "Calendar", icon: Calendar },
    { id: "chat", title: "Chat", icon: MessageSquare },
  ];

  const teamMenuItems = [
    { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
    { id: "work-update", title: "Work Update", icon: Clock },
    { id: "learning", title: "Learning", icon: BookOpen },
    { id: "chat", title: "Chat", icon: MessageSquare },
    { id: "calendar", title: "Calendar", icon: Calendar },
  ];

  const menuItems = userRole === "admin" ? adminMenuItems : teamMenuItems;
  const userInitials = user?.user_metadata?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-soft flex-shrink-0">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-foreground truncate">
                Grofast <span className="gradient-text">Digital</span>
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {userRole === "admin" ? "Admin Panel" : "Team Panel"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            {!isCollapsed && "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={activeView === item.id}
                    tooltip={item.title}
                    className={`transition-all duration-200 ${
                      activeView === item.id
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-muted"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            {!isCollapsed && "Quick Actions"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Notifications" className="hover:bg-muted">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                  <span className="ml-auto w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                    3
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings" className="hover:bg-muted">
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback className="gradient-bg text-primary-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.user_metadata?.full_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {userRole?.replace("_", " ") || "Member"}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
