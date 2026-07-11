"use client";

import { HelpCircle, Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    question: "How is Alexandria different from other study apps?",
    answer:
      "Alexandria isn't a generic social network — it's built specifically for students who want compatible study partners. We match you based on shared classes, study times, locations, and learning style so you connect with people who actually fit how you work — not just whoever is online.",
  },
  {
    question: "Who is Alexandria for?",
    answer:
      "Any university student looking for a reliable study buddy. Whether you're a freshman finding your rhythm or a senior prepping for finals, Alexandria helps you find partners in your major, your classes, or your study habits. If you want structure, accountability, and less study stress, you're in the right place.",
  },
  {
    question: "Can Alexandria help me find partners for my exams?",
    answer:
      "Yes. Our matching algorithm scores compatibility using your enrolled classes, major, year, study preferences, and availability. You can chat with matches, form study groups, and coordinate sessions — all inside the platform.",
  },
  {
    question: "How does Alexandria protect my data?",
    answer:
      "We use university email verification, encrypted connections, and enterprise-grade security through Supabase. Your profile is only shared with matched study partners, and you control what appears on your public profile in Settings.",
  },
  {
    question: "Does Alexandria work at my school?",
    answer:
      "Alexandria is designed for university students. Sign up with your school email, add your classes and preferences, and we'll surface compatible students at your institution as more peers join.",
  },
  {
    question: "What do I do if I'm not getting good matches?",
    answer:
      "Complete your profile with accurate classes and study preferences — matching quality depends on it. Try Rematch to refresh your results, or adjust whether you prefer specific class matching vs. broader subject matching in your profile settings.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "Go to Dashboard → Settings → Billing and open the billing portal. You can manage or cancel your plan there. Your access continues until the end of the current billing period.",
  },
  {
    question: "What are the limits on the free plan?",
    answer:
      "The free Starter plan includes basic study preferences, finding study partners, and messaging with matches. Paid plans unlock more rematches, additional matches, unlimited chats, and more discussion board posts — see Pricing for details.",
  },
];

export default function FaqSection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-blue-50 via-indigo-50/80 to-background dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-background relative overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: heading */}
          <div className="lg:sticky lg:top-24">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6 shadow-lg">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
            <span className="inline-block rounded-full border border-blue-200 dark:border-blue-800 bg-blue-600/10 px-4 py-1.5 text-xs font-semibold lowercase tracking-wide text-blue-700 dark:text-blue-300 mb-6">
              frequently asked questions
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
              Got{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">
                questions?
              </span>
            </h2>
            <p className="mt-1 text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
              We&apos;ve got
            </p>
            <p className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
              answers
            </p>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              Everything you need to know about finding study partners with
              Alexandria.
            </p>
          </div>

          {/* Right: accordion card */}
          <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-10">
            <Accordion
              type="single"
              collapsible
              className="w-full"
              defaultValue="item-0"
            >
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-b border-dashed border-border last:border-b-0"
                >
                  <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline hover:text-blue-600 dark:hover:text-blue-400 [&>svg]:hidden [&[data-state=open]_.faq-plus]:rotate-45 [&[data-state=open]]:text-blue-600 dark:[&[data-state=open]]:text-blue-400">
                    <span className="flex-1 pr-4">{item.question}</span>
                    <span className="faq-plus flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 transition-transform duration-200">
                      <Plus className="h-4 w-4" />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
