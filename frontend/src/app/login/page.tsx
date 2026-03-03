"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { SiteLogo } from "@/components/site-logo";

export default function LoginPage() {
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
      await authApi.login(username, password);
      if (typeof window !== "undefined") {
        localStorage.setItem("username", username);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Login failed:", err);
      setError("用户名或密码错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminQuickLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      await authApi.login("admin", "admin123");
      if (typeof window !== "undefined") {
        localStorage.setItem("username", "admin");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      console.error("Admin Login failed:", err);
      setError("管理员快捷登录失败，请检查配置或手动登录");
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
            AI 驱动的
            <br />
            高中物理自适应学习
          </h2>
          <p className="text-lg text-blue-200 max-w-md leading-relaxed">
            智能诊断知识薄弱点，个性化生成练习题，
            AI 实时反馈每一步解题思路。
          </p>
          <div className="flex gap-8 pt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-sm text-blue-300">精选题目</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">AI</div>
              <div className="text-sm text-blue-300">智能分析</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">∞</div>
              <div className="text-sm text-blue-300">自适应练习</div>
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
            <p className="text-sm text-slate-400 mt-1">AI 驱动的高中物理学习平台</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-100">欢迎回来</h2>
            <p className="text-slate-400">
              登录以继续学习之旅
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">用户名</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
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
              className="w-full h-11 text-base font-medium bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? "登录中..." : "登 录"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-950 px-2 text-slate-500">
                还没有账户？
              </span>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full h-11 border-sky-500/50 text-sky-300 hover:bg-sky-500/20">
            <Link href="/register">立即注册</Link>
          </Button>

          <div className="pt-2">
            <Button
              type="button"
              onClick={handleAdminQuickLogin}
              variant="outline"
              disabled={isLoading}
              className="w-full h-11 border-indigo-500/50 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-all"
            >
              👑 管理员一键测试登录
            </Button>
            <p className="text-center text-xs text-slate-500 mt-2">
              (使用预设账号快速进入总控台)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}