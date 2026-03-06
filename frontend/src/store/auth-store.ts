import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    username: string | null;
    isAdmin: boolean;
    isLoggedIn: boolean;
    setAuth: (token: string, username: string, isAdmin: boolean) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            username: null,
            isAdmin: false,
            isLoggedIn: false,

            setAuth: (token, username, isAdmin) =>
                set({
                    token,
                    username,
                    isAdmin,
                    isLoggedIn: true
                }),

            clearAuth: () =>
                set({
                    token: null,
                    username: null,
                    isAdmin: false,
                    isLoggedIn: false
                }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
