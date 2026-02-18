"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import AudioPanel from "@/components/AudioPanel";
import SummaryPanel from "@/components/SummaryPanel";
import TextEditor from "@/components/TextEditor";
import DrawingCanvas, { DrawingCanvasHandle } from "@/components/DrawingCanvas";
import PdfPanel from "@/components/PdfPanel";
import AiResultModal from "@/components/AiResultModal";
import { getNoteData, saveNote, getNoteTags, saveNoteTags } from "@/app/actions";

export default function NotePage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();
    const folderId = params.id as string;

    // 状態管理
    const [noteTitle, setNoteTitle] = useState("読み込み中...");
    const [summaryText, setSummaryText] = useState("");
    const [noteText, setNoteText] = useState("");
    const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"text" | "draw">("text");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved">("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [leftTab, setLeftTab] = useState<"audio" | "summary" | "doc">("audio");
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiModalLoading, setAiModalLoading] = useState(false);
    const [aiModalResult, setAiModalResult] = useState("");
    const [aiHistory, setAiHistory] = useState<{ id: string; timestamp: string; label: string; text: string }[]>([]);
    const canvasRef = useRef<DrawingCanvasHandle>(null);
    const pendingSketchRef = useRef<string | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isInitialLoadRef = useRef(true);

    // ノートデータを読み込み
    const loadNote = useCallback(async () => {
        try {
            setIsLoading(true);
            const [data, noteTags] = await Promise.all([
                getNoteData(folderId),
                getNoteTags(folderId),
            ]);
            setSummaryText(data.summary);
            setNoteText(data.note);
            setTags(noteTags);

            // スケッチ画像の復元
            if (data.sketchBase64) {
                if (canvasRef.current) {
                    canvasRef.current.loadImage(data.sketchBase64);
                } else {
                    pendingSketchRef.current = data.sketchBase64;
                }
            }

            setNoteTitle("ノート");
            // 初回ロード完了フラグ
            setTimeout(() => { isInitialLoadRef.current = false; }, 500);
        } catch (error) {
            console.error("読み込みエラー:", error);
        } finally {
            setIsLoading(false);
        }
    }, [folderId]);

    useEffect(() => {
        if (session) {
            loadNote();
        }
    }, [session, loadNote]);

    // タブ切り替え時に保留中のスケッチをロード
    useEffect(() => {
        if (activeTab === "draw" && pendingSketchRef.current && canvasRef.current) {
            setTimeout(() => {
                if (pendingSketchRef.current && canvasRef.current) {
                    canvasRef.current.loadImage(pendingSketchRef.current);
                    pendingSketchRef.current = null;
                }
            }, 100);
        }
    }, [activeTab]);

    // フォルダ名を取得
    useEffect(() => {
        const fetchFolderName = async () => {
            try {
                const res = await fetch(`/api/folder-name?id=${folderId}`);
                if (res.ok) {
                    const data = await res.json();
                    setNoteTitle(data.name);
                }
            } catch {
                // フォルダ名取得に失敗しても動作には支障なし
            }
        };
        if (session) {
            fetchFolderName();
        }
    }, [session, folderId]);

    // 自動保存（テキスト・要約変更時、5秒後に自動保存）
    useEffect(() => {
        if (isInitialLoadRef.current || isLoading) return;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(async () => {
            try {
                setAutoSaveStatus("saving");
                let sketchBase64: string | undefined;
                if (canvasRef.current && !canvasRef.current.isEmpty()) {
                    sketchBase64 = canvasRef.current.toDataURL();
                }
                await saveNote(folderId, {
                    summary: summaryText,
                    note: noteText,
                    sketchBase64,
                });
                setAutoSaveStatus("saved");
                setTimeout(() => setAutoSaveStatus(""), 2000);
            } catch {
                setAutoSaveStatus("");
            }
        }, 5000);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [noteText, summaryText, folderId, isLoading]);

    // 手動保存処理
    const handleSave = async () => {
        setIsSaving(true);
        try {
            let sketchBase64: string | undefined;
            if (canvasRef.current && !canvasRef.current.isEmpty()) {
                sketchBase64 = canvasRef.current.toDataURL();
            }

            await Promise.all([
                saveNote(folderId, {
                    summary: summaryText,
                    note: noteText,
                    sketchBase64,
                }),
                saveNoteTags(folderId, tags),
            ]);

            // 保存成功フィードバック
            setAutoSaveStatus("saved");
            setTimeout(() => setAutoSaveStatus(""), 2000);
        } catch (error) {
            console.error("保存エラー:", error);
            alert("保存に失敗しました。");
        } finally {
            setIsSaving(false);
        }
    };

    // 要約テキストをノートに挿入
    const handleInsertToNote = (text: string) => {
        setNoteText((prev) => prev ? prev + "\n\n---\n\n" + text : text);
        setActiveTab("text");
    };

    // ドキュメントテキストをAI要約（モーダル表示＋カスタム指示対応）
    const handleSummarizePdfText = async (text: string, customPrompt?: string) => {
        setAiModalOpen(true);
        setAiModalLoading(true);
        setAiModalResult("");
        try {
            const res = await fetch("/api/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, type: "pdf", customPrompt }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "要約に失敗しました");
            }
            const data = await res.json();
            setAiModalResult(data.summary);
            setSummaryText(data.summary);
            // 履歴に追加
            const label = customPrompt ? `要約+「${customPrompt.slice(0, 20)}...」` : "AI要約";
            setAiHistory((prev) => [
                {
                    id: Date.now().toString(),
                    timestamp: new Date().toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
                    label,
                    text: data.summary,
                },
                ...prev,
            ]);
            // AI履歴タブへ移動
            setLeftTab("summary");
        } catch (error) {
            console.error("ドキュメント要約エラー:", error);
            setAiModalResult(error instanceof Error ? `エラー: ${error.message}` : "要約に失敗しました");
        } finally {
            setAiModalLoading(false);
        }
    };

    // タグ追加
    const handleAddTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) {
            setTags([...tags, t]);
            setTagInput("");
        }
    };

    // タグ削除
    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    // 未ログイン
    if (status === "loading" || !session) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100vh",
                    background: "var(--bg-primary)",
                }}
            >
                <div className="spinner" style={{ width: "40px", height: "40px" }} />
            </div>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                overflow: "hidden",
                background: "var(--bg-primary)",
            }}
        >
            {/* ヘッダー */}
            <Header
                title={noteTitle}
                onSave={handleSave}
                isSaving={isSaving}
                onExportPDF={() => window.print()}
            />

            {/* 自動保存インジケーター + タグ */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 16px",
                    borderBottom: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                    gap: "8px",
                    flexWrap: "wrap",
                }}
            >
                {/* タグ表示・追加 */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>🏷️</span>
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                background: "rgba(99, 102, 241, 0.1)",
                                color: "var(--accent-primary)",
                                fontSize: "11px",
                                fontWeight: 500,
                            }}
                        >
                            {tag}
                            <button
                                onClick={() => handleRemoveTag(tag)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "10px",
                                    color: "var(--text-muted)",
                                    padding: "0 2px",
                                }}
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        placeholder="タグ追加..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(); }}
                        style={{
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            color: "var(--text-primary)",
                            fontSize: "11px",
                            width: "80px",
                        }}
                    />
                </div>

                {/* 自動保存ステータス */}
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {autoSaveStatus === "saving" && "💾 保存中..."}
                    {autoSaveStatus === "saved" && "✅ 保存済み"}
                </span>
            </div>

            {/* メインレイアウト: 左 / 右 */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    overflow: "hidden",
                    padding: "12px",
                    gap: "12px",
                }}
            >
                {/* 左パネル (タブ切り替え) */}
                <div
                    className="glass-card fade-in"
                    style={{
                        width: "420px",
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    {/* タブナビゲーション */}
                    <div style={{
                        display: "flex",
                        borderBottom: "1px solid var(--border-color)",
                        background: "var(--bg-secondary)",
                    }}>
                        {(["audio", "summary", "doc"] as const).map((tab) => {
                            const labels: Record<string, string> = { audio: "🎵 録音", summary: "🤖 AI", doc: "📁 資料" };
                            const isActive = leftTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setLeftTab(tab)}
                                    style={{
                                        flex: 1,
                                        padding: "10px 4px",
                                        fontSize: "12px",
                                        fontWeight: isActive ? 700 : 400,
                                        color: isActive ? "var(--accent-primary)" : "var(--text-muted)",
                                        background: "transparent",
                                        border: "none",
                                        borderBottom: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        marginBottom: "-1px",
                                    }}
                                >
                                    {labels[tab]}
                                    {tab === "summary" && aiHistory.length > 0 && (
                                        <span style={{
                                            marginLeft: "4px",
                                            background: "var(--accent-primary)",
                                            color: "white",
                                            borderRadius: "10px",
                                            fontSize: "10px",
                                            padding: "1px 5px",
                                        }}>
                                            {aiHistory.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* タブコンテンツ: 常にマウントしてdisplayで切り替え（録音継続のため）*/}
                    <div style={{ flex: 1, overflow: "hidden", padding: "12px", position: "relative" }}>
                        <div style={{ height: "100%", display: leftTab === "audio" ? "block" : "none" }}>
                            <AudioPanel
                                folderId={folderId}
                                selectedAudioId={selectedAudioId}
                                onSelectAudio={setSelectedAudioId}
                            />
                        </div>
                        <div style={{ height: "100%", display: leftTab === "summary" ? "flex" : "none", flexDirection: "column" }}>
                            <SummaryPanel
                                summaryText={summaryText}
                                onSummaryChange={setSummaryText}
                                selectedAudioId={selectedAudioId}
                                onInsertToNote={handleInsertToNote}
                                aiHistory={aiHistory}
                                onSelectHistory={(text: string) => setSummaryText(text)}
                            />
                        </div>
                        <div style={{ height: "100%", display: leftTab === "doc" ? "block" : "none" }}>
                            <PdfPanel
                                folderId={folderId}
                                onInsertToNote={handleInsertToNote}
                                onSummarizeText={handleSummarizePdfText}
                            />
                        </div>
                    </div>
                </div>

                {/* 右パネル (テキスト / 手書き) */}
                <div
                    className="glass-card fade-in"
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    {/* タブ */}
                    <div
                        style={{
                            display: "flex",
                            gap: "0",
                            padding: "0 16px",
                            borderBottom: "1px solid var(--border-color)",
                        }}
                    >
                        <button
                            className={`tab-button ${activeTab === "text" ? "active" : ""}`}
                            onClick={() => setActiveTab("text")}
                        >
                            📝 テキストエディタ
                        </button>
                        <button
                            className={`tab-button ${activeTab === "draw" ? "active" : ""}`}
                            onClick={() => setActiveTab("draw")}
                        >
                            ✏️ 手書きキャンバス
                        </button>
                    </div>

                    {/* タブコンテンツ */}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                        {activeTab === "text" ? (
                            <TextEditor content={noteText} onChange={setNoteText} />
                        ) : (
                            <DrawingCanvas ref={canvasRef} />
                        )}
                    </div>
                </div>
            </div>

            {/* AI結果モーダル */}
            <AiResultModal
                isOpen={aiModalOpen}
                isLoading={aiModalLoading}
                resultText={aiModalResult}
                onClose={() => setAiModalOpen(false)}
                onInsertToNote={handleInsertToNote}
            />
        </div>
    );
}
