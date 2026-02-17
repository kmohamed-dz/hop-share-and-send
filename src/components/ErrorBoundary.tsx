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
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
          <div className="max-w-sm space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h1 className="text-xl font-bold text-foreground">Oups, l'application a rencontré une erreur.</h1>
            <p className="text-sm text-muted-foreground">
              Rechargez la page. Si le problème persiste, vérifiez la connexion puis réessayez.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="maak-primary-btn w-full"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
