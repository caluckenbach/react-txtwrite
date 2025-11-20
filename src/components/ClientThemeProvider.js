'use client';

import React, { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';

export default function ClientThemeProvider({ children }) {
    // This helps prevent hydration mismatch
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // On first render, we don't want to show any theme-related content
    // to prevent hydration mismatches
    if (!mounted) {
        return (
            <div style={{ visibility: 'hidden' }}>
                {children}
            </div>
        );
    }

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            enableColorScheme={false}
        >
            {children}
        </ThemeProvider>
    );
}