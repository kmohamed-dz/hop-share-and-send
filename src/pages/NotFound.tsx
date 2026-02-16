import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    // Auto-redirect to home after 3 seconds
    const timer = setTimeout(() => navigate("/", { replace: true }), 3000);
    return () => clearTimeout(timer);
  }, [location.pathname, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <h1 className="mb-2 text-5xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-lg text-muted-foreground">Page introuvable</p>
        <p className="mb-6 text-sm text-muted-foreground">
          Redirection automatique vers l'accueil...
        </p>
        <Button
          onClick={() => navigate("/", { replace: true })}
          className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Home className="h-4 w-4" />
          Retour a l'accueil
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
