"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  HelpCircle,
} from "lucide-react";

export type ModalAlertType = "info" | "success" | "warning" | "error" | "question";

export interface AlertOptions {
  title?: string;
  message: string;
  type?: ModalAlertType;
  confirmText?: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  type?: "question" | "warning" | "error";
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ModalAlertContextType {
  showAlert: (options: AlertOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ModalAlertContext = createContext<ModalAlertContextType | null>(null);

export function ModalAlertProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ModalAlertType>("info");
  const [confirmText, setConfirmText] = useState("OK");
  const [cancelText, setCancelText] = useState("Cancel");
  const [isDestructive, setIsDestructive] = useState(false);

  const resolveRef = useRef<((val?: boolean) => void) | null>(null);

  const showAlert = useCallback((opts: AlertOptions | string) => {
    return new Promise<void>((resolve) => {
      resolveRef.current = () => resolve();
      const options: AlertOptions = typeof opts === "string" ? { message: opts } : opts;

      setIsConfirm(false);
      setTitle(options.title || (options.type === "error" ? "Notice" : "Information"));
      setMessage(options.message);
      setType(options.type || (options.title?.toLowerCase().includes("error") ? "error" : "info"));
      setConfirmText(options.confirmText || "OK");
      setIsDestructive(false);
      setIsOpen(true);
    });
  }, []);

  const showConfirm = useCallback((opts: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = (confirmed?: boolean) => resolve(Boolean(confirmed));
      const options: ConfirmOptions = typeof opts === "string" ? { message: opts } : opts;

      setIsConfirm(true);
      setTitle(options.title || "Confirm Action");
      setMessage(options.message);
      setType(options.type || (options.destructive ? "warning" : "question"));
      setConfirmText(options.confirmText || (options.destructive ? "Delete" : "Confirm"));
      setCancelText(options.cancelText || "Cancel");
      setIsDestructive(options.destructive ?? false);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      if (isConfirm) {
        resolveRef.current(true);
      } else {
        resolveRef.current(undefined);
      }
      resolveRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      if (isConfirm) {
        resolveRef.current(false);
      } else {
        resolveRef.current(undefined);
      }
      resolveRef.current = null;
    }
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return (
          <div className="size-11 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <AlertCircle className="size-6 text-destructive" />
          </div>
        );
      case "warning":
        return (
          <div className="size-11 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
          </div>
        );
      case "success":
        return (
          <div className="size-11 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        );
      case "question":
        return (
          <div className="size-11 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <HelpCircle className="size-6 text-primary" />
          </div>
        );
      case "info":
      default:
        return (
          <div className="size-11 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Info className="size-6 text-primary" />
          </div>
        );
    }
  };

  return (
    <ModalAlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl gap-5 border shadow-xl bg-card">
          <div className="flex items-start gap-4">
            {getIcon()}
            <div className="flex-1 space-y-1.5 pt-0.5">
              <DialogTitle className="text-lg font-black text-foreground tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {message}
              </DialogDescription>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/50 bg-transparent -mx-6 -mb-6 p-4 px-6 rounded-b-3xl">
            {isConfirm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="rounded-full text-xs font-semibold px-4 cursor-pointer"
              >
                {cancelText}
              </Button>
            )}
            <Button
              type="button"
              variant={isDestructive ? "destructive" : "default"}
              size="sm"
              onClick={handleConfirm}
              className={`rounded-full text-xs font-bold px-5 cursor-pointer shadow-xs ${
                !isDestructive && type === "success" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
              }`}
              autoFocus
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModalAlertContext.Provider>
  );
}

export function useModalAlert(): ModalAlertContextType {
  const context = useContext(ModalAlertContext);
  if (!context) {
    // Provide a resilient fallback in environments or tests where provider isn't mounted
    return {
      showAlert: async (opts) => {
        const text = typeof opts === "string" ? opts : opts.message;
        console.warn("[ModalAlert Fallback]:", text);
      },
      showConfirm: async (opts) => {
        const text = typeof opts === "string" ? opts : opts.message;
        console.warn("[ModalConfirm Fallback]:", text);
        return true;
      },
    };
  }
  return context;
}
