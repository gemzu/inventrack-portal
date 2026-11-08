"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errorReport";
import { Button } from "@/components/ui/button";

/* Shown when a page crashes outside the dashboard's own error boundary. The crash is reported. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportError(error, { kind: "page-crash" }); }, [error]);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">This page hit a problem. It has been reported. Try again, or reload the page.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
