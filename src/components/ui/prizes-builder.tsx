"use client";

import React from "react";
import { PrizeTier, PrizeType } from "@/lib/db/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Trophy,
  DollarSign,
  Gift,
  Smartphone,
  Laptop,
  Glasses,
  Cloud,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export const CURRENCIES = [
  { symbol: "$", label: "USD ($) - US Dollar" },
  { symbol: "€", label: "EUR (€) - Euro" },
  { symbol: "£", label: "GBP (£) - British Pound" },
  { symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { symbol: "C$", label: "CAD (C$) - Canadian Dollar" },
  { symbol: "A$", label: "AUD (A$) - Australian Dollar" },
  { symbol: "₿", label: "BTC (₿) - Bitcoin" },
  { symbol: "ETH", label: "ETH (Ξ) - Ethereum" },
];

const NON_CASH_PRESETS = [
  { label: "Smartphone / Mobile", name: "Apple iPhone 16 Pro (256GB)", icon: Smartphone },
  { label: "Laptop / Computer", name: "Apple MacBook Pro M3 (16GB)", icon: Laptop },
  { label: "VR / AR Headset", name: "Meta Quest 3 (512GB)", icon: Glasses },
  { label: "Cloud Credits", name: "$5,000 Cloud & API Credits", icon: Cloud },
  { label: "Swag & Trophy", name: "Custom Winner Trophy + Swag Box", icon: Trophy },
];

interface PrizesBuilderProps {
  currency: string;
  onCurrencyChange: (currency: string) => void;
  prizes: PrizeTier[];
  onPrizesChange: (prizes: PrizeTier[]) => void;
}

export function PrizesBuilder({
  currency,
  onCurrencyChange,
  prizes,
  onPrizesChange,
}: PrizesBuilderProps) {
  const addPrizeTier = (type: PrizeType = "cash") => {
    const nextRank = prizes.length + 1;
    const defaultTitle =
      nextRank === 1
        ? "1st Place"
        : nextRank === 2
        ? "2nd Place"
        : nextRank === 3
        ? "3rd Place"
        : `Track Prize #${nextRank - 3}`;

    onPrizesChange([
      ...prizes,
      {
        id: crypto.randomUUID(),
        title: defaultTitle,
        type,
        amount: type === "cash" ? "5000" : "",
        item_name: type === "non-cash" ? "Latest Smartphone / Mobile Device" : undefined,
        description: "",
      },
    ]);
  };

  const updatePrize = (index: number, updated: Partial<PrizeTier>) => {
    onPrizesChange(
      prizes.map((p, idx) => (idx === index ? { ...p, ...updated } : p))
    );
  };

  const removePrize = (index: number) => {
    if (prizes.length <= 1) return;
    onPrizesChange(prizes.filter((_, idx) => idx !== index));
  };

  // Calculate sum of numeric cash prize amounts
  const totalCashAmount = prizes
    .filter((p) => p.type !== "non-cash")
    .reduce((acc, curr) => {
      const amountStr = curr?.amount != null ? String(curr.amount) : "";
      const num = parseFloat(amountStr.replace(/[^0-9.]/g, "")) || 0;
      return acc + num;
    }, 0);

  // Non-cash count
  const nonCashTiers = prizes.filter((p) => p.type === "non-cash");

  return (
    <div className="space-y-4">
      {/* Currency Selection & Total Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center p-4 rounded-2xl bg-muted/30 border">
        <div className="space-y-1.5">
          <Label htmlFor="currency-select" className="text-xs font-semibold">
            Prize Currency
          </Label>
          <select
            id="currency-select"
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="w-full h-10 rounded-full border border-input bg-card px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
          >
            {CURRENCIES.map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:text-right space-y-0.5">
          <div className="text-xs text-muted-foreground">Calculated Prize Pool</div>
          <div className="text-2xl font-black text-primary tracking-tight">
            {totalCashAmount > 0 ? (
              <>
                {currency}
                {totalCashAmount.toLocaleString()}
                {nonCashTiers.length > 0 && " + Devices & Perks"}
              </>
            ) : nonCashTiers.length > 0 ? (
              "Devices, Tech Gear & Perks"
            ) : (
              `${currency}0`
            )}
          </div>
          {nonCashTiers.length > 0 && (
            <div className="text-[0.7rem] text-muted-foreground font-medium">
              Includes {nonCashTiers.length} non-cash/hardware {nonCashTiers.length === 1 ? "prize" : "prizes"}
            </div>
          )}
        </div>
      </div>

      {/* Prize Tiers List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Trophy className="size-3.5 text-primary" /> Prize Breakdown & Winner Tiers ({prizes.length})
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addPrizeTier("cash")}
              className="rounded-full gap-1.5 text-xs h-8 cursor-pointer"
            >
              <DollarSign className="size-3.5 text-emerald-500" />
              Add Cash Prize
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addPrizeTier("non-cash")}
              className="rounded-full gap-1.5 text-xs h-8 cursor-pointer bg-primary/5 hover:bg-primary/10 border-primary/20"
            >
              <Gift className="size-3.5 text-primary" />
              Add Non-Cash Prize (Mobile/Devices)
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {prizes.map((tier, idx) => {
            const isNonCash = tier.type === "non-cash";

            return (
              <div
                key={tier.id || idx}
                className={`p-4 rounded-2xl border bg-card space-y-3 shadow-2xs transition-all ${
                  isNonCash ? "border-primary/40 bg-primary/2" : "hover:border-primary/30"
                }`}
              >
                {/* Header row: Rank, Title, Type Switcher & Delete */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <div className="size-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>

                    <Input
                      value={tier.title}
                      onChange={(e) => updatePrize(idx, { title: e.target.value })}
                      placeholder="Prize Title (e.g. 1st Place, Best Mobile App)"
                      className="h-8.5 rounded-full text-xs font-bold"
                    />
                  </div>

                  {/* Cash vs Non-Cash Selector */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center p-0.5 rounded-full border bg-muted/40 text-xs">
                      <button
                        type="button"
                        onClick={() => updatePrize(idx, { type: "cash" })}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          !isNonCash
                            ? "bg-background text-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <DollarSign className="size-3 text-emerald-500" />
                        Cash
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updatePrize(idx, {
                            type: "non-cash",
                            item_name: tier.item_name || "Apple iPhone 16 Pro",
                          })
                        }
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isNonCash
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Gift className="size-3" />
                        Non-Cash (Device)
                      </button>
                    </div>

                    {/* Delete button */}
                    {prizes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removePrize(idx)}
                        className="size-8 text-muted-foreground hover:text-destructive rounded-full shrink-0"
                        title="Remove prize tier"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Body: Inputs depending on Cash vs Non-Cash */}
                {isNonCash ? (
                  <div className="space-y-2.5 pt-1">
                    {/* Physical Item / Hardware Name */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold flex items-center gap-1 text-primary">
                        <Smartphone className="size-3" /> Reward Item / Device Name *
                      </Label>
                      <Input
                        value={tier.item_name || ""}
                        onChange={(e) => updatePrize(idx, { item_name: e.target.value })}
                        placeholder="e.g. Apple iPhone 16 Pro (256GB), MacBook Pro M3, Meta Quest 3"
                        className="h-8.5 rounded-full text-xs font-semibold bg-background"
                      />
                    </div>

                    {/* Quick Item Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        Quick presets:
                      </span>
                      {NON_CASH_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() =>
                            updatePrize(idx, {
                              item_name: preset.name,
                              amount: "",
                            })
                          }
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-medium border bg-background hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Details / Fulfillment Description */}
                    <div className="space-y-1">
                      <Input
                        value={tier.description || ""}
                        onChange={(e) => updatePrize(idx, { description: e.target.value })}
                        placeholder="Fulfillment & details (e.g. Brand-new sealed device shipped worldwide to winner)"
                        className="h-8.5 rounded-full text-xs bg-background"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Cash Amount */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Cash Prize Amount ({currency}) *
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                          {currency}
                        </span>
                        <Input
                          value={tier.amount}
                          onChange={(e) => updatePrize(idx, { amount: e.target.value })}
                          placeholder="25000"
                          className="h-8.5 rounded-full pl-7 text-xs font-semibold bg-background"
                        />
                      </div>
                    </div>

                    {/* Description / Extra Perks */}
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Prize Perks & Description (Optional)
                      </Label>
                      <Input
                        value={tier.description || ""}
                        onChange={(e) => updatePrize(idx, { description: e.target.value })}
                        placeholder="e.g. Awarded to highest overall score across all judging categories"
                        className="h-8.5 rounded-full text-xs bg-background"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
