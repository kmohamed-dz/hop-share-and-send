import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Welcome from "@/pages/onboarding/Welcome";
import RoleSelection from "@/pages/onboarding/RoleSelection";
import Login from "@/pages/auth/Login";
import AuthCallback from "@/pages/auth/AuthCallback";
import ProfileSetup from "@/pages/auth/ProfileSetup";
import Home from "@/pages/Home";
import Activity from "@/pages/Activity";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import CreateTrip from "@/pages/trips/CreateTrip";
import CreateParcel from "@/pages/parcels/CreateParcel";
import BrowseTrips from "@/pages/browse/BrowseTrips";
import BrowseParcels from "@/pages/browse/BrowseParcels";
import TripMatches from "@/pages/matches/TripMatches";
import ParcelMatches from "@/pages/matches/ParcelMatches";
import SearchPage from "@/pages/Search";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Onboarding */}
          <Route path="/onboarding/welcome" element={<Welcome />} />
          <Route path="/onboarding/role" element={<RoleSelection />} />

          {/* Auth */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/profile/setup" element={<ProfileSetup />} />

          {/* Search */}
          <Route path="/search" element={<SearchPage />} />

          {/* Creation forms */}
          <Route path="/trips/create" element={<CreateTrip />} />
          <Route path="/parcels/create" element={<CreateParcel />} />

          {/* Browse */}
          <Route path="/browse/trips" element={<BrowseTrips />} />
          <Route path="/browse/parcels" element={<BrowseParcels />} />

          {/* Matching */}
          <Route path="/trips/:tripId/matches" element={<TripMatches />} />
          <Route path="/parcels/:parcelId/matches" element={<ParcelMatches />} />

          {/* Main App */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Fallback: redirect unknown routes to home */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
