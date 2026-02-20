import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WilayaSelect } from "@/components/WilayaSelect";
import { findWilayaByStoredName, PARCEL_CATEGORIES } from "@/data/wilayas";
import { supabase } from "@/integrations/supabase/client";
import { currentUserHasOpenDeal, syncMarketplaceExpirations } from "@/lib/marketplace";
import { useToast } from "@/hooks/use-toast";

const SIZE_OPTIONS = [
  { value: "small", label: "Petit (< 2 kg)" },
  { value: "medium", label: "Moyen (2-5 kg)" },
  { value: "large", label: "Grand (5-15 kg)" },
  { value: "xlarge", label: "Très grand (> 15 kg)" },
];

const DELIVERY_POINT_TYPES = [
  { value: "public_place", label: "Lieu public" },
  { value: "delivery_office", label: "Bureau de livraison" },
  { value: "airport", label: "Aéroport" },
  { value: "train_station", label: "Gare ferroviaire" },
  { value: "bus_station", label: "Gare routière" },
];

export default function CreateParcel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [category, setCategory] = useState("");
  const [sizeWeight, setSizeWeight] = useState("");
  const [reward, setReward] = useState("");
  const [contentDescription, setContentDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryPointAddress, setDeliveryPointAddress] = useState("");
  const [deliveryPointType, setDeliveryPointType] = useState("");
  const [forbiddenAck, setForbiddenAck] = useState(false);

  const normalizeSize = (value: string): "small" | "medium" | "large" => {
    if (value === "medium") return "medium";
    if (value === "large" || value === "xlarge") return "large";
    return "small";
  };

  const handleSubmit = async () => {
    if (!origin || !destination || !dateStart || !dateEnd || !category || !sizeWeight || !reward || !contentDescription.trim()) {
      toast({ title: "Champs requis", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    if (!deliveryPointAddress.trim() || !deliveryPointType) {
      toast({
        title: "Point de livraison requis",
        description: "Ajoutez l'adresse et le type du point B (livraison).",
        variant: "destructive",
      });
      return;
    }
    if (!forbiddenAck) {
      toast({ title: "Confirmation requise", description: "Veuillez confirmer que votre colis ne contient pas d'objets interdits.", variant: "destructive" });
      return;
    }
    if (new Date(dateEnd) < new Date(dateStart)) {
      toast({ title: "Dates invalides", description: "La date de fin doit être après la date de début.", variant: "destructive" });
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

    setLoading(true);
    await syncMarketplaceExpirations();

    const hasOpenDeal = await currentUserHasOpenDeal();
    if (hasOpenDeal) {
      toast({
        title: "Action bloquée",
        description: "Vous devez clôturer votre deal actif avant de publier un nouveau colis.",
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

    const mergedNotes = `${contentDescription.trim()}\n${notes}`.trim();
    const startIso = new Date(dateStart).toISOString();
    const endIso = new Date(dateEnd).toISOString();
    const rewardAmount = reward ? parseInt(reward, 10) : 0;
    const normalizedSize = normalizeSize(sizeWeight);

    const { error } = await supabase.from("parcel_requests").insert({
      sender_id: user.id,
      user_id: user.id,
      origin_wilaya: Number.parseInt(originWilaya.code, 10),
      destination_wilaya: Number.parseInt(destinationWilaya.code, 10),
      time_window_start: startIso,
      time_window_end: endIso,
      date_window_start: startIso,
      date_window_end: endIso,
      category,
      size: normalizedSize,
      size_weight: sizeWeight || null,
      reward_amount: rewardAmount,
      reward_dzd: rewardAmount,
      notes: mergedNotes || null,
      dropoff_place: deliveryPointAddress.trim(),
      delivery_point_address: deliveryPointAddress.trim(),
      delivery_point_type: deliveryPointType,
      forbidden_ack: true,
      forbidden_items_acknowledged: true,
    } as never);

    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Demande publiée !" });
      navigate("/activity");
    }
  };

  return (
    <div className="mobile-page pb-8">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="maak-section-title">Envoyer un colis</h1>
      </div>

      <div className="space-y-5 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="space-y-2">
          <Label>Wilaya d'origine *</Label>
          <WilayaSelect value={origin} onValueChange={setOrigin} placeholder="D'où part le colis ?" />
        </div>

        <div className="space-y-2">
          <Label>Wilaya de destination *</Label>
          <WilayaSelect value={destination} onValueChange={setDestination} placeholder="Où envoyer ?" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Date début *</Label>
            <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date fin *</Label>
            <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Catégorie *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Type de colis" /></SelectTrigger>
            <SelectContent>
              {PARCEL_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Taille / Poids</Label>
          <Select value={sizeWeight} onValueChange={setSizeWeight}>
            <SelectTrigger><SelectValue placeholder="Estimation" /></SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Récompense (DZD)</Label>
          <Input
            type="number"
            placeholder="Ex: 500"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            min={0}
          />
        </div>

        <div className="space-y-2">
          <Label>Point de livraison B *</Label>
          <Input
            placeholder="Adresse de remise (quartier, repère...)"
            value={deliveryPointAddress}
            onChange={(e) => setDeliveryPointAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Type de point B *</Label>
          <Select value={deliveryPointType} onValueChange={setDeliveryPointType}>
            <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
            <SelectContent>
              {DELIVERY_POINT_TYPES.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        <div className="space-y-2">
          <Label>Contenu déclaré *</Label>
          <Textarea
            placeholder="Ex: vêtements, documents, accessoires"
            value={contentDescription}
            onChange={(e) => setContentDescription(e.target.value)}
            maxLength={300}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            placeholder="Instructions spéciales, description..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </div>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-warning/50 bg-warning/5 cursor-pointer">
          <Checkbox
            checked={forbiddenAck}
            onCheckedChange={(v) => setForbiddenAck(v === true)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">Objets interdits</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Je confirme que mon colis ne contient aucun objet interdit (substances illicites, armes, matières dangereuses, etc.)
            </p>
          </div>
        </label>

        <Button onClick={handleSubmit} disabled={loading} className="w-full maak-primary-btn" size="lg">
          <Package className="h-4 w-4 mr-2" />
          {loading ? "Publication..." : "Publier la demande"}
        </Button>
      </div>
    </div>
  );
}
