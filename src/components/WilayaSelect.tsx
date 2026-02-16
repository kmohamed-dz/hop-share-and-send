import { WILAYAS } from "@/data/wilayas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WilayaSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function WilayaSelect({ value, onValueChange, placeholder = "Sélectionner une wilaya" }: WilayaSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {WILAYAS.map((w) => (
          <SelectItem key={w.code} value={w.name}>
            {w.code} - {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
