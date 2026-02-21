import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthGate } from "@/components/auth/AuthGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Activity from "@/pages/Activity";
import Home from "@/pages/Home";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import SearchPage from "@/pages/Search";
import BrowseParcels from "@/pages/browse/BrowseParcels";
import BrowseTrips from "@/pages/browse/BrowseTrips";
import TripDetail from "@/pages/browse/TripDetail";
import DealChat from "@/pages/deals/DealChat";
import DealDetail from "@/pages/deals/DealDetail";
import ParcelMatches from "@/pages/matches/ParcelMatches";
import TripMatches from "@/pages/matches/TripMatches";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDeals from "@/pages/admin/AdminDeals";
import AdminMessages from "@/pages/admin/AdminMessages";
import AdminParcels from "@/pages/admin/AdminParcels";
import AdminTrips from "@/pages/admin/AdminTrips";
import AdminUsers from "@/pages/admin/AdminUsers";
import AuthCallback from "@/pages/auth/AuthCallback";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Login from "@/pages/auth/Login";
import ProfileSetup from "@/pages/auth/ProfileSetup";
import ResetPassword from "@/pages/auth/ResetPassword";
import Signup from "@/pages/auth/Signup";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import RoleSelection from "@/pages/onboarding/RoleSelection";
import Welcome from "@/pages/onboarding/Welcome";
import CreateParcel from "@/pages/parcels/CreateParcel";
import CreateTrip from "@/pages/trips/CreateTrip";
import ProcessusContact from "@/pages/processus/ProcessusContact";
import ProcessusHub from "@/pages/processus/ProcessusHub";
import ProcessusMatching from "@/pages/processus/ProcessusMatching";
import ProcessusRemise from "@/pages/processus/ProcessusRemise";
import ProcessusSecurite from "@/pages/processus/ProcessusSecurite";
import ProcessusTraceabilite from "@/pages/processus/ProcessusTraceabilite";
import Safety from "@/pages/Safety";
import Settings from "@/pages/Settings";
import ProfileRatings from "@/pages/ProfileRatings";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route element={<AuthGate />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<Signup />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/verify" element={<VerifyEmail />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/update-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Navigate to="/onboarding/welcome" replace />} />
                <Route path="/onboarding/welcome" element={<Welcome />} />
                <Route path="/onboarding/role" element={<RoleSelection />} />
                <Route path="/auth/profile-setup" element={<ProfileSetup />} />
                <Route path="/profile/setup" element={<Navigate to="/auth/profile-setup" replace />} />

                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Home />} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>

                <Route path="/messages/:dealId" element={<DealChat />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/trips/create" element={<CreateTrip />} />
                <Route path="/parcels/create" element={<CreateParcel />} />
                <Route path="/browse/trips" element={<BrowseTrips />} />
                <Route path="/browse/trips/:tripId" element={<TripDetail />} />
                <Route path="/browse/parcels" element={<BrowseParcels />} />
                <Route path="/trips/:tripId/matches" element={<TripMatches />} />
                <Route path="/parcels/:parcelId/matches" element={<ParcelMatches />} />
                <Route path="/deals/:dealId" element={<DealDetail />} />
                <Route path="/deals/:id" element={<DealDetail />} />
                <Route path="/safety" element={<Safety />} />
                <Route path="/processus" element={<ProcessusHub />} />
                <Route path="/processus/matching" element={<ProcessusMatching />} />
                <Route path="/processus/contact" element={<ProcessusContact />} />
                <Route path="/processus/remise" element={<ProcessusRemise />} />
                <Route path="/processus/securite" element={<ProcessusSecurite />} />
                <Route path="/processus/traceabilite" element={<ProcessusTraceabilite />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile/ratings" element={<ProfileRatings />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/trips" element={<AdminTrips />} />
                <Route path="/admin/parcels" element={<AdminParcels />} />
                <Route path="/admin/deals" element={<AdminDeals />} />
                <Route path="/admin/messages" element={<AdminMessages />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
