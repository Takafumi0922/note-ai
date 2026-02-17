"use client";

import { useState, useRef } from "react";

interface AiResultModalProps {
    isOpen: boolean;
    isLoading: boolean;
    resultText: string;
    onClose: () => void;
    onInsertToNote: (text: string) => void;
}

export default function AiResultModal({
    isOpen,
    isLoading,
    resultText,
    onClose,
    onInsertToNote,
}: AiResultModalProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // 全文をノートに挿入
    const handleInsertAll = () => {
        if (resultText.trim()) {
            onInsertToNote(resultText);
            onClose();
        }
    };

    // 選択テキストをノートに挿入
    const handleInsertSelection = () => {
        if (!textareaRef.current) return;
        const ta = textareaRef.current;
        const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
        if (selected.trim()) {
            onInsertToNote(selected);
            onClose();
        } else {
            alert("テキストを選択してから押してください。");
        }
    };

    // クリップボードにコピー
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(resultText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            alert("コピーに失敗しました。");
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(4px)",
                animation: "fadeIn 0.2s ease",
            }}
            onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
        >
            <div
                style={{
                    width: "90%",
                    maxWidth: "640px",
                    maxHeight: "80vh",
                    background: "var(--bg-primary)",
                    borderRadius: "16px",
                    border: "1px solid var(--border-color)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    animation: "slideUp 0.3s ease",
                }}
            >
                {/* ヘッダー */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 20px",
                        borderBottom: "1px solid var(--border-color)",
                        background: "var(--bg-secondary)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isLoading ? (
                            <>
                                <span className="spinner" style={{ width: "18px", height: "18px" }} />
                                <span style={{ fontSize: "14px", fontWeight: 600 }}>🤖 AI処理中...</span>
                            </>
                        ) : (
                            <span style={{ fontSize: "14px", fontWeight: 600 }}>🤖 AI結果</span>
                        )}
                    </div>
                    {!isLoading && (
                        <button
                            className="btn-icon"
                            onClick={onClose}
                            style={{ width: "28px", height: "28px", fontSize: "16px" }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* コンテンツ */}
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "16px 20px", gap: "12px" }}>
                    {isLoading ? (
                        <div style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "16px",
                            minHeight: "200px",
                        }}>
                            <div style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                background: "var(--accent-gradient)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "24px",
                                animation: "pulse 1.5s ease infinite",
                            }}>
                                🤖
                            </div>
                            <p style={{ fontSize: "14px", color: "var(--text-muted)", textAlign: "center" }}>
                                AIがドキュメントを分析しています...<br />
                                <span style={{ fontSize: "11px" }}>しばらくお待ちください</span>
                            </p>
                        </div>
                    ) : (
                        <>
                            <textarea
                                ref={textareaRef}
                                className="editor-textarea"
                                value={resultText}
                                readOnly
                                style={{
                                    flex: 1,
                                    minHeight: "200px",
                                    borderRadius: "8px",
                                    background: "var(--bg-secondary)",
                                    border: "1px solid var(--border-color)",
                                    fontSize: "13px",
                                    lineHeight: 1.7,
                                }}
                            />

                            {/* アクションボタン */}
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <button
                                    className="btn-primary"
                                    onClick={handleInsertAll}
                                    style={{ flex: 1, fontSize: "12px", padding: "8px 12px" }}
                                >
                                    📋 全文をノートに追加
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={handleInsertSelection}
                                    style={{ flex: 1, fontSize: "12px", padding: "8px 12px" }}
                                >
                                    ✂️ 選択部分を追加
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={handleCopy}
                                    style={{ fontSize: "12px", padding: "8px 12px" }}
                                >
                                    {copied ? "✅ コピー済み" : "📎 コピー"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
