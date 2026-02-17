import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";

export default function Ratings() {
  const navigate = useNavigate();

  return (
    <div className="px-4 safe-top pb-8">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Mes évaluations</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Star className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-medium mb-1">Aucune évaluation</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Vos évaluations apparaîtront ici après vos premières livraisons.
        </p>
      </div>
    </div>
  );
}
