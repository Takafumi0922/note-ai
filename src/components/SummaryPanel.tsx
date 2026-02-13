"use client";

import { useState, useRef } from "react";

interface SummaryPanelProps {
    summaryText: string;
    onSummaryChange: (text: string) => void;
    selectedAudioId: string | null;
    onInsertToNote?: (text: string) => void;
}

export default function SummaryPanel({
    summaryText,
    onSummaryChange,
    selectedAudioId,
    onInsertToNote,
}: SummaryPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // AI要約を実行
    const handleSummarize = async () => {
        if (!selectedAudioId) {
            alert("要約する音声ファイルを選択してください。");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId: selectedAudioId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "要約に失敗しました");
            }

            const data = await res.json();
            onSummaryChange(data.summary);
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
            className="glass-card fade-in"
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                padding: "16px",
                gap: "12px",
            }}
        >
            {/* タイトルと要約ボタン */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: "8px",
                    borderBottom: "1px solid var(--border-color)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>✨</span>
                    <h3
                        style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                        }}
                    >
                        AI要約
                    </h3>
                </div>

                <button
                    className="btn-primary"
                    onClick={handleSummarize}
                    disabled={isLoading || !selectedAudioId}
                    style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner" /> 要約中...
                        </>
                    ) : (
                        <>🤖 要約実行</>
                    )}
                </button>
            </div>

            {/* 要約選択状態の表示 */}
            {!selectedAudioId && (
                <p
                    style={{
                        fontSize: "12px",
                        color: "var(--warning)",
                        textAlign: "center",
                        padding: "4px",
                        background: "rgba(245, 158, 11, 0.1)",
                        borderRadius: "6px",
                    }}
                >
                    ⚠️ 音声ファイルを選択してください
                </p>
            )}

            {/* 要約テキストエリア */}
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
                    fontSize: "14px",
                    lineHeight: 1.7,
                }}
            />

            {/* ノートへ追加ボタン */}
            {onInsertToNote && summaryText.trim() && (
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        className="btn-secondary"
                        onClick={handleInsertAll}
                        style={{ flex: 1, fontSize: "12px", padding: "8px 12px" }}
                    >
                        📋 全文追加
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={handleInsertSelection}
                        style={{ flex: 1, fontSize: "12px", padding: "8px 12px" }}
                    >
                        ✂️ 選択追加
                    </button>
                </div>
            )}
        </div>
    );
}
