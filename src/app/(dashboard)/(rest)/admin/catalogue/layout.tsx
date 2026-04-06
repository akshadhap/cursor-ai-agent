import { ReactNode } from "react";

export default function AdminCatalogueLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at top left, #fff4da 0%, transparent 55%), radial-gradient(circle at 70% 20%, #e5f7ef 0%, transparent 55%), linear-gradient(120deg, #fdf7ef 0%, #f6f0e6 100%)",
      }}
    >
      {children}
    </div>
  );
}
