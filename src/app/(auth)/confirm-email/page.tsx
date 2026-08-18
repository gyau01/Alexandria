"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ConfirmEmailPage() {
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Hash keeps the real Supabase verify URL off the network during Safe Links prefetch.
    const hash = window.location.hash.replace(/^#/, "").trim();
    if (hash) setConfirmationUrl(decodeURIComponent(hash));
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

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: "email",
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      setSuccess("Email confirmed. Redirecting…");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Confirm your email</CardTitle>
          <CardDescription>
            Finish verifying your Alexandria account. School Outlook accounts
            sometimes break email links — use the code from your email if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {safeConfirmationUrl && (
            <div className="space-y-3">
              <Button className="w-full" size="lg" onClick={handleConfirmClick}>
                Confirm email address
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This extra click protects against Microsoft Safe Links
                auto-opening confirmation URLs.
              </p>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@louisville.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">6-digit code from email</Label>
              <Input
                id="token"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                required
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\s/g, ""))}
                placeholder="123456"
                className="tracking-[0.3em] text-center text-lg font-semibold"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-600" role="status">
                {success}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying…" : "Verify code"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
