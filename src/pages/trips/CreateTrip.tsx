import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { WilayaSelect } from "@/components/WilayaSelect";
import { findWilayaByStoredName, PARCEL_CATEGORIES } from "@/data/wilayas";
import { supabase } from "@/integrations/supabase/client";
import { currentUserHasOpenDeal, syncMarketplaceExpirations } from "@/lib/marketplace";
import { useToast } from "@/hooks/use-toast";

function extractMissingSchemaColumn(errorMessage: string): string | null {
  const match = /Could not find the '([^']+)' column of '[^']+' in the schema cache/i.exec(errorMessage);
  return match?.[1] ?? null;
}

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
    if (!origin || !destination || !departureDate || !capacityNote.trim()) {
      toast({ title: "Champs requis", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    if (categories.length === 0) {
      toast({ title: "Catégories requises", description: "Sélectionnez au moins une catégorie acceptée.", variant: "destructive" });
      return;
    }

    const originWilaya = findWilayaByStoredName(origin);
    const destinationWilaya = findWilayaByStoredName(destination);
    if (!originWilaya || !destinationWilaya) {
      toast({
        title: "Wilayas invalides",
        description: "Veuillez sélectionner des wilayas valides.",
        variant: "destructive",
      });
      return;
    }

    const departureLocal = new Date(departureDate);
    if (Number.isNaN(departureLocal.getTime())) {
      toast({ title: "Date invalide", description: "Veuillez choisir une date valide.", variant: "destructive" });
      return;
    }

    const minFutureMs = Date.now() + 5 * 60 * 1000;
    if (departureLocal.getTime() < minFutureMs) {
      toast({
        title: "Date de départ trop proche",
        description: "Choisissez un départ au moins 5 minutes dans le futur.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    await syncMarketplaceExpirations();

    const hasOpenDeal = await currentUserHasOpenDeal();
    if (hasOpenDeal) {
      toast({
        title: "Action bloquée",
        description: "Vous devez clôturer votre deal actif avant de créer un nouveau trajet.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const departureIso = departureLocal.toISOString();
    const basePayload: Record<string, unknown> = {
      traveler_id: user.id,
      user_id: user.id,
      origin_wilaya: Number.parseInt(originWilaya.code, 10),
      destination_wilaya: Number.parseInt(destinationWilaya.code, 10),
      departure_time: departureIso,
      departure_date: departureIso,
      capacity: capacityNote.trim(),
      capacity_note: capacityNote.trim(),
      categories,
      accepted_categories: categories,
    };

    const removableColumns = new Set([
      "capacity",
      "traveler_id",
      "departure_time",
      "categories",
    ]);

    const payload = { ...basePayload };
    let errorMessage: string | null = null;

    for (let attempt = 0; attempt < removableColumns.size + 1; attempt += 1) {
      const { error } = await supabase.from("trips").insert(payload as never);
      if (!error) {
        errorMessage = null;
        break;
      }

      const missingColumn = extractMissingSchemaColumn(error.message);
      if (!missingColumn || !removableColumns.has(missingColumn) || !(missingColumn in payload)) {
        errorMessage = error.message;
        break;
      }

      delete payload[missingColumn];
      errorMessage = error.message;
    }

    setLoading(false);
    if (errorMessage) {
      toast({ title: "Erreur", description: errorMessage, variant: "destructive" });
    } else {
      toast({ title: "Trajet publié !" });
      navigate("/activity");
    }
  };

  return (
    <div className="mobile-page pb-8">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="maak-section-title">Publier un trajet</h1>
      </div>

      <div className="space-y-5 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
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
            min={toLocalDateTimeInputValue(new Date())}
          />
        </div>

        <div className="space-y-2">
          <Label>Catégories acceptées *</Label>
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
          <Label>Capacité disponible *</Label>
          <Textarea
            placeholder="Ex: place pour un petit sac à dos"
            value={capacityNote}
            onChange={(e) => setCapacityNote(e.target.value)}
            maxLength={200}
          />
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full maak-primary-btn" size="lg">
          <Route className="h-4 w-4 mr-2" />
          {loading ? "Publication..." : "Publier le trajet"}
        </Button>
      </div>
    </div>
  );
}
