import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { WilayaSelect } from "@/components/WilayaSelect";
import { PARCEL_CATEGORIES } from "@/data/wilayas";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function CreateTrip() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [capacityNote, setCapacityNote] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!origin || !destination || !departureDate) {
      toast({ title: "Champs requis", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("trips").insert({
      user_id: user.id,
      origin_wilaya: origin,
      destination_wilaya: destination,
      departure_date: new Date(departureDate).toISOString(),
      capacity_note: capacityNote || null,
      accepted_categories: categories,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Trajet publié !" });
      navigate("/activity");
    }
  };

  return (
    <div className="px-4 safe-top pb-8">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Publier un trajet</h1>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Wilaya de départ *</Label>
          <WilayaSelect value={origin} onValueChange={setOrigin} placeholder="D'où partez-vous ?" />
        </div>

        <div className="space-y-2">
          <Label>Wilaya d'arrivée *</Label>
          <WilayaSelect value={destination} onValueChange={setDestination} placeholder="Où allez-vous ?" />
        </div>

        <div className="space-y-2">
          <Label>Date de départ *</Label>
          <Input
            type="datetime-local"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        <div className="space-y-2">
          <Label>Catégories acceptées</Label>
          <div className="grid grid-cols-2 gap-2">
            {PARCEL_CATEGORIES.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={categories.includes(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                />
                <span className="text-sm">{cat.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Note sur l'espace disponible</Label>
          <Textarea
            placeholder="Ex: place pour un petit sac à dos"
            value={capacityNote}
            onChange={(e) => setCapacityNote(e.target.value)}
            maxLength={200}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
          <Route className="h-4 w-4 mr-2" />
          {loading ? "Publication..." : "Publier le trajet"}
        </Button>
      </div>
    </div>
  );
}
