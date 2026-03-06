"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorFallback } from "@/components/errors/ErrorFallback";
import { captureRouteException } from "@/lib/sentry";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  route?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void captureRouteException(error, {
      route: this.props.route ?? "client-error-boundary",
      requestId: "client-error-boundary",
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          fullScreen
        />
      );
    }

    return this.props.children;
  }
}
