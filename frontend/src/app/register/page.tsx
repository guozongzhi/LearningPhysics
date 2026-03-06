"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { SiteLogo } from "@/components/site-logo";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      setError("密码不能少于 6 个字符");
      return;
    }

    setIsLoading(true);

    try {
      await authApi.register(email, username, password);
      router.push("/login");
    } catch (err) {
      console.error("Registration failed:", err);
      setError("注册失败，邮箱或用户名可能已被使用");
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
            开始你的
            <br />
            物理学习之旅
          </h2>
          <p className="text-lg text-blue-200 max-w-md leading-relaxed">
            注册账户后，AI 将为你量身定制学习路径，
            帮助你在物理学科上取得突破。
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-xs text-blue-200">知识雷达图</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
              <div className="text-2xl mb-1">🧠</div>
              <div className="text-xs text-blue-200">AI 错因分析</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 text-center">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-xs text-blue-200">精准提分</div>
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
            <h2 className="text-3xl font-bold tracking-tight text-slate-100">创建账户</h2>
            <p className="text-slate-400">
              填写信息，开始智能物理学习
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="h-11 bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500 focus-visible:border-sky-500"
              />
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  required
                  className="h-11 bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500 focus-visible:border-sky-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入"
                  required
                  className="h-11 bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500 focus-visible:border-sky-500"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? "注册中..." : "创建账户"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-950 px-2 text-slate-500">
                已有账户？
              </span>
            </div>
          </div>

          <Button asChild variant="outline" className="w-full h-11 border-sky-500/50 text-sky-300 hover:bg-sky-500/20">
            <Link href="/login">立即登录</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}