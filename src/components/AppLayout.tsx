import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Calendar, ClipboardList, BarChart3, Shield, CreditCard, Trophy } from "lucide-react";
import { NavLink } from "react-router-dom";

const escudo = "https://storage.googleapis.com/gpt-engineer-file-uploads/UF0tOdHEGYfctSMIyR1WMn2uAlB2/uploads/1770913095083-escudo_512x512.png";

const navItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/calendario", icon: Calendar, label: "Calendario" },
  { to: "/convocatoria", icon: ClipboardList, label: "Convocatoria" },
  { to: "/rendimiento", icon: BarChart3, label: "Stats" },
  { to: "/club", icon: Trophy, label: "Club" },
];

const adminNavItems = [
  { to: "/admin", icon: Shield, label: "Admin" },
];

export default function AppLayout() {
  const { user, profile, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center relative">
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-[hsl(203,60%,82%)] to-[hsl(203,50%,55%)]" />
        <div className="fixed inset-0 z-0 bg-gradient-to-b from-[hsl(203,60%,82%)]/25 to-[hsl(203,50%,55%)]/30" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <img src={escudo} alt="Inter de Verdún" className="w-20 h-20 animate-pulse" />
          <p className="text-white/70 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const allNav = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[hsl(203,60%,82%)] to-[hsl(203,50%,55%)]" />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[hsl(203,60%,82%)]/25 to-[hsl(203,50%,55%)]/30" />

      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <img src={escudo} alt="Inter de Verdún" className="w-8 h-8" />
            <span className="font-display font-bold text-foreground text-sm">INTER DE VERDÚN</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
              #{profile?.dorsal} {profile?.display_name}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 pb-20 max-w-lg mx-auto w-full px-4 py-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-lg">
        <div className="flex justify-around items-center max-w-lg mx-auto px-1 py-1">
          {allNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-all text-xs ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
