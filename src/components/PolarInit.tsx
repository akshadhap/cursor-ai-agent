"use client";

import { useEffect } from "react";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";

export function PolarInit() {
  useEffect(() => {
    PolarEmbedCheckout.init();
  }, []);

  return null;
}
