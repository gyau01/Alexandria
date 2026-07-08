"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "../../supabase/supabase";
import { User } from "@supabase/supabase-js";

type Option = {
  id: number;
  name: string;
  description: string;
  amount: number;
};

const MIN = 2;

export default function OptionCard({
  user,
  options,
}: {
  user: User | null;
  options: Option[];
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasEnough = selected.size >= MIN;

  const handleCheckout = async () => {
    if (!user) {
      window.location.href = "/sign-in?redirect=pricing";
      return;
    }

    // Bitmask sum: each option.id is a power of 2, so this sum is a
    // unique key per combination of selected options.
    const planKey = Array.from(selected).reduce((sum, id) => sum + id, 0);

    try {
      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-create-checkout",
        {
          body: {
            plan_key: planKey,
            user_id: user.id,
            return_url: `${window.location.origin}/dashboard`,
          },
          headers: {
            "X-Customer-Email": user.email || "",
          },
        },
      );

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {options.map((option) => {
          const isSelected = selected.has(option.id);
          return (
            <div
              key={option.id}
              onClick={() => toggle(option.id)}
              className="relative rounded-2xl overflow-hidden cursor-pointer transition-all bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 border border-blue-600/50 shadow-xl"
            >
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
              <div className="relative p-8 text-white">
                <div className="inline-flex items-center px-4 py-1.5 text-xs font-semibold rounded-full border bg-blue-600/20 text-blue-300 border-blue-400/30">
                  FEATURE
                </div>
                <h3 className="text-2xl font-bold mb-3">{option.name}</h3>
                <p className="text-blue-100 mb-6 text-lg">
                  {option.description}
                </p>
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-blue-400 border-blue-400"
                      : "border-blue-500"
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-12">
        <button
          disabled={!hasEnough}
          onClick={handleCheckout}
          className={`px-12 py-4 rounded-xl font-bold text-lg transition-all ${
            hasEnough
              ? "bg-white text-blue-700 hover:bg-blue-50"
              : "bg-blue-800 text-blue-400 cursor-not-allowed"
          }`}
        >
          {hasEnough
            ? "Continue to checkout"
            : `Select ${MIN - selected.size} more to continue`}
        </button>
      </div>
    </div>
  );
}
