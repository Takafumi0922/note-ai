"use client";

import { SessionProvider } from "next-auth/react";

// セッションプロバイダーラッパー
export function Providers({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}
