"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { User } from "@supabase/supabase-js";

type Option = {
  id: number;
  name: string;
  description: string;
};

const OPTIONS: Option[] = [
  { id: 8, name: "Unlimited Chats", description: "As many chats as you want" },
  { id: 4, name: "Unlimited Matching", description: "As many matches as you want" },
  { id: 2, name: "10 Total Matches", description: "Up to 10 total matches" },
  { id: 1, name: "Unlimited Discussion Board Posts", description: "As many discussion board posts as you want" },
];

const MIN = 2;

export default function MakePlan() {
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

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

    const planKey = [...selected].reduce((sum, id) => sum + id, 0);

    try {
      const { data, error } = await supabase.functions.invoke("supabase-functions-create-checkout", {
        body: {
          plan_key: planKey,
          user_id: user.id,
          return_url: `${window.location.origin}/dashboard`,
        },
        headers: {
          "X-Customer-Email": user.email || "",
        },
      });
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
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((option) => {
          const isSelected = selected.has(option.id);
          return (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-blue-400 bg-blue-600/20"
                  : "border-blue-700 bg-blue-900/40 hover:border-blue-500"
              }`}
            >
              <p className="text-white font-semibold">{option.name}</p>
              <p className="text-blue-200 text-sm">{option.description}</p>
            </button>
          );
        })}
      </div>

      <button
        disabled={!hasEnough}
        onClick={handleCheckout}
        className={`mt-6 w-full py-4 rounded-xl font-bold transition-all ${
          hasEnough
            ? "bg-white text-blue-700 hover:bg-blue-50"
            : "bg-blue-800 text-blue-400 cursor-not-allowed"
        }`}
      >
        {hasEnough ? "Continue to checkout" : `Select ${MIN - selected.size} more to continue`}
      </button>
    </div>
  );
}
