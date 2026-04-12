"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

export function VisitTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname) return;
        
        // Skip tracking admin interfaces, API routes and specific functional pages (like /quiz)
        if (
            pathname.startsWith("/admin") || 
            pathname.startsWith("/api") ||
            pathname.startsWith("/quiz")
        ) {
            return;
        }

        api.recordVisit(pathname).catch(() => {});
    }, [pathname]);

    return null;
}
