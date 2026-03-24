"use client";

import { useState } from "react";

type CheckoutButtonProps = {
  productKey: string;
  tierKey: string;
  externalCustomerId?: string;
  customerEmail?: string;
  customerName?: string;
  disabled?: boolean;
  label?: string;
};

export const CheckoutButton = ({
  productKey,
  tierKey,
  externalCustomerId,
  customerEmail,
  customerName,
  disabled,
  label = "Start checkout",
}: CheckoutButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (disabled || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/polar/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productKey,
          tierKey,
          externalCustomerId,
          customerEmail,
          customerName,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Checkout failed.");
        setIsLoading(false);
        return;
      }

      // Redirect to Polar checkout
      window.location.href = payload.url;
    } catch (error) {
      void error;
      setError("Checkout failed.");
      setIsLoading(false);
    }
  };

  if (disabled) {
    return (
      <div className="w-full">
        <button
          className="w-full cursor-not-allowed rounded-full border border-dashed border-black/30 px-4 py-2 text-sm font-semibold text-black/50"
          disabled
          type="button"
        >
          {label}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="block w-full rounded-full bg-black px-4 py-2 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
        type="button"
      >
        {isLoading ? "Opening checkout..." : label}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};
