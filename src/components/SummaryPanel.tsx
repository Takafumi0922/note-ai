"use client";

import { useState, useRef } from "react";

interface AiHistoryItem {
    id: string;
    timestamp: string;
    label: string;
    text: string;
}

interface SummaryPanelProps {
    summaryText: string;
    onSummaryChange: (text: string) => void;
    selectedAudioId: string | null;
    onInsertToNote?: (text: string) => void;
    aiHistory?: AiHistoryItem[];
    onSelectHistory?: (text: string) => void;
    onAddHistory?: (text: string, label: string) => void;
    model?: string;
}

// プロンプトテンプレートの定義
const PROMPT_TEMPLATES = [
    { label: "標準（詳細に要約）", value: "" },
    { label: "箇条書きで短く", value: "要点を3〜5個の短い箇条書きでまとめてください。" },
    { label: "議事録形式", value: "【日時】【参加者】【決定事項】【TODO】の見出しをつけて議事録形式でまとめてください。" },
    { label: "結論だけ", value: "結論と最重要ポイントだけを100文字以内で端的に教えてください。" }
];

export default function SummaryPanel({
    summaryText,
    onSummaryChange,
    selectedAudioId,
    onInsertToNote,
    aiHistory = [],
    onSelectHistory,
    onAddHistory,
    model = "gemini-2.5-flash",
}: SummaryPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [innerTab, setInnerTab] = useState<"current" | "history">("current");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // AI音声要約を実行 (ストリーミング対応)
    const handleSummarize = async () => {
        if (!selectedAudioId) {
            alert("要約する音声ファイルを選択してください。");
            return;
        }

        setIsLoading(true);
        setInnerTab("current");
        onSummaryChange(""); // 既存のテキストをクリア
        let accumulatedText = "";

        try {
            const res = await fetch("/api/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileId: selectedAudioId,
                    model,
                    customPrompt: selectedTemplate
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "要約に失敗しました");
            }

            if (!res.body) throw new Error("レスポンスボディがありません");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;
                onSummaryChange(accumulatedText);
            }

            // 要約完了後に履歴に追加
            const labelStr = selectedTemplate
                ? `🎙️ 音声要約 (${PROMPT_TEMPLATES.find(t => t.value === selectedTemplate)?.label})`
                : "🎙️ 音声要約";
            onAddHistory?.(accumulatedText, labelStr);

        } catch (error) {
            console.error("要約エラー:", error);
            alert(
                error instanceof Error ? error.message : "要約処理中にエラーが発生しました"
            );
        } finally {
            setIsLoading(false);
        }
    };

    // 全文をノートに追加
    const handleInsertAll = () => {
        if (onInsertToNote && summaryText.trim()) {
            onInsertToNote(summaryText);
        }
    };

    // 選択テキストをノートに追加
    const handleInsertSelection = () => {
        if (!onInsertToNote || !textareaRef.current) return;
        const ta = textareaRef.current;
        const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
        if (selected.trim()) {
            onInsertToNote(selected);
        } else {
            alert("テキストを選択してから「選択追加」を押してください。");
        }
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                gap: "10px",
            }}
        >
            {/* 内部タブ: 現在の要約 / 履歴 */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <div style={{
                    display: "flex",
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                    padding: "3px",
                    gap: "2px",
                    flex: 1,
                }}>
                    {(["current", "history"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setInnerTab(t)}
                            style={{
                                flex: 1,
                                padding: "5px 8px",
                                fontSize: "11px",
                                fontWeight: innerTab === t ? 700 : 400,
                                color: innerTab === t ? "white" : "var(--text-muted)",
                                background: innerTab === t ? "var(--accent-primary)" : "transparent",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            {t === "current" ? "✨ 現在の要約" : `🕐 履歴${aiHistory.length > 0 ? ` (${aiHistory.length})` : ""}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* 音声要約コントロール領域 */}
            {innerTab === "current" && (
                <div style={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    background: "var(--bg-secondary)",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)"
                }}>
                    <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        disabled={isLoading}
                        style={{
                            flex: 1,
                            padding: "6px",
                            fontSize: "12px",
                            borderRadius: "4px",
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-primary)",
                            color: "var(--text-primary)"
                        }}
                    >
                        {PROMPT_TEMPLATES.map(t => (
                            <option key={t.label} value={t.value}>{t.label}</option>
                        ))}
                    </select>

                    <button
                        className="btn-primary"
                        onClick={handleSummarize}
                        disabled={isLoading || !selectedAudioId}
                        style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {isLoading ? (
                            <><span className="spinner" style={{ width: "12px", height: "12px" }} /> 要約中</>
                        ) : (
                            <>🎙️ 要約</>
                        )}
                    </button>
                </div>
            )}

            {/* 現在の要約タブ */}
            {innerTab === "current" && (
                <>
                    {!selectedAudioId && (
                        <p style={{
                            fontSize: "11px",
                            color: "var(--warning)",
                            textAlign: "center",
                            padding: "4px",
                            background: "rgba(245, 158, 11, 0.1)",
                            borderRadius: "6px",
                        }}>
                            ⚠️ 音声ファイルを選択してください
                        </p>
                    )}

                    <textarea
                        ref={textareaRef}
                        className="editor-textarea"
                        value={summaryText}
                        onChange={(e) => onSummaryChange(e.target.value)}
                        placeholder="要約結果がここに表示されます..."
                        style={{
                            flex: 1,
                            borderRadius: "10px",
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border-color)",
                            fontSize: "13px",
                            lineHeight: 1.7,
                            padding: "12px",
                        }}
                    />

                    {onInsertToNote && summaryText.trim() && (
                        <div style={{ display: "flex", gap: "6px" }}>
                            <button
                                className="btn-secondary"
                                onClick={handleInsertAll}
                                style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                            >
                                📋 全文追加
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={handleInsertSelection}
                                style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                            >
                                ✂️ 選択追加
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* 履歴タブ */}
            {innerTab === "history" && (
                <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {aiHistory.length === 0 ? (
                        <div style={{ textAlign: "center", paddingTop: "40px" }}>
                            <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>🤖</span>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>AI返答の履歴がありません</p>
                            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>ドキュメントのAI要約を実行すると履歴が残ります</p>
                        </div>
                    ) : (
                        aiHistory.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                    background: "var(--bg-secondary)",
                                }}
                            >
                                {/* 履歴ヘッダー */}
                                <button
                                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "8px 10px",
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        gap: "6px",
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-primary)" }}>
                                            {item.label}
                                        </span>
                                        <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "6px" }}>
                                            {item.timestamp}
                                        </span>
                                        {expandedId !== item.id && (
                                            <p style={{
                                                fontSize: "11px",
                                                color: "var(--text-muted)",
                                                marginTop: "2px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}>
                                                {item.text.slice(0, 60)}...
                                            </p>
                                        )}
                                    </div>
                                    <span style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0 }}>
                                        {expandedId === item.id ? "▲" : "▼"}
                                    </span>
                                </button>

                                {/* 展開時のコンテンツ */}
                                {expandedId === item.id && (
                                    <div style={{ padding: "0 10px 10px" }}>
                                        <p style={{
                                            fontSize: "12px",
                                            lineHeight: 1.7,
                                            color: "var(--text-primary)",
                                            whiteSpace: "pre-wrap",
                                            maxHeight: "200px",
                                            overflow: "auto",
                                            padding: "8px",
                                            background: "var(--bg-primary)",
                                            borderRadius: "6px",
                                            marginBottom: "6px",
                                        }}>
                                            {item.text}
                                        </p>
                                        <div style={{ display: "flex", gap: "4px" }}>
                                            <button
                                                className="btn-secondary"
                                                onClick={() => {
                                                    onSelectHistory?.(item.text);
                                                    setInnerTab("current");
                                                }}
                                                style={{ flex: 1, fontSize: "10px", padding: "4px 6px" }}
                                            >
                                                📌 現在にセット
                                            </button>
                                            <button
                                                className="btn-secondary"
                                                onClick={() => onInsertToNote?.(item.text)}
                                                style={{ flex: 1, fontSize: "10px", padding: "4px 6px" }}
                                            >
                                                📋 ノートに追加
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
