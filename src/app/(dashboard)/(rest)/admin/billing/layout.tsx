import { ReactNode } from "react";
import { Fraunces, Manrope } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function AdminBillingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={`min-h-screen ${fraunces.variable} ${manrope.variable}`}
      style={{
        background:
          "radial-gradient(circle at top left, #fff4da 0%, transparent 55%), radial-gradient(circle at 70% 20%, #e5f7ef 0%, transparent 55%), linear-gradient(120deg, #fdf7ef 0%, #f6f0e6 100%)",
        fontFamily: "var(--font-manrope), 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
