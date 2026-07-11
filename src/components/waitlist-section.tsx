"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join waitlist");
      }

      setIsSuccess(true);
      setEmail("");
      setName("");
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-indigo-50 via-blue-50 to-background dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-background relative overflow-hidden">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
            Get Early Access
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Be among the first to experience Cramly. Join our waitlist and get notified when we launch!
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-8 md:p-12 border border-border">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-950 rounded-full mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                You're on the list!
              </h3>
              <p className="text-muted-foreground">
                We'll notify you as soon as Cramly is ready. Thanks for your interest!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 text-base"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !email || !name}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Joining Waitlist...
                  </>
                ) : (
                  <>
                    Join Waitlist
                    <Mail className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          We respect your privacy. Your information will only be used to notify you about Cramly's launch.
        </p>
      </div>
    </section>
  );
}

