"use client";

import { useAuthStore } from "@/store/auth-store";

export function UserInfoDisplay() {
  const { isLoggedIn, username } = useAuthStore();

  if (!isLoggedIn || !username) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 px-3 py-1.5 rounded-full text-xs text-slate-300 shadow-lg">
      👤 {username}
    </div>
  );
}