"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ThemeProvider } from "../contexts/ThemeContext.tsx";

interface ClientThemeProviderProps {
  children: ReactNode;
}

export default function ClientThemeProvider(
  { children }: ClientThemeProviderProps,
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ visibility: "hidden" }}>
        {children}
      </div>
    );
  }

  return <ThemeProvider>{children}</ThemeProvider>;
}
