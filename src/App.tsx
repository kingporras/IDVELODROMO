import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/Login";
import HomePage from "@/pages/Home";
import CalendarPage from "@/pages/Calendar";
import ConvocatoriaPage from "@/pages/Convocatoria";
import RendimientoPage from "@/pages/Rendimiento";
import ClubPage from "@/pages/Club";
import AdminPage from "@/pages/Admin";
import PagosPage from "@/pages/Pagos";
import AdminPostMatchPage from "@/pages/AdminPostMatch";
import AdminVideosPage from "@/pages/AdminVideos";
import MatchDetail from "@/pages/MatchDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/calendario" element={<CalendarPage />} />
              <Route path="/convocatoria" element={<ConvocatoriaPage />} />
              <Route path="/rendimiento" element={<RendimientoPage />} />
              <Route path="/club" element={<ClubPage />} />
              <Route path="/partido/:id" element={<MatchDetail />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/pagos" element={<PagosPage />} />
              <Route path="/admin/post-partido" element={<AdminPostMatchPage />} />
              <Route path="/admin/videos" element={<AdminVideosPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
