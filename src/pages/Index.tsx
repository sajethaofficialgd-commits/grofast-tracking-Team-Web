import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import LoginPage from "@/components/auth/LoginPage";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import { useState } from "react";
import AdminDashboard from "@/components/admin/AdminDashboard";
import TeamMembers from "@/components/admin/TeamMembers";
import TeamDetails from "@/components/admin/TeamDetails";
import AddMember from "@/components/admin/AddMember";
import Approvals from "@/components/admin/Approvals";
import CalendarView from "@/components/CalendarView";
import TeamDashboard from "@/components/team/TeamDashboard";
import WorkUpdateForm from "@/components/team/WorkUpdateForm";
import LearningForm from "@/components/team/LearningForm";
import TeamChatPanel from "@/components/team/TeamChatPanel";

const MainApp = () => {
  const { user, userRole, isLoading } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    if (userRole === "admin") {
      switch (activeView) {
        case "dashboard": return <AdminDashboard />;
        case "team-members": return <TeamMembers />;
        case "team-details": return <TeamDetails />;
        case "add-member": return <AddMember />;
        case "approvals": return <Approvals />;
        case "calendar": return <CalendarView />;
        case "chat": return <TeamChatPanel />;
        default: return <AdminDashboard />;
      }
    } else {
      switch (activeView) {
        case "dashboard": return <TeamDashboard />;
        case "work-update": return <WorkUpdateForm />;
        case "learning": return <LearningForm />;
        case "chat": return <TeamChatPanel />;
        case "calendar": return <CalendarView />;
        default: return <TeamDashboard />;
      }
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 bg-card">
            <SidebarTrigger />
            <h2 className="ml-4 font-semibold text-foreground capitalize">
              {activeView.replace("-", " ")}
            </h2>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

const Index = () => (
  <AuthProvider>
    <MainApp />
  </AuthProvider>
);

export default Index;
