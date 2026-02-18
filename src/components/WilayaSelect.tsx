import { getWilayaLabel, WILAYAS } from "@/data/wilayas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppLanguage } from "@/contexts/LanguageContext";

interface WilayaSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function WilayaSelect({ value, onValueChange, placeholder = "Sélectionner une wilaya" }: WilayaSelectProps) {
  const { language } = useAppLanguage();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {WILAYAS.map((w) => (
          <SelectItem key={w.code} value={w.name_fr}>
            {w.code} - {getWilayaLabel(w, language)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
