import logo from "@/assets/brand/maak-logo.svg";
import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg";

const sizeClasses: Record<BrandLogoSize, string> = {
  sm: "h-8",
  md: "h-14",
  lg: "h-32",
};

export function BrandLogo({ size = "md", className }: { size?: BrandLogoSize; className?: string }) {
  return <img src={logo} alt="Logo MAAK" className={cn("w-auto object-contain", sizeClasses[size], className)} />;
}
