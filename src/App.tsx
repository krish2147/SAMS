import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { 
  X, LogOut, RefreshCw, LayoutDashboard, Globe, 
  ArrowLeft, ShieldCheck, Heart 
} from "lucide-react";
import { AcademyId, UserSession } from "./types";
import { Navbar } from "./components/Navbar";
import { AcademySelector } from "./components/AcademySelector";
import { AcademyExplore } from "./components/AcademyExplore";
import { LoginModal } from "./components/LoginModal";
import { RegisterPage } from "./components/RegisterPage";
import { PaymentCheckoutPage } from "./components/PaymentCheckoutPage";

// Sub Dashboards
import { ParentDashboard } from "./components/ParentDashboard";
import { MemberDashboard } from "./components/MemberDashboard";
import { CoachDashboard } from "./components/CoachDashboard";
import { ReceptionistDashboard } from "./components/ReceptionistDashboard";
import { AdminDashboard } from "./components/AdminDashboard";

export default function App() {
  // Global States
  const [selectedAcademyId, setSelectedAcademyId] = useState<AcademyId | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterPageActive, setIsRegisterPageActive] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"dashboard" | "explore">("explore");

  // Keep track of localStorage to persist across simple reload, verifying on backend
  useEffect(() => {
    const savedAcademy = localStorage.getItem("sams_academy");
    const savedSessionStr = localStorage.getItem("sams_session");
    
    if (savedAcademy) setSelectedAcademyId(savedAcademy as AcademyId);
    if (savedSessionStr) {
      try {
        const savedSession = JSON.parse(savedSessionStr);
        if (savedSession && savedSession.token) {
          // Verify with backend
          fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: savedSession.token })
          })
          .then(res => res.ok ? res.json().catch(() => null) : null)
          .then(data => {
            if (data && data.success && data.user) {
              const verifiedSession = {
                id: data.user.userId,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                academyId: data.user.academyId,
                avatar: data.user.photoUrl || savedSession.avatar,
                phoneNumber: data.user.phoneNumber || savedSession.phoneNumber || "",
                token: savedSession.token
              };
              setUserSession(verifiedSession);
              localStorage.setItem("sams_session", JSON.stringify(verifiedSession));
              setActiveDashboardTab("dashboard");
            } else {
              localStorage.removeItem("sams_session");
              setUserSession(null);
            }
          })
          .catch(err => {
            console.error("Session verification failed, relying on fallback.", err);
            setUserSession(savedSession);
            setActiveDashboardTab("dashboard");
          });
        } else {
          setUserSession(savedSession);
          setActiveDashboardTab("dashboard");
        }
      } catch (e) {
        localStorage.removeItem("sams_session");
      }
    }
  }, []);

  const handleSelectAcademy = (id: AcademyId | null) => {
    setSelectedAcademyId(id);
    setIsRegisterPageActive(false);
    if (id) {
      localStorage.setItem("sams_academy", id);
    } else {
      localStorage.removeItem("sams_academy");
      // Logging out of session if they switch back to main gateway to prevent confusion
      handleLogout();
    }
  };

  const handleLoginSuccess = (session: UserSession) => {
    // Clear any stale cached profiles to guarantee fresh session data
    localStorage.removeItem("sams_current_member_profile");
    localStorage.removeItem("sams_current_user");
    localStorage.removeItem("sams_current_staff");

    setUserSession(session);
    localStorage.setItem("sams_session", JSON.stringify(session));
    setActiveDashboardTab("dashboard");
    setIsRegisterPageActive(false);
  };

  const handleProfileUpdated = (updated: { name: string; email: string; phoneNumber: string; avatar: string }) => {
    setUserSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        name: updated.name,
        email: updated.email,
        phoneNumber: updated.phoneNumber,
        avatar: updated.avatar
      };
    });
  };

  const handleLogout = () => {
    setUserSession(null);
    localStorage.removeItem("sams_session");
    setActiveDashboardTab("explore");
    setIsRegisterPageActive(false);
  };

  // Determine current active view styling
  const isSwim = selectedAcademyId === "swim";
  const bgApp = selectedAcademyId 
    ? (isSwim ? "bg-sky-50" : "bg-[#041a10] text-emerald-100")
    : "bg-[#05070c]";

  // Helper renderer for dashboards
  const renderDashboard = () => {
    if (!userSession) return null;
    
    switch (userSession.role) {
      case "parent":
        return <ParentDashboard academyId={selectedAcademyId!} userName={userSession.name} />;
      case "member":
        return <MemberDashboard academyId={selectedAcademyId!} userName={userSession.name} onLogout={handleLogout} />;
      case "coach":
        return <CoachDashboard academyId={selectedAcademyId!} userName={userSession.name} onLogout={handleLogout} userSession={userSession} />;
      case "staff":
      case "receptionist":
        return <ReceptionistDashboard academyId={selectedAcademyId!} userName={userSession.name} onLogout={handleLogout} />;
      case "super_admin":
      case "admin":
        return <AdminDashboard academyId={selectedAcademyId!} userName={userSession.name} userRole={userSession.role} onLogout={handleLogout} userSession={userSession} onProfileUpdated={handleProfileUpdated} />;
      default:
        return null;
    }
  };

  const isAdminStaffRole = userSession && ["admin", "super_admin", "staff", "receptionist", "coach"].includes(userSession.role);

  const paymentOrderId = new URLSearchParams(window.location.search).get("order_id");
  if (window.location.pathname === "/pay" && paymentOrderId) {
    return <PaymentCheckoutPage orderId={paymentOrderId} />;
  }

  return (
    <div className={isAdminStaffRole ? `h-screen h-[100dvh] overflow-hidden ${bgApp} transition-colors duration-1000 select-none` : `min-h-screen ${bgApp} transition-colors duration-1000 overflow-x-hidden select-none`}>
      
      {/* 1. Universal Adaptive Navbar */}
      {selectedAcademyId && !isAdminStaffRole && (
        <Navbar
          selectedAcademyId={selectedAcademyId}
          onSelectAcademy={handleSelectAcademy}
          onOpenLogin={() => setIsLoginOpen(true)}
          userSession={userSession}
          onLogout={handleLogout}
          isRegisterPageActive={isRegisterPageActive}
        />
      )}

      {/* 2. Main Orchestrator */}
      <AnimatePresence mode="wait">
        {!selectedAcademyId ? (
          /* CINEMATIC LANDING GATEWAY: SELECT ACADEMY */
          <motion.div
            key="selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <AcademySelector onSelectAcademy={handleSelectAcademy} />
          </motion.div>
        ) : isRegisterPageActive ? (
          /* DEDICATED FULL-PAGE REGISTRATION FORM */
          <motion.div
            key={`register-${selectedAcademyId}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
          >
            <RegisterPage
              academyId={selectedAcademyId}
              onRegisterSuccess={handleLoginSuccess}
              onCancel={() => setIsRegisterPageActive(false)}
            />
          </motion.div>
        ) : (
          /* TRANSFORMED ACADEMY EXPERIENCE */
          <motion.div
            key={`academy-${selectedAcademyId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={isAdminStaffRole ? "h-screen h-[100dvh] w-full overflow-hidden" : "pt-2"}
          >
            {/* If user is logged in, show beautiful dashboard toggles */}
            {userSession ? (
              isAdminStaffRole ? (
                <div className="w-full h-full overflow-hidden">
                  {renderDashboard()}
                </div>
              ) : (
                <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-10">
                  
                  {/* Dashboard Nav bar */}
                  <div className={`mb-10 p-4 rounded-3xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${
                    isSwim 
                      ? "bg-white border-sky-100/60 shadow-md text-slate-800" 
                      : "bg-emerald-950/60 border-emerald-900/40 text-emerald-100 shadow-xl"
                  }`}>
                    <div className="flex items-center gap-4 text-left">
                      <img 
                        src={userSession.avatar} 
                        alt={userSession.name} 
                        className="h-10 w-10 rounded-full object-cover border border-current/10" 
                      />
                      <div>
                        <span className="text-[10px] font-mono tracking-wider opacity-60 uppercase">ACTIVE SECURED SESSION</span>
                        <h3 className="text-sm font-bold">{userSession.name}</h3>
                      </div>
                    </div>

                    {/* Tabs: Member Dashboard or Public Exploration */}
                    <div className="flex gap-2 bg-black/5 p-1 rounded-full border border-current/10 relative">
                      <button
                        id="btn-tab-dashboard"
                        onClick={() => setActiveDashboardTab("dashboard")}
                        className={`relative px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 cursor-pointer transition-all duration-300 z-10 ${
                          activeDashboardTab === "dashboard"
                            ? (isSwim ? "text-white" : "text-slate-950")
                            : (isSwim ? "text-slate-600 hover:text-slate-900" : "text-emerald-100/60 hover:text-emerald-100")
                        }`}
                      >
                        {activeDashboardTab === "dashboard" && (
                          <motion.div
                            layoutId="activeTabBackground"
                            className={`absolute inset-0 rounded-full -z-10 ${
                              isSwim ? "bg-slate-900" : "bg-amber-400"
                            }`}
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          />
                        )}
                        <LayoutDashboard className="h-4 w-4 relative z-10" />
                        <span className="relative z-10">My Dashboard</span>
                      </button>
                      <button
                        id="btn-tab-explore"
                        onClick={() => setActiveDashboardTab("explore")}
                        className={`relative px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 cursor-pointer transition-all duration-300 z-10 ${
                          activeDashboardTab === "explore"
                            ? (isSwim ? "text-white" : "text-slate-950")
                            : (isSwim ? "text-slate-600 hover:text-slate-900" : "text-emerald-100/60 hover:text-emerald-100")
                        }`}
                      >
                        {activeDashboardTab === "explore" && (
                          <motion.div
                            layoutId="activeTabBackground"
                            className={`absolute inset-0 rounded-full -z-10 ${
                              isSwim ? "bg-slate-900" : "bg-amber-400"
                            }`}
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          />
                        )}
                        <Globe className="h-4 w-4 relative z-10" />
                        <span className="relative z-10">Explore Academy</span>
                      </button>
                    </div>
                  </div>

                  {/* Body display depending on tab */}
                  <AnimatePresence mode="wait">
                    {activeDashboardTab === "dashboard" ? (
                      <motion.div
                        key="dashboard-view"
                        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {renderDashboard()}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="explore-view"
                        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <AcademyExplore 
                          academyId={selectedAcademyId} 
                          onOpenLogin={() => setIsLoginOpen(true)}
                          onOpenRegister={() => setIsRegisterPageActive(true)}
                          onSelectAcademy={handleSelectAcademy}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              )
            ) : (
              /* Public exploration if not logged in */
              <AcademyExplore 
                academyId={selectedAcademyId} 
                onOpenLogin={() => setIsLoginOpen(true)}
                onOpenRegister={() => setIsRegisterPageActive(true)}
                onSelectAcademy={handleSelectAcademy}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Luxury Login & Role-Selection Modal */}
      {selectedAcademyId && (
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          academyId={selectedAcademyId}
          onLoginSuccess={handleLoginSuccess}
          onOpenRegister={() => {
            setIsLoginOpen(false);
            setIsRegisterPageActive(true);
          }}
        />
      )}

      {/* 4. Luxury Credit Footer for selected academy pages */}
      {selectedAcademyId && !isAdminStaffRole && (
        <footer className={`mt-10 border-t py-8 px-4 md:px-8 relative z-10 ${
          isSwim 
            ? "bg-white border-slate-100 text-slate-500" 
            : "bg-emerald-950/20 border-emerald-900/40 text-emerald-300/40"
        }`}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono tracking-wider">
            <span>SAMS v4.1</span>
            <span>© {new Date().getFullYear()} SAMS. All rights reserved.</span>
          </div>
        </footer>
      )}

    </div>
  );
}
