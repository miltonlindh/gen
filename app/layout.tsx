// app/layout.tsx
import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "Offert MVP",
  description: "Trial → Offert → PDF → E-post",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white border rounded-2xl shadow-sm">
            <header className="border-b">
              <nav className="flex gap-4 p-4 text-sm">
                <a href="/" className="font-semibold">Offert MVP</a>
                <a href="/trial">Trial</a>
                <a href="/quotes/new">Ny offert</a>
              </nav>
            </header>
            <main className="p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
