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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Une erreur est survenue</h1>
            <p className="mt-2 text-sm text-muted-foreground">Rechargez la page ou réessayez dans quelques instants.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
