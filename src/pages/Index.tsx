import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import LoginPage from "@/components/auth/LoginPage";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import { useState, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy loading components to improve performance
const AdminDashboard = lazy(() => import("@/components/admin/AdminDashboard"));
const TeamMembers = lazy(() => import("@/components/admin/TeamMembers"));
const TeamDetails = lazy(() => import("@/components/admin/TeamDetails"));
const AddMember = lazy(() => import("@/components/admin/AddMember"));
const CalendarView = lazy(() => import("@/components/CalendarView"));
const TeamDashboard = lazy(() => import("@/components/team/TeamDashboard"));
const WorkUpdateForm = lazy(() => import("@/components/team/WorkUpdateForm"));
const LearningForm = lazy(() => import("@/components/team/LearningForm"));
const TeamChatPanel = lazy(() => import("@/components/team/TeamChatPanel"));
const AnalyticsDashboard = lazy(() => import("@/components/admin/AnalyticsDashboard"));
const LeaveApprovals = lazy(() => import("@/components/admin/LeaveApprovals"));
const ProjectManagement = lazy(() => import("@/components/admin/ProjectManagement"));
const TaskManagement = lazy(() => import("@/components/admin/TaskManagement"));
const AttendanceTracker = lazy(() => import("@/components/attendance/AttendanceTracker"));
const LeaveRequestForm = lazy(() => import("@/components/leave/LeaveRequestForm"));

// Loading fallback component
const PageLoader = () => (
  <div className="space-y-4 w-full p-4">
    <Skeleton className="h-[200px] w-full rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-[300px] w-full rounded-xl" />
      <Skeleton className="h-[300px] w-full rounded-xl" />
    </div>
  </div>
);

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
        case "analytics": return <AnalyticsDashboard />;
        case "team-members": return <TeamMembers />;
        case "team-details": return <TeamDetails />;
        case "add-member": return <AddMember />;
        case "projects": return <ProjectManagement />;
        case "tasks": return <TaskManagement />;
        case "approvals": return <LeaveApprovals />;
        case "calendar": return <CalendarView />;
        case "chat": return <TeamChatPanel />;
        default: return <AdminDashboard />;
      }
    } else {
      switch (activeView) {
        case "dashboard": return <TeamDashboard />;
        case "attendance": return <AttendanceTracker />;
        case "work-update": return <WorkUpdateForm />;
        case "leave-request": return <LeaveRequestForm />;
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
            <Suspense fallback={<PageLoader />}>
              {renderContent()}
            </Suspense>
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
