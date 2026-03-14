"use client";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }));
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Scaff — AI Architecture Generator</title>
        <meta name="description" content="Describe your product idea. Get a production-grade system architecture in seconds." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@300;400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* Animated mesh background */}
        <div className="mesh-root"><div className="mesh-mid" /></div>
        <div className="mesh-grid" />
        <div className="mesh-grain" />

        <QueryClientProvider client={qc}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
