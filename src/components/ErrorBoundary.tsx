import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Erreur applicative:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const language =
        typeof window !== "undefined" && window.localStorage.getItem("maak_lang") === "ar" ? "ar" : "fr";

      const title =
        language === "ar" ? "عذراً، حدث خطأ داخل التطبيق." : "Oups, l'application a rencontré une erreur.";
      const description =
        language === "ar"
          ? "أعد تحميل الصفحة. إذا استمرت المشكلة، تحقق من الاتصال ثم أعد المحاولة."
          : "Rechargez la page. Si le problème persiste, vérifiez la connexion puis réessayez.";
      const reloadLabel = language === "ar" ? "إعادة التحميل" : "Recharger";

      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
          <div className="max-w-sm space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="maak-primary-btn w-full"
            >
              {reloadLabel}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
