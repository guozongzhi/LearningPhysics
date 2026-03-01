"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { SiteLogo } from "@/components/site-logo";

export default function AdminLoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const data = await authApi.login(username, password);
            if (!data.is_admin) {
                setError("该账户没有管理员权限");
                authApi.logout();
                setIsLoading(false);
                return;
            }
            router.push("/admin");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error("登录错误详情:", errorMessage);
            if (errorMessage.includes("401")) {
                setError("用户名或密码错误");
            } else if (errorMessage.includes("Connect")) {
                setError("无法连接到服务器，请检查API地址配置");
            } else {
                setError(`登录失败: ${errorMessage.substring(0, 100)}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left Panel — Brand */}
            <div
                className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
                style={{
                    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0ea5e9 100%)",
                }}
            >
                <div>
                    <SiteLogo showText />
                </div>
                <div className="space-y-6">
                    <h2 className="text-4xl font-bold text-white leading-tight">
                        后台管理系统
                    </h2>
                    <p className="text-lg text-blue-200 max-w-md leading-relaxed">
                        安全地管理平台资源，分析学生数据，并控制 AI 引擎的核心配置。
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
                            <div className="text-2xl mb-1">👥</div>
                            <div className="text-xs text-blue-200">用户控制</div>
                        </div>
                        <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
                            <div className="text-2xl mb-1">📝</div>
                            <div className="text-xs text-blue-200">题库维护</div>
                        </div>
                        <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
                            <div className="text-2xl mb-1">⚙️</div>
                            <div className="text-xs text-blue-200">系统追踪</div>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-blue-300/60">
                    © 2025 LearningPhysics. All rights reserved.
                </p>
            </div>

            {/* Right Panel — Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-slate-950 text-slate-100">
                <div className="w-full max-w-md space-y-8">
                    <div className="lg:hidden text-center mb-8">
                        <div className="flex justify-center">
                            <SiteLogo />
                        </div>
                        <p className="text-sm text-slate-400 mt-1">后台管理系统</p>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-100">管理员登录</h2>
                        <p className="text-slate-400">
                            请输入管理员凭证以访问系统控制台
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-slate-300">管理员账号</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="输入管理员用户名"
                                required
                                className="h-11 bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500 focus-visible:border-sky-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">密码</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="请输入密码"
                                required
                                className="h-11 bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500 focus-visible:border-sky-500"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 text-base font-medium mt-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90"
                            disabled={isLoading}
                        >
                            {isLoading ? "验证中..." : "登录后台"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
