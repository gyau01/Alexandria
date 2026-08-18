"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ConfirmEmailPage() {
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Hash keeps the real Supabase verify URL off the network during Safe Links prefetch.
    const hash = window.location.hash.replace(/^#/, "").trim();
    if (hash) {
      setConfirmationUrl(decodeURIComponent(hash));
    } else {
      setError(
        "This confirmation link is missing or invalid. Please request a new confirmation email."
      );
    }
  }, []);

  const safeConfirmationUrl = useMemo(() => {
    if (!confirmationUrl) return null;
    try {
      const url = new URL(confirmationUrl);
      if (!url.hostname.endsWith("supabase.co")) return null;
      if (!url.pathname.includes("/auth/v1/verify")) return null;
      return url.toString();
    } catch {
      return null;
    }
  }, [confirmationUrl]);

  const handleConfirmClick = () => {
    if (!safeConfirmationUrl) return;
    window.location.href = safeConfirmationUrl;
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Confirm your email</CardTitle>
          <CardDescription>
            Finish verifying your Alexandria account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {safeConfirmationUrl ? (
            <>
              <Button className="w-full" size="lg" onClick={handleConfirmClick}>
                Confirm email address
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This extra click protects against Microsoft Safe Links
                auto-opening confirmation URLs.
              </p>
            </>
          ) : (
            <p className="text-sm text-destructive text-center" role="alert">
              {error || "Invalid confirmation link."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
