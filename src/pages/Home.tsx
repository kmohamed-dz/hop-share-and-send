import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Route, Package, Search, MapPin } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="px-4 safe-top">
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">
          <span className="text-primary">MAAK</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Mobilité & colis entre villes</p>
      </div>

      {/* Search Bar */}
      <button
        onClick={() => navigate("/search")}
        className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-muted mb-6"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">Rechercher un trajet ou colis...</span>
      </button>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/20"
          onClick={() => navigate("/trips/create")}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Route className="h-5 w-5 text-primary" />
          </div>
          <p className="font-semibold text-sm">Publier un trajet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Proposez votre voyage</p>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-secondary/20"
          onClick={() => navigate("/parcels/create")}
        >
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-3">
            <Package className="h-5 w-5 text-secondary" />
          </div>
          <p className="font-semibold text-sm">Envoyer un colis</p>
          <p className="text-xs text-muted-foreground mt-0.5">Trouvez un transporteur</p>
        </Card>
      </div>

      {/* Recent Activity placeholder */}
      <div>
        <h2 className="font-semibold mb-3">Activité récente</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MapPin className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">Aucune activité pour le moment</p>
          <p className="text-muted-foreground text-xs mt-1">Commencez par publier un trajet ou un colis</p>
        </div>
      </div>
    </div>
  );
}
