"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-line shadow-lg font-sans bg-white text-fg",
        },
      }}
    />
  );
}
