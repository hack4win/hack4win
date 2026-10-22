"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: "Is it completely free to participate in hackathons on Hack4Win?",
      answer:
        "Yes, joining as a participant or builder is 100% free! You can register for all active competitions, explore API credits from sponsors, form teams, and submit your builds without any fees.",
      category: "General",
    },
    {
      question: "Can I participate solo, or do I need to be in a team?",
      answer:
        "Both! You are completely welcome to build and submit as a solo participant. If you prefer to collaborate, our two-way matchmaking lets you send email invitations or connect with builders searching for your specific skill set (Frontend, AI Engineering, UI/UX, or Backend).",
      category: "Teams",
    },
    {
      question: "How does the project judging and 50-point rubric work?",
      answer:
        "Our platform uses a transparent 50-point rubric across 5 balanced criteria (10 points each): Innovation & Originality, Technical Architecture, UI/UX Design & Polish, Potential Real-World Impact, and Demo Presentation. Verified industry judges grade each dimension and provide qualitative critique feedback.",
      category: "Judging",
    },
    {
      question: "Who retains the Intellectual Property (IP) of projects built here?",
      answer:
        "You and your team retain 100% ownership of all source code, design assets, and intellectual property you create. Hack4Win and hackathon sponsors claim zero equity or IP rights over your software.",
      category: "Legal & IP",
    },
    {
      question: "How and when are cash prizes and awards distributed?",
      answer:
        "Once judging concludes and official winners are announced on the public leaderboard, cash prizes are disbursed directly to team leads via Stripe, bank wire, or PayPal within 7-14 business days. Cloud credits and hardware awards are fulfilled directly by challenge sponsors.",
      category: "Prizes",
    },
    {
      question: "How can company sponsors or dev ecosystems host a hackathon?",
      answer:
        "Organizers and DevRel teams can spin up branded hackathons with custom prize structures, custom tracks, markdown rulebooks, and dedicated judging consoles. Use the 'Host a Hackathon' button in the navbar to get started.",
      category: "Organizers",
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="mt-28 w-full text-left space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Badge
          variant="outline"
          className="rounded-full px-3 py-1 text-xs font-bold gap-1.5 border-primary/30 text-primary bg-primary/10"
        >
          <HelpCircle className="size-3.5" /> Frequently Asked Questions
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Got Questions? We&apos;ve Got Answers
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Everything you need to know about competing, forming squads, and winning prizes on Hack4Win.
        </p>
      </div>

      {/* Accordion Container */}
      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen ? "bg-card border-primary/40 shadow-xs" : "bg-card/60 hover:bg-card border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFAQ(index)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                aria-expanded={isOpen}
              >
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-primary">
                    {faq.category}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {faq.question}
                  </h3>
                </div>
                <div
                  className={`size-8 rounded-full border flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180 bg-primary text-primary-foreground border-primary" : "text-muted-foreground"
                  }`}
                >
                  <ChevronDown className="size-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-muted/50 animate-in fade-in slide-in-from-top-1 duration-200">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
