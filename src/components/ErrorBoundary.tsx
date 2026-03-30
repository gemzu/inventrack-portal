"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="glass-card p-10 max-w-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-warning" />
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={this.handleReset}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
