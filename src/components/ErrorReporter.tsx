"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errorReport";

/* Listens for errors nobody caught anywhere on the site and passes them to reportError. Renders nothing. */
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      // Errors from browser extensions and other sites' scripts carry no useful detail ("Script error.").
      if (!ev.error && /^Script error/i.test(ev.message || "")) return;
      reportError(ev.error || ev.message, { kind: "uncaught" });
    };
    const onRejection = (ev: PromiseRejectionEvent) => reportError(ev.reason, { kind: "promise" });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
