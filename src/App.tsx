import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthGate } from "@/components/auth/AuthGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import Activity from "@/pages/Activity";
import Home from "@/pages/Home";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import SearchPage from "@/pages/Search";
import BrowseParcels from "@/pages/browse/BrowseParcels";
import BrowseTrips from "@/pages/browse/BrowseTrips";
import DealChat from "@/pages/deals/DealChat";
import DealDetail from "@/pages/deals/DealDetail";
import ParcelMatches from "@/pages/matches/ParcelMatches";
import TripMatches from "@/pages/matches/TripMatches";
import Login from "@/pages/auth/Login";
import ProfileSetup from "@/pages/auth/ProfileSetup";
import RoleSelection from "@/pages/onboarding/RoleSelection";
import Welcome from "@/pages/onboarding/Welcome";
import CreateParcel from "@/pages/parcels/CreateParcel";
import CreateTrip from "@/pages/trips/CreateTrip";
import Safety from "@/pages/Safety";
import Settings from "@/pages/Settings";
import ProfileRatings from "@/pages/ProfileRatings";

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
              <Route path="/onboarding/welcome" element={<Welcome />} />
              <Route path="/onboarding/role" element={<RoleSelection />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/profile-setup" element={<ProfileSetup />} />
              <Route path="/profile/setup" element={<Navigate to="/auth/profile-setup" replace />} />

              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              <Route path="/messages/:dealId" element={<DealChat />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/trips/create" element={<CreateTrip />} />
              <Route path="/parcels/create" element={<CreateParcel />} />
              <Route path="/browse/trips" element={<BrowseTrips />} />
              <Route path="/browse/parcels" element={<BrowseParcels />} />
              <Route path="/trips/:tripId/matches" element={<TripMatches />} />
              <Route path="/parcels/:parcelId/matches" element={<ParcelMatches />} />
              <Route path="/deals/:dealId" element={<DealDetail />} />
              <Route path="/safety" element={<Safety />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile/ratings" element={<ProfileRatings />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
