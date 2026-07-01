"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareText, CheckCircle2, Loader2, Send } from "lucide-react";

const CATEGORIES = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Report a bug" },
  { value: "feature", label: "Feature request" },
  { value: "account", label: "Account / billing" },
  { value: "other", label: "Other" },
];

export default function FeedbackSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send feedback");
      }

      setIsSuccess(true);
      setName("");
      setEmail("");
      setCategory("general");
      setMessage("");

      setTimeout(() => setIsSuccess(false), 6000);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6 shadow-lg">
            <MessageSquareText className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Send Us Your{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Feedback
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Found a bug or have an idea? Send a note straight to our technical
            team and help us make Cramly better.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Feedback received!
              </h3>
              <p className="text-gray-600">
                Thanks for helping us improve. Our team will review your message.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="fb-name"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Name <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    id="fb-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 text-base"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label
                    htmlFor="fb-email"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Email <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    id="fb-email"
                    type="email"
                    placeholder="you@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-base"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="fb-category"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Topic
                </label>
                <select
                  id="fb-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-md border border-input bg-white px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="fb-message"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Your feedback
                </label>
                <Textarea
                  id="fb-message"
                  placeholder="Tell us what's on your mind..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={5000}
                  rows={6}
                  className="text-base"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {message.length}/5000
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Feedback
                    <Send className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          We read every message. Leave your email if you&apos;d like us to follow
          up.
        </p>
      </div>
    </section>
  );
}
