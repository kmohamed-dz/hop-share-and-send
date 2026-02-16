import { MessageCircle } from "lucide-react";

export default function Messages() {
  return (
    <div className="mobile-page">
      <div className="pb-4">
        <h1 className="maak-section-title">Messages</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-medium">Aucun message</p>
        <p className="text-sm text-muted-foreground mt-1">Vos conversations apparaîtront ici</p>
      </div>
    </div>
  );
}
