"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, api, authApi } from "@/lib/api";
import { Latex } from "@/components/latex";

type Student = { id: string; username: string; email: string; is_active: boolean; created_at: string };
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
            const data = await adminApi.getStudents();
            setStudents(data);
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
    });

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
            const questionPayload = {
                content_latex: newQ.content_latex,
                difficulty: newQ.difficulty,
                question_type: newQ.question_type,
                answer_schema: {
                    type: "value_unit",
                    correct_value: parseFloat(newQ.correct_value),
                    unit: newQ.unit,
                    tolerance: parseFloat(newQ.tolerance),
                },
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

            setNewQ({ content_latex: "", difficulty: 2, question_type: "CALCULATION", correct_value: "", unit: "", tolerance: "0.1", solution_steps: "", primary_node_id: topics[0]?.id || 0, image_url: "" });
            setShowAddQuestion(false);
            setEditingQuestionId(null);
            loadQuestions();
        } catch (err: any) {
            setQuestionMsg("❌ " + (err.message || "保存失败"));
        }
    };

    const handleEditQuestion = (q: QuestionItem) => {
        setNewQ({
            content_latex: q.content_latex,
            difficulty: q.difficulty,
            question_type: q.question_type,
            correct_value: q.answer_schema?.correct_value?.toString() || "",
            unit: q.answer_schema?.unit || "",
            tolerance: q.answer_schema?.tolerance?.toString() || "0.1",
            solution_steps: q.solution_steps,
            primary_node_id: q.primary_node_id,
            image_url: q.answer_schema?.image_url || "", // Adjust logic if image_url is stored differently
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
                            <CardHeader>
                                <CardTitle className="text-base text-slate-100">学生列表 ({students.length})</CardTitle>
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
                                                    <th className="text-right py-2 font-medium text-slate-300">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.map((s) => (
                                                    <tr key={s.id} className="border-b border-slate-800 last:border-0">
                                                        <td className="py-2 pr-4 text-slate-200">{s.username}</td>
                                                        <td className="py-2 pr-4 text-slate-400">{s.email}</td>
                                                        <td className="py-2 pr-4 text-slate-400 text-xs">{s.created_at ? new Date(s.created_at).toLocaleDateString() : "-"}</td>
                                                        <td className="py-2 text-right space-x-2">
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
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-100">题库（{questions.length} 题）</h2>
                            <Button onClick={() => {
                                if (showAddQuestion) {
                                    setShowAddQuestion(false);
                                    setEditingQuestionId(null);
                                    setNewQ({ content_latex: "", difficulty: 2, question_type: "CALCULATION", correct_value: "", unit: "", tolerance: "0.1", solution_steps: "", primary_node_id: topics[0]?.id || 0, image_url: "" });
                                } else {
                                    setShowAddQuestion(true);
                                }
                            }} className="bg-sky-500 hover:bg-sky-600 text-slate-950">
                                {showAddQuestion ? "取消" : "+ 添加题目"}
                            </Button>
                        </div>

                        {questionMsg && <p className="text-sm text-slate-300">{questionMsg}</p>}

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
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                                            <div className="space-y-1">
                                                <Label className="text-slate-300">正确答案</Label>
                                                <Input value={newQ.correct_value} onChange={(e) => setNewQ(q => ({ ...q, correct_value: e.target.value }))} placeholder="5" required className="bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-slate-300">单位</Label>
                                                <Input value={newQ.unit} onChange={(e) => setNewQ(q => ({ ...q, unit: e.target.value }))} placeholder="m/s^2" required className="bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500" />
                                            </div>
                                        </div>
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
                    <Card className="max-w-3xl bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20">
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
                )}
            </main>
        </div>
    );
}
