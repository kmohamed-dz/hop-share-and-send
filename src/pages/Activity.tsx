import { Route, Package } from "lucide-react";

export default function Activity() {
  return (
    <div className="px-4 safe-top">
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-bold">Mon activité</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex gap-2 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Route className="h-6 w-6 text-primary" />
          </div>
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-secondary" />
          </div>
        </div>
        <p className="font-medium">Aucun trajet ou colis</p>
        <p className="text-sm text-muted-foreground mt-1">Vos trajets et demandes de colis apparaîtront ici</p>
      </div>
    </div>
  );
}
