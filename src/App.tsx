import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthGate } from "@/components/auth/AuthGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/auth/Login";
import ProfileSetup from "@/pages/auth/ProfileSetup";
import Activity from "@/pages/Activity";
import Home from "@/pages/Home";
import Messages from "@/pages/Messages";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import SearchPage from "@/pages/Search";
import LoginWelcome from "@/pages/onboarding/Welcome";
import RoleSelection from "@/pages/onboarding/RoleSelection";
import BrowseParcels from "@/pages/browse/BrowseParcels";
import BrowseTrips from "@/pages/browse/BrowseTrips";
import ParcelMatches from "@/pages/matches/ParcelMatches";
import TripMatches from "@/pages/matches/TripMatches";
import CreateParcel from "@/pages/parcels/CreateParcel";
import CreateTrip from "@/pages/trips/CreateTrip";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route element={<AuthGate />}>
            {/* Onboarding/Auth flow */}
            <Route path="/onboarding/welcome" element={<LoginWelcome />} />
            <Route path="/onboarding/role" element={<RoleSelection />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/profile-setup" element={<ProfileSetup />} />
            <Route path="/profile/setup" element={<Navigate to="/auth/profile-setup" replace />} />

            {/* Protected area */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route path="/search" element={<SearchPage />} />
            <Route path="/trips/create" element={<CreateTrip />} />
            <Route path="/parcels/create" element={<CreateParcel />} />
            <Route path="/browse/trips" element={<BrowseTrips />} />
            <Route path="/browse/parcels" element={<BrowseParcels />} />
            <Route path="/trips/:tripId/matches" element={<TripMatches />} />
            <Route path="/parcels/:parcelId/matches" element={<ParcelMatches />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
