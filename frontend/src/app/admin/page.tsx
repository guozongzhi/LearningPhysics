"use client";

import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, api, authApi } from "@/lib/api";
import { Latex } from "@/components/latex";

type Student = { id: string; username: string; email: string; is_active: boolean; created_at: string; token_usage: number; token_limit: number };
type QuestionItem = { id: string; content_latex: string; difficulty: number; question_type: string; answer_schema: any; solution_steps: string; primary_node_id: number; topic_name: string };
type Topic = { id: number; name: string; code: string; level: number; description: string | null };

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"students" | "questions" | "export" | "settings">("students");

    // Auth check
    useEffect(() => {
        const isAdmin = typeof window !== "undefined" ? localStorage.getItem("isAdmin") : null;
        if (isAdmin !== "true") {
            router.push("/admin/login");
        }
    }, [router]);

    // ── Student State ──
    const [students, setStudents] = useState<Student[]>([]);
    const [newStudent, setNewStudent] = useState({ username: "", email: "", password: "" });
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentMsg, setStudentMsg] = useState("");

    const loadStudents = useCallback(async () => {
        setStudentsLoading(true);
        try {
            const [data, tokenData] = await Promise.all([
                adminApi.getStudents(),
                adminApi.getTokensSummary()
            ]);
            setStudents(data);
            setTokenSummary(tokenData);

            // Pop the alert if usage exceeds limits
            if (tokenData.alert_message) {
                alert(tokenData.alert_message);
            }
        } catch { setStudentMsg("加载失败"); }
        finally { setStudentsLoading(false); }
    }, []);

    useEffect(() => { if (activeTab === "students") loadStudents(); }, [activeTab, loadStudents]);

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setStudentMsg("");
        try {
            await adminApi.createStudent(newStudent);
            setNewStudent({ username: "", email: "", password: "" });
            setStudentMsg("✅ 学生创建成功");
            loadStudents();
        } catch (err: any) {
            setStudentMsg("❌ " + (err.message || "创建失败"));
        }
    };

    const handleDeleteStudent = async (id: string, name: string) => {
        if (!confirm(`确定删除学生 "${name}"？`)) return;
        try {
            await adminApi.deleteStudent(id);
            loadStudents();
        } catch { setStudentMsg("删除失败"); }
    };

    const handleResetPassword = async (id: string, name: string) => {
        const newPwd = prompt(`为学生 "${name}" 设置新密码：`);
        if (!newPwd) return;
        try {
            await adminApi.resetPassword(id, newPwd);
            setStudentMsg(`✅ ${name} 密码已重置`);
        } catch { setStudentMsg("重置失败"); }
    };

    const handleSetTokenLimit = async (id: string, name: string, currentLimit: number) => {
        const newLimitStr = prompt(`设定期望的 Token 限制（当前 ${currentLimit}）：`, currentLimit.toString());
        if (!newLimitStr) return;
        const newLimit = parseInt(newLimitStr, 10);
        if (isNaN(newLimit) || newLimit < 0) {
            alert("请输入有效的数字");
            return;
        }
        try {
            await adminApi.setTokenLimit(id, newLimit);
            setStudentMsg(`✅ ${name} 的 Token 限额已更新为: ${newLimit}`);
            loadStudents();
        } catch { setStudentMsg("设置限额失败"); }
    };

    // ── Global Token State ──
    const [tokenSummary, setTokenSummary] = useState({ global_limit: 0, total_usage: 0, total_limit: 0 });
    const [adminPwd, setAdminPwd] = useState({ old: "", new: "", confirm: "" });
    const [adminPwdMsg, setAdminPwdMsg] = useState("");
    const [adminPwdLoading, setAdminPwdLoading] = useState(false);

    const handleUpdateGlobalLimit = async () => {
        const newLimStr = prompt("设定全平台的 System Token 额度池 (限制将按此计算警告):", tokenSummary.global_limit.toString());
        if (!newLimStr) return;
        const limit = parseInt(newLimStr, 10);
        if (isNaN(limit) || limit < 0) return alert("请输入有效的数字");
        try {
            await adminApi.updateGlobalTokenLimit(limit);
            setStudentMsg("✅ 全局 Token 上限已更新");
            loadStudents();
        } catch { setStudentMsg("设置上限失败"); }
    };

    const handleAverageDistribute = async () => {
        if (!confirm(`确定要将当前设定的 ${tokenSummary.global_limit} Tokens 平均分配到所有非管理员账号上吗？`)) return;
        try {
            await adminApi.averageDistributeTokens();
            setStudentMsg("✅ 一键平均分配成功");
            loadStudents();
        } catch { setStudentMsg("分配失败"); }
    };

    const handleClearAllTokens = async () => {
        if (!confirm("确定要清空所有学生的 Token 消耗吗？")) return;
        try {
            await adminApi.clearAllTokens();
            setStudentMsg("✅ 所有学生的 Token 消耗已清空");
            loadStudents();
        } catch { setStudentMsg("清空 Token 失败"); }
    };

    // ── Question State ──
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [questionMsg, setQuestionMsg] = useState("");
    const [showAddQuestion, setShowAddQuestion] = useState(false);
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [newQ, setNewQ] = useState({
        content_latex: "", difficulty: 2, question_type: "CALCULATION",
        correct_value: "", unit: "", tolerance: "0.1",
        solution_steps: "", primary_node_id: 0, image_url: "",
        // New fields
        options: [{ label: "A", text: "", image_url: "" }, { label: "B", text: "", image_url: "" }],
        correct_answer: "",
        correct_answers: [] as string[],
    });

    const resetNewQ = () => {
        setNewQ({
            content_latex: "", difficulty: 2, question_type: "CALCULATION",
            correct_value: "", unit: "", tolerance: "0.1",
            solution_steps: "", primary_node_id: topics[0]?.id || 0, image_url: "",
            options: [{ label: "A", text: "", image_url: "" }, { label: "B", text: "", image_url: "" }],
            correct_answer: "",
            correct_answers: [],
        });
    };

    const loadQuestions = useCallback(async () => {
        setQuestionsLoading(true);
        try {
            const [qData, tData] = await Promise.all([adminApi.getQuestions(), api.getTopics()]);
            setQuestions(qData);
            setTopics(tData);
            if (tData.length > 0 && newQ.primary_node_id === 0) {
                setNewQ(prev => ({ ...prev, primary_node_id: tData[0].id }));
            }
        } catch { setQuestionMsg("加载失败"); }
        finally { setQuestionsLoading(false); }
    }, []);

    useEffect(() => { if (activeTab === "questions") loadQuestions(); }, [activeTab, loadQuestions]);

    const handleSaveQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setQuestionMsg("");
        try {
            let answerSchema: any = {};

            if (newQ.question_type === "CALCULATION" || newQ.question_type === "BLANK") {
                answerSchema = {
                    type: "value_unit",
                    correct_value: parseFloat(newQ.correct_value),
                    unit: newQ.unit,
                    tolerance: parseFloat(newQ.tolerance),
                };
            } else if (newQ.question_type === "CHOICE" || newQ.question_type === "SINGLE_CHOICE") {
                answerSchema = {
                    type: "single_choice",
                    options: newQ.options,
                    correct_answer: newQ.correct_answer,
                };
            } else if (newQ.question_type === "MULTIPLE_CHOICE") {
                answerSchema = {
                    type: "multiple_choice",
                    options: newQ.options,
                    correct_answers: newQ.correct_answers,
                };
            } else if (newQ.question_type === "TRUE_FALSE") {
                answerSchema = {
                    type: "true_false",
                    correct_answer: newQ.correct_answer,
                };
            }

            const questionPayload = {
                content_latex: newQ.content_latex,
                difficulty: newQ.difficulty,
                question_type: newQ.question_type,
                answer_schema: answerSchema,
                solution_steps: newQ.solution_steps,
                primary_node_id: newQ.primary_node_id,
                image_url: newQ.image_url || null,
            };

            if (editingQuestionId) {
                await adminApi.updateQuestion(editingQuestionId, questionPayload);
                setQuestionMsg("✅ 题目更新成功");
            } else {
                await adminApi.createQuestion(questionPayload);
                setQuestionMsg("✅ 题目添加成功");
            }

            resetNewQ();
            setShowAddQuestion(false);
            setEditingQuestionId(null);
            loadQuestions();
        } catch (err: any) {
            setQuestionMsg("❌ " + (err.message || "保存失败"));
        }
    };

    const handleEditQuestion = (q: any) => {
        const schema = q.answer_schema || {};
        setNewQ({
            content_latex: q.content_latex,
            difficulty: q.difficulty,
            question_type: q.question_type,
            correct_value: schema.correct_value?.toString() || "",
            unit: schema.unit || "",
            tolerance: schema.tolerance?.toString() || "0.1",
            solution_steps: q.solution_steps,
            primary_node_id: q.primary_node_id,
            image_url: q.image_url || "",
            options: schema.options || [{ label: "A", text: "", image_url: "" }, { label: "B", text: "", image_url: "" }],
            correct_answer: schema.correct_answer || "",
            correct_answers: schema.correct_answers || [],
        });
        setEditingQuestionId(q.id);
        setShowAddQuestion(true);
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("确定删除此题目？")) return;
        try {
            await adminApi.deleteQuestion(id);
            if (editingQuestionId === id) {
                setShowAddQuestion(false);
                setEditingQuestionId(null);
            }
            loadQuestions();
        } catch { setQuestionMsg("删除失败"); }
    };

    const handleClearHistory = async () => {
        if (!confirm("确定清除所有未使用的历史题目吗？将会保留已经被考试记录关联的题目。")) return;
        setQuestionMsg("");
        try {
            const res = await adminApi.clearQuestionHistory();
            setQuestionMsg(`✅ 已清除 ${res.deleted_count} 道历史题目`);
            loadQuestions();
        } catch (err: any) {
            setQuestionMsg("❌ 清除历史题目失败: " + err.message);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importMode, setImportMode] = useState<'overwrite' | 'extend'>('extend');

    const handleImportClick = (mode: 'overwrite' | 'extend') => {
        setImportMode(mode);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const modeText = importMode === 'overwrite' ? "覆盖 (将清除并重新导入)" : "扩展 (对现有题目进行补充)";
        if (!confirm(`确定使用「${modeText}」模式导入 ${file.name} 吗？`)) {
            // reset file input
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setQuestionMsg("🔄 正在上传并导入题库，请稍候...");
        try {
            const res = await adminApi.importQuestions(importMode, file);
            setQuestionMsg(`✅ 导入成功! 新增: ${res.added}, 更新: ${res.updated}, 跳过: ${res.skipped}`);
            loadQuestions();
        } catch (err: any) {
            setQuestionMsg("❌ 导入失败: " + err.message);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleExportQuestions = () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : "";
        window.open(`${adminApi.exportQuestions()}?token=${token}`, "_blank");
    };

    // ── Export ──
    const handleExport = () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : "";
        const url = adminApi.exportRecords();
        window.open(`${url}?token=${token}`, "_blank");
    };

    const handleLogout = () => {
        authApi.logout();
        router.push("/admin/login");
    };

    // ── System Settings State ──
    const [llmConfig, setLlmConfig] = useState({
        openai_api_key_masked: "",
        openai_api_key_new: "",
        openai_base_url: "",
        openai_model: "",
    });
    const [llmMsg, setLlmMsg] = useState("");
    const [llmLoading, setLlmLoading] = useState(false);
    const [llmTestResult, setLlmTestResult] = useState<{ status: string, message: string } | null>(null);
    const [llmTesting, setLlmTesting] = useState(false);

    const loadLlmConfig = useCallback(async () => {
        setLlmLoading(true);
        try {
            const data = await adminApi.getLlmConfig();
            setLlmConfig(prev => ({
                ...prev,
                openai_api_key_masked: data.openai_api_key_masked || "",
                openai_base_url: data.openai_base_url || "",
                openai_model: data.openai_model || "",
            }));
        } catch { setLlmMsg("配置加载失败"); }
        finally { setLlmLoading(false); }
    }, []);

    useEffect(() => { if (activeTab === "settings") loadLlmConfig(); }, [activeTab, loadLlmConfig]);

    const handleSaveLlmConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setLlmMsg("");
        try {
            const dataToUpdate: any = {
                openai_base_url: llmConfig.openai_base_url,
                openai_model: llmConfig.openai_model,
            };
            if (llmConfig.openai_api_key_new) {
                dataToUpdate.openai_api_key = llmConfig.openai_api_key_new;
            }
            const updated = await adminApi.updateLlmConfig(dataToUpdate);
            setLlmConfig(prev => ({
                ...prev,
                openai_api_key_masked: updated.openai_api_key_masked || "",
                openai_api_key_new: "",
            }));
            setLlmMsg("✅ 设置保存成功并即时生效");
            setLlmTestResult(null); // Clear test results on save
        } catch (err: any) {
            setLlmMsg("❌ " + (err.message || "设置保存失败"));
        }
    };

    const handleTestLlmConfig = async () => {
        setLlmTesting(true);
        setLlmTestResult(null);
        try {
            const result = await adminApi.testLlmConfig();
            setLlmTestResult(result);
        } catch (err: any) {
            setLlmTestResult({ status: "error", message: err.message || "网络请求失败" });
        } finally {
            setLlmTesting(false);
        }
    };

    const handleAdminPasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdminPwdMsg("");

        if (!adminPwd.old || !adminPwd.new || !adminPwd.confirm) {
            setAdminPwdMsg("❌ 请填写所有字段");
            return;
        }

        if (adminPwd.new !== adminPwd.confirm) {
            setAdminPwdMsg("❌ 两次输入的新密码不一致");
            return;
        }

        if (adminPwd.new.length < 6) {
            setAdminPwdMsg("❌ 新密码长度至少为 6 位");
            return;
        }

        setAdminPwdLoading(true);
        try {
            await authApi.changePassword(adminPwd.old, adminPwd.new);
            setAdminPwdMsg("✅ 密码修改成功");
            setAdminPwd({ old: "", new: "", confirm: "" });
        } catch (err: any) {
            setAdminPwdMsg("❌ " + (err.message || "修改失败，请检查旧密码是否正确"));
        } finally {
            setAdminPwdLoading(false);
        }
    };

    const tabs = [
        { key: "students" as const, label: "👥 学生管理" },
        { key: "questions" as const, label: "📝 题库管理" },
        { key: "export" as const, label: "📊 数据导出" },
        { key: "settings" as const, label: "⚙️ 系统设置" },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Header — cosmic */}
            <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
                        🔐 LearningPhysics 管理后台
                    </h1>
                    <Button variant="outline" size="sm" onClick={handleLogout} className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white">
                        退出
                    </Button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Tabs — cosmic */}
                <div className="flex flex-wrap gap-2 mb-8 p-1.5 rounded-xl w-fit bg-slate-900/70 border border-slate-700/60">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${activeTab === tab.key
                                ? "bg-sky-500/20 text-sky-300 border border-sky-500/60 shadow-[0_0_18px_rgba(56,189,248,0.25)]"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ════════════ Students Tab ════════════ */}
                {activeTab === "students" && (
                    <div className="space-y-6">
                        {/* Add Student Form */}
                        <Card className="bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20">
                            <CardHeader>
                                <CardTitle className="text-base text-slate-100">添加学生（白名单）</CardTitle>
                                <CardDescription className="text-slate-400">创建学生账户后，学生可以直接用此账号登录，无需注册</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateStudent} className="flex flex-wrap gap-3 items-end">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-300">用户名</Label>
                                        <Input value={newStudent.username} onChange={(e) => setNewStudent(s => ({ ...s, username: e.target.value }))} placeholder="student01" required className="w-40 bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-300">邮箱</Label>
                                        <Input value={newStudent.email} onChange={(e) => setNewStudent(s => ({ ...s, email: e.target.value }))} type="email" placeholder="student@example.com" required className="w-52 bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-300">初始密码</Label>
                                        <Input value={newStudent.password} onChange={(e) => setNewStudent(s => ({ ...s, password: e.target.value }))} placeholder="123456" required className="w-36 bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500" />
                                    </div>
                                    <Button type="submit" size="sm" className="bg-sky-500 hover:bg-sky-600 text-slate-950">+ 添加</Button>
                                </form>
                                {studentMsg && <p className="mt-3 text-sm text-slate-300">{studentMsg}</p>}
                            </CardContent>
                        </Card>

                        {/* Student List */}
                        <Card className="bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="text-lg text-slate-100">学生列表 <span className="text-slate-500 text-sm">({students.length}人)</span></CardTitle>
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col justify-center">
                                            <span className="text-slate-400 mb-1">系统全局 Token 总量</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sky-300 font-mono text-lg">{tokenSummary.global_limit.toLocaleString()}</span>
                                                <Button variant="ghost" size="sm" onClick={handleUpdateGlobalLimit} className="h-6 px-2 text-xs text-sky-500 hover:bg-sky-500/20 hover:text-sky-300">
                                                    修改
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col justify-center">
                                            <span className="text-slate-400 mb-1">已分配总量表</span>
                                            <span className="text-slate-200 font-mono text-lg">{tokenSummary.total_limit.toLocaleString()}</span>
                                        </div>
                                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col justify-center">
                                            <span className="text-slate-400 mb-1">全平台已消耗</span>
                                            <span className="text-rose-400 font-mono text-lg">{tokenSummary.total_usage.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleAverageDistribute} className="border-sky-700/50 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20">
                                        一键平均分配
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleClearAllTokens} className="border-rose-700/50 text-rose-400 hover:bg-rose-900/30">
                                        清空消耗
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {studentsLoading ? (
                                    <p className="text-slate-400 text-sm">加载中...</p>
                                ) : students.length === 0 ? (
                                    <p className="text-slate-400 text-sm">暂无学生</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    <th className="text-left py-2 pr-4 font-medium text-slate-300">用户名</th>
                                                    <th className="text-left py-2 pr-4 font-medium text-slate-300">邮箱</th>
                                                    <th className="text-left py-2 pr-4 font-medium text-slate-300">创建时间</th>
                                                    <th className="text-left py-2 pr-4 font-medium text-slate-300">Token 消耗/限额</th>
                                                    <th className="text-right py-2 font-medium text-slate-300">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.map((s) => (
                                                    <tr key={s.id} className="border-b border-slate-800 last:border-0">
                                                        <td className="py-2 pr-4 text-slate-200">{s.username}</td>
                                                        <td className="py-2 pr-4 text-slate-400">{s.email}</td>
                                                        <td className="py-2 pr-4 text-slate-400 text-xs">{s.created_at ? new Date(s.created_at).toLocaleDateString() : "-"}</td>
                                                        <td className="py-2 pr-4">
                                                            <div className="flex flex-col gap-1 w-32">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className={s.token_usage >= s.token_limit ? "text-rose-400 font-bold" : "text-slate-300"}>{s.token_usage}</span>
                                                                    <span className="text-slate-500">/ {s.token_limit}</span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${s.token_usage >= s.token_limit ? 'bg-rose-500' : 'bg-sky-500'}`}
                                                                        style={{ width: `${Math.min(100, Math.max(0, (s.token_usage / (s.token_limit || 1)) * 100))}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-2 text-right space-x-2">
                                                            <Button variant="outline" size="sm" onClick={() => handleSetTokenLimit(s.id, s.username, s.token_limit)} className="border-sky-700/50 text-sky-400 hover:bg-sky-900/30">
                                                                额度
                                                            </Button>
                                                            <Button variant="outline" size="sm" onClick={() => handleResetPassword(s.id, s.username)} className="border-slate-600 text-slate-300 hover:bg-slate-800">
                                                                重置密码
                                                            </Button>
                                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteStudent(s.id, s.username)} className="bg-rose-500/80 hover:bg-rose-500 text-slate-950">
                                                                删除
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ════════════ Questions Tab ════════════ */}
                {activeTab === "questions" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <h2 className="text-lg font-semibold text-slate-100">题库（{questions.length} 题）</h2>
                            <div className="flex gap-2">
                                <Button onClick={handleClearHistory} variant="outline" className="border-rose-700/50 text-rose-400 hover:bg-rose-900/30">
                                    清除历史题库
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept=".json"
                                    onChange={handleFileChange}
                                />
                                <a href="/templates/questions_template.json" download className="text-sm font-medium text-sky-400 hover:text-sky-300 underline underline-offset-4 decoration-sky-400/30 mr-2 flex items-center">
                                    📄 下载标准 JSON 模板
                                </a>
                                <Button onClick={() => handleImportClick('overwrite')} variant="outline" className="border-amber-700/50 text-amber-400 hover:bg-amber-900/30">
                                    ↑ 覆盖导入
                                </Button>
                                <Button onClick={() => handleImportClick('extend')} variant="outline" className="border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/30">
                                    ↑ 扩展导入
                                </Button>
                                <Button onClick={handleExportQuestions} variant="outline" className="border-indigo-700/50 text-indigo-400 hover:bg-indigo-900/30">
                                    ↓ 导出全部题库
                                </Button>
                                <Button onClick={() => {
                                    if (showAddQuestion) {
                                        setShowAddQuestion(false);
                                        setEditingQuestionId(null);
                                        resetNewQ();
                                    } else {
                                        setShowAddQuestion(true);
                                    }
                                }} className="bg-sky-500 hover:bg-sky-600 text-slate-950">
                                    {showAddQuestion ? "取消" : "+ 手动添加"}
                                </Button>
                            </div>
                        </div>

                        {questionMsg && <p className={`text-sm ${questionMsg.includes('❌') ? 'text-rose-400' : 'text-emerald-400'}`}>{questionMsg}</p>}

                        {showAddQuestion && (
                            <Card className="bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20">
                                <CardHeader>
                                    <CardTitle className="text-base text-slate-100">{editingQuestionId ? "编辑题目" : "添加新题目"}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSaveQuestion} className="space-y-4">
                                        <div className="space-y-1">
                                            <Label className="text-slate-300">题目内容（支持 LaTeX）</Label>
                                            <textarea
                                                value={newQ.content_latex}
                                                onChange={(e) => setNewQ(q => ({ ...q, content_latex: e.target.value }))}
                                                placeholder="一个质量为 $m=2\text{kg}$ 的物体..."
                                                required
                                                rows={3}
                                                className="w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                            />
                                            {newQ.content_latex && (
                                                <div className="mt-2 p-3 bg-slate-800/50 border border-slate-700 rounded-md text-sm text-slate-200">
                                                    <span className="text-xs text-slate-500 font-semibold mb-1 block">实时预览：</span>
                                                    <Latex>{newQ.content_latex}</Latex>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-slate-300">题型</Label>
                                                <select
                                                    value={newQ.question_type}
                                                    onChange={(e) => setNewQ(q => ({ ...q, question_type: e.target.value }))}
                                                    className="w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm h-10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                >
                                                    <option value="CALCULATION">计算题</option>
                                                    <option value="CHOICE">单选题</option>
                                                    <option value="MULTIPLE_CHOICE">多选题</option>
                                                    <option value="TRUE_FALSE">判断题</option>
                                                    <option value="BLANK">填空题</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-slate-300">知识点</Label>
                                                <select value={newQ.primary_node_id} onChange={(e) => setNewQ(q => ({ ...q, primary_node_id: parseInt(e.target.value) }))} className="w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm h-10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500">
                                                    {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-slate-300">难度 (1-5)</Label>
                                                <Input type="number" min={1} max={5} value={newQ.difficulty} onChange={(e) => setNewQ(q => ({ ...q, difficulty: parseInt(e.target.value) }))} className="bg-slate-800/80 border-slate-600 text-slate-100" />
                                            </div>

                                            {(newQ.question_type === "CALCULATION" || newQ.question_type === "BLANK") && (
                                                <>
                                                    <div className="space-y-1">
                                                        <Label className="text-slate-300">正确答案</Label>
                                                        <Input value={newQ.correct_value} onChange={(e) => setNewQ(q => ({ ...q, correct_value: e.target.value }))} placeholder="5" required className="bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-slate-300">单位</Label>
                                                        <Input value={newQ.unit} onChange={(e) => setNewQ(q => ({ ...q, unit: e.target.value }))} placeholder="m/s^2" required className="bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500" />
                                                    </div>
                                                </>
                                            )}

                                            {newQ.question_type === "TRUE_FALSE" && (
                                                <div className="space-y-1">
                                                    <Label className="text-slate-300">正确答案</Label>
                                                    <select
                                                        value={newQ.correct_answer}
                                                        onChange={(e) => setNewQ(q => ({ ...q, correct_answer: e.target.value }))}
                                                        className="w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm h-10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                        required
                                                    >
                                                        <option value="">请选择</option>
                                                        <option value="true">正确</option>
                                                        <option value="false">错误</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {(newQ.question_type === "CHOICE" || newQ.question_type === "SINGLE_CHOICE" || newQ.question_type === "MULTIPLE_CHOICE") && (
                                            <div className="space-y-3 p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-slate-300 font-bold">选项配置</Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setNewQ(q => ({
                                                            ...q,
                                                            options: [...q.options, { label: String.fromCharCode(65 + q.options.length), text: "", image_url: "" }]
                                                        }))}
                                                        className="h-7 px-2 text-xs border-slate-600 text-sky-400 hover:bg-sky-500/10"
                                                    >
                                                        + 添加选项
                                                    </Button>
                                                </div>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {newQ.options.map((opt, idx) => (
                                                        <div key={idx} className="flex gap-2 items-start bg-slate-900/40 p-3 rounded border border-slate-800">
                                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0">
                                                                {opt.label}
                                                            </div>
                                                            <div className="flex-1 space-y-2">
                                                                <Input
                                                                    value={opt.text}
                                                                    onChange={(e) => {
                                                                        const next = [...newQ.options];
                                                                        next[idx] = { ...next[idx], text: e.target.value };
                                                                        setNewQ(q => ({ ...q, options: next }));
                                                                    }}
                                                                    placeholder={`选项 ${opt.label} 内容`}
                                                                    className="h-8 bg-slate-800/50 border-slate-700 text-slate-200"
                                                                />
                                                                <Input
                                                                    value={opt.image_url}
                                                                    onChange={(e) => {
                                                                        const next = [...newQ.options];
                                                                        next[idx] = { ...next[idx], image_url: e.target.value };
                                                                        setNewQ(q => ({ ...q, options: next }));
                                                                    }}
                                                                    placeholder="选项图片 URL (可选)"
                                                                    className="h-7 text-xs bg-slate-800/30 border-slate-700 text-slate-400"
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const next = newQ.options.filter((_, i) => i !== idx)
                                                                        .map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
                                                                    setNewQ(q => ({ ...q, options: next }));
                                                                }}
                                                                className="text-slate-500 hover:text-rose-400 h-8 w-8 p-0"
                                                            >
                                                                ✕
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-2 border-t border-slate-700">
                                                    <Label className="text-slate-300 text-xs mb-2 block">设置正确答案：</Label>
                                                    {newQ.question_type === "MULTIPLE_CHOICE" ? (
                                                        <div className="flex flex-wrap gap-2 text-xs">
                                                            {newQ.options.map((opt) => (
                                                                <button
                                                                    type="button"
                                                                    key={opt.label}
                                                                    onClick={() => {
                                                                        const current = newQ.correct_answers || [];
                                                                        const next = current.includes(opt.label)
                                                                            ? current.filter(l => l !== opt.label)
                                                                            : [...current, opt.label].sort();
                                                                        setNewQ(q => ({ ...q, correct_answers: next }));
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-md border transition-all ${newQ.correct_answers?.includes(opt.label)
                                                                        ? "bg-sky-500/20 border-sky-500 text-sky-300"
                                                                        : "bg-slate-800/50 border-slate-700 text-slate-500"
                                                                        }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2 text-xs">
                                                            {newQ.options.map((opt) => (
                                                                <button
                                                                    type="button"
                                                                    key={opt.label}
                                                                    onClick={() => setNewQ(q => ({ ...q, correct_answer: opt.label }))}
                                                                    className={`px-3 py-1.5 rounded-md border transition-all ${newQ.correct_answer === opt.label
                                                                        ? "bg-sky-500/20 border-sky-500 text-sky-300"
                                                                        : "bg-slate-800/50 border-slate-700 text-slate-500"
                                                                        }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <Label className="text-slate-300">解题步骤</Label>
                                            <textarea
                                                value={newQ.solution_steps}
                                                onChange={(e) => setNewQ(q => ({ ...q, solution_steps: e.target.value }))}
                                                placeholder="由牛顿第二定律 F=ma..."
                                                required
                                                rows={2}
                                                className="w-full rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                            />
                                            {newQ.solution_steps && (
                                                <div className="mt-2 p-3 bg-slate-800/50 border border-slate-700 rounded-md text-sm text-slate-200">
                                                    <span className="text-xs text-slate-500 font-semibold mb-1 block">实时预览：</span>
                                                    <Latex>{newQ.solution_steps}</Latex>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-slate-300">示意图 URL（可选）</Label>
                                            <Input
                                                value={newQ.image_url}
                                                onChange={(e) => setNewQ(q => ({ ...q, image_url: e.target.value }))}
                                                placeholder="https://example.com/diagram.png"
                                                className="bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500"
                                            />
                                        </div>
                                        <Button type="submit" className="bg-sky-500 hover:bg-sky-600 text-slate-950">{editingQuestionId ? "保存修改" : "保存新题目"}</Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Questions List */}
                        <Card className="bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20">
                            <CardContent className="pt-6">
                                {questionsLoading ? (
                                    <p className="text-slate-400 text-sm">加载中...</p>
                                ) : questions.length === 0 ? (
                                    <p className="text-slate-400 text-sm">暂无题目</p>
                                ) : (
                                    <div className="space-y-3">
                                        {questions.map((q, i) => (
                                            <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                                                <span className="text-xs text-slate-500 mt-1 w-6">{i + 1}</span>
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="text-sm leading-relaxed overflow-x-auto pb-1 latex-container text-slate-200">
                                                        <Latex>{q.content_latex}</Latex>
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">{q.topic_name}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">难度 {q.difficulty}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 shrink-0">
                                                    <Button variant="outline" size="sm" onClick={() => handleEditQuestion(q)} className="border-slate-600 text-slate-300 hover:bg-slate-800">编辑</Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteQuestion(q.id)} className="bg-rose-500/80 hover:bg-rose-500 text-slate-950">删除</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ════════════ Export Tab ════════════ */}
                {activeTab === "export" && (
                    <Card className="bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20">
                        <CardHeader>
                            <CardTitle className="text-slate-100">📊 导出学生答题记录</CardTitle>
                            <CardDescription className="text-slate-400">
                                导出所有学生的答题数据为 CSV 文件，包含学生信息、题目内容、答案、是否正确和 AI 反馈。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleExport} size="lg" className="bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 shadow-lg shadow-sky-500/25">
                                📥 下载 CSV 文件
                            </Button>
                            <p className="mt-3 text-sm text-slate-400">
                                文件支持 Excel 直接打开（UTF-8 BOM 编码）
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* ════════════ System Settings Tab ════════════ */}
                {activeTab === "settings" && (
                    <div className="space-y-8 max-w-3xl">
                        <Card className="bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20">
                            <CardHeader>
                                <CardTitle className="text-slate-100">⚙️ LLM 大模型 API 配置</CardTitle>
                                <CardDescription className="text-slate-400">
                                    配置 AI 分析题目的底层大模型服务。修改后会即可生效，无需重启服务器。
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {llmLoading ? (
                                    <p className="text-slate-400 text-sm">加载中...</p>
                                ) : (
                                    <form onSubmit={handleSaveLlmConfig} className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">API Base URL</Label>
                                            <Input
                                                value={llmConfig.openai_base_url}
                                                onChange={(e) => setLlmConfig(c => ({ ...c, openai_base_url: e.target.value }))}
                                                placeholder="https://api.openai.com/v1"
                                                className="w-full bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500"
                                            />
                                            <p className="text-xs text-slate-500">
                                                留空则默认使用 OpenAI。可以配置为国内兼容 OpenAI API 规范的代理地址或大模型服务（如豆包、百川等）。
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Model (模型名称)</Label>
                                            <Input
                                                value={llmConfig.openai_model}
                                                onChange={(e) => setLlmConfig(c => ({ ...c, openai_model: e.target.value }))}
                                                placeholder="gpt-4-turbo"
                                                className="w-full sm:w-1/2 bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500"
                                            />
                                            <p className="text-xs text-slate-500">
                                                例如: gpt-3.5-turbo, gpt-4o, ep-202403211516...
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-slate-300">API Key (密钥)</Label>
                                            <Input
                                                type="password"
                                                value={llmConfig.openai_api_key_new}
                                                onChange={(e) => setLlmConfig(c => ({ ...c, openai_api_key_new: e.target.value }))}
                                                placeholder={llmConfig.openai_api_key_masked || "请输入新的 API Key (留空保持不变)"}
                                                className="w-full bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500"
                                            />
                                            <p className="text-xs text-slate-500">
                                                当前密钥: {llmConfig.openai_api_key_masked || "未设置"}。如果不需要修改请留空。
                                            </p>
                                        </div>

                                        <div className="pt-2 flex flex-wrap items-center gap-4">
                                            <Button type="submit" className="bg-sky-500 hover:bg-sky-600 text-slate-950">保存更改</Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleTestLlmConfig}
                                                disabled={llmTesting}
                                                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                                            >
                                                {llmTesting ? "测试中..." : "测试连接"}
                                            </Button>
                                            {llmMsg && <span className="text-sm font-medium text-slate-300">{llmMsg}</span>}
                                        </div>

                                        {llmTestResult && (
                                            <div className={`mt-4 p-4 rounded-lg border flex items-center gap-3 ${llmTestResult.status === "success"
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                                }`}>
                                                <span className="text-xl">{llmTestResult.status === "success" ? "✅" : "❌"}</span>
                                                <div>
                                                    <p className="font-bold text-sm">
                                                        {llmTestResult.status === "success" ? "AI 服务可用" : "AI 连接失败"}
                                                    </p>
                                                    <p className="text-xs opacity-90">{llmTestResult.message}</p>
                                                </div>
                                            </div>
                                        )}
                                    </form>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20">
                            <CardHeader>
                                <CardTitle className="text-slate-100">🔒 管理员密码修改</CardTitle>
                                <CardDescription className="text-slate-400">
                                    定期修改密码以确保后台访问安全。
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAdminPasswordChange} className="space-y-4 max-w-sm">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">当前旧密码</Label>
                                        <Input
                                            type="password"
                                            value={adminPwd.old}
                                            onChange={(e) => setAdminPwd(p => ({ ...p, old: e.target.value }))}
                                            className="bg-slate-800/80 border-slate-600 text-slate-100"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">设置新密码</Label>
                                        <Input
                                            type="password"
                                            value={adminPwd.new}
                                            onChange={(e) => setAdminPwd(p => ({ ...p, new: e.target.value }))}
                                            className="bg-slate-800/80 border-slate-600 text-slate-100"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">确认新密码</Label>
                                        <Input
                                            type="password"
                                            value={adminPwd.confirm}
                                            onChange={(e) => setAdminPwd(p => ({ ...p, confirm: e.target.value }))}
                                            className="bg-slate-800/80 border-slate-600 text-slate-100"
                                            required
                                        />
                                    </div>
                                    <div className="pt-2 flex flex-col gap-3">
                                        <Button
                                            type="submit"
                                            disabled={adminPwdLoading}
                                            className="w-full sm:w-fit bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            {adminPwdLoading ? "正在保存..." : "确认修改密码"}
                                        </Button>
                                        {adminPwdMsg && (
                                            <p className={`text-sm ${adminPwdMsg.startsWith("✅") ? "text-emerald-400" : "text-rose-400"}`}>
                                                {adminPwdMsg}
                                            </p>
                                        )}
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
