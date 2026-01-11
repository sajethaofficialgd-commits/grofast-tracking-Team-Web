import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Clock, Play, Pause, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

interface AttendanceSession {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  duration_minutes: number | null;
  check_in_photo: string | null;
}

const AttendanceTracker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [captureType, setCaptureType] = useState<"check_in" | "check_out">("check_in");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch today's sessions
  const { data: sessions = [], refetch } = useQuery({
    queryKey: ["attendance-sessions", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .order("check_in_time", { ascending: true });
      return (data || []) as AttendanceSession[];
    },
    enabled: !!user?.id,
  });

  // Calculate current active session
  const activeSession = sessions.find(s => !s.check_out_time);
  const isCheckedIn = !!activeSession;

  // Calculate total hours worked today
  const totalMinutes = sessions.reduce((acc, session) => {
    if (session.duration_minutes) {
      return acc + session.duration_minutes;
    }
    if (session.check_in_time && !session.check_out_time) {
      const start = new Date(session.check_in_time).getTime();
      const now = Date.now();
      return acc + Math.floor((now - start) / (1000 * 60));
    }
    return acc;
  }, 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Update elapsed time for active session
  useEffect(() => {
    if (!isCheckedIn || !activeSession) {
      setElapsedTime("00:00:00");
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(activeSession.check_in_time).getTime();
      const now = Date.now();
      const diff = now - start;
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isCheckedIn, activeSession]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error("Failed to access camera. Please allow camera permissions.");
      setShowCamera(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const openCamera = (type: "check_in" | "check_out") => {
    setCaptureType(type);
    setCapturedImage(null);
    setShowCamera(true);
  };

  useEffect(() => {
    if (showCamera && !stream) {
      startCamera();
    }
  }, [showCamera, stream, startCamera]);

  useEffect(() => {
    if (!showCamera) {
      stopCamera();
    }
  }, [showCamera, stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmPhoto = async () => {
    if (!user?.id || !capturedImage) return;

    try {
      if (captureType === "check_in") {
        const { error } = await supabase.from("attendance_sessions").insert({
          user_id: user.id,
          date: today,
          check_in_time: new Date().toISOString(),
          check_in_photo: capturedImage,
        });

        if (error) throw error;
        toast.success("Checked in successfully!");
      } else {
        if (!activeSession) return;

        const checkInTime = new Date(activeSession.check_in_time).getTime();
        const now = Date.now();
        const durationMinutes = Math.floor((now - checkInTime) / (1000 * 60));

        const { error } = await supabase
          .from("attendance_sessions")
          .update({
            check_out_time: new Date().toISOString(),
            check_out_photo: capturedImage,
            duration_minutes: durationMinutes,
          })
          .eq("id", activeSession.id);

        if (error) throw error;
        toast.success("Checked out successfully!");
      }

      setShowCamera(false);
      setCapturedImage(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
    } catch (error) {
      toast.error("Failed to save attendance");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Tracker Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center">
                <Clock className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Session</p>
                <p className="text-4xl font-bold text-foreground font-mono">
                  {isCheckedIn ? elapsedTime : "00:00:00"}
                </p>
                {isCheckedIn && activeSession && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Started at {format(new Date(activeSession.check_in_time), "h:mm a")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Today's Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalHours}h {remainingMinutes}m
                </p>
              </div>
              <Button
                onClick={() => openCamera(isCheckedIn ? "check_out" : "check_in")}
                size="lg"
                className={isCheckedIn 
                  ? "bg-destructive hover:bg-destructive/90" 
                  : "bg-green-600 hover:bg-green-700"
                }
              >
                <Camera className="w-5 h-5 mr-2" />
                {isCheckedIn ? "Check Out" : "Check In"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today's Sessions ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              No sessions logged today. Check in to start tracking!
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      session.check_out_time ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {session.check_out_time ? <Check className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Session {index + 1}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.check_in_time), "h:mm a")}
                        {session.check_out_time && (
                          <> → {format(new Date(session.check_out_time), "h:mm a")}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {session.duration_minutes ? (
                      <p className="font-semibold text-foreground">
                        {Math.floor(session.duration_minutes / 60)}h {session.duration_minutes % 60}m
                      </p>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {captureType === "check_in" ? "Check In Photo" : "Check Out Photo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {!capturedImage ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              {!capturedImage ? (
                <>
                  <Button variant="outline" onClick={() => setShowCamera(false)} className="flex-1">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={retakePhoto} className="flex-1">
                    Retake
                  </Button>
                  <Button onClick={confirmPhoto} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4 mr-2" />
                    Confirm {captureType === "check_in" ? "Check In" : "Check Out"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceTracker;
