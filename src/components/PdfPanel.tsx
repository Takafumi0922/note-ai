"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { uploadDocument, getDocumentFiles, extractDocumentText } from "@/app/actions";

// 対応MIMEタイプ
const ACCEPTED_TYPES: Record<string, string> = {
    "application/pdf": "📄",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
    "application/msword": "📝",
    "text/plain": "📃",
};

// ファイル拡張子からMIMEを取得
function getMimeType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "pdf": return "application/pdf";
        case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        case "doc": return "application/msword";
        case "txt": return "text/plain";
        default: return "application/octet-stream";
    }
}

interface DocFile {
    id: string;
    name: string;
    mimeType: string;
    createdTime: string;
}

interface PdfPanelProps {
    folderId: string;
    onInsertToNote: (text: string) => void;
    onSummarizeText: (text: string, customPrompt?: string) => void;
}

export default function PdfPanel({
    folderId,
    onInsertToNote,
    onSummarizeText,
}: PdfPanelProps) {
    const [docFiles, setDocFiles] = useState<DocFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null);
    const [docText, setDocText] = useState("");
    const [isExtracting, setIsExtracting] = useState(false);
    const [customPrompt, setCustomPrompt] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ドキュメント一覧取得
    const loadDocs = useCallback(async () => {
        try {
            setIsLoading(true);
            const files = await getDocumentFiles(folderId);
            setDocFiles(files);
        } catch (error) {
            console.error("ドキュメント一覧取得エラー:", error);
        } finally {
            setIsLoading(false);
        }
    }, [folderId]);

    useEffect(() => {
        loadDocs();
    }, [loadDocs]);

    // ファイルアップロード
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const mimeType = getMimeType(file.name);
        if (!ACCEPTED_TYPES[mimeType]) {
            alert("PDF、Word (.docx/.doc)、テキスト (.txt) のみ対応しています。");
            return;
        }

        setIsUploading(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            await uploadDocument(folderId, file.name, base64, mimeType);
            await loadDocs();
        } catch (error) {
            console.error("アップロードエラー:", error);
            alert("アップロードに失敗しました。");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // テキスト抽出
    const handleSelectDoc = async (doc: DocFile) => {
        setSelectedDoc(doc);
        setIsExtracting(true);
        setDocText("");
        try {
            const text = await extractDocumentText(doc.id, doc.mimeType);
            setDocText(text);
        } catch (error) {
            console.error("テキスト抽出エラー:", error);
            setDocText("テキストの抽出に失敗しました。");
        } finally {
            setIsExtracting(false);
        }
    };

    // アイコン取得
    const getIcon = (mimeType: string) => ACCEPTED_TYPES[mimeType] || "📄";

    return (
        <div
            className="glass-card fade-in"
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                padding: "16px",
                gap: "10px",
            }}
        >
            {/* タイトルとアップロードボタン */}
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
                    <span style={{ fontSize: "18px" }}>📁</span>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
                        ドキュメント
                    </h3>
                </div>

                <label
                    className="btn-primary"
                    style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        cursor: isUploading ? "not-allowed" : "pointer",
                        opacity: isUploading ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                    }}
                >
                    {isUploading ? (
                        <><span className="spinner" style={{ width: "12px", height: "12px" }} /> アップロード中...</>
                    ) : (
                        <>📎 追加</>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleUpload}
                        disabled={isUploading}
                        style={{ display: "none" }}
                    />
                </label>
            </div>

            {/* テキスト表示 or ファイル一覧 */}
            {selectedDoc ? (
                <>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                            className="btn-icon"
                            onClick={() => { setSelectedDoc(null); setDocText(""); }}
                            style={{ width: "28px", height: "28px", fontSize: "12px" }}
                        >
                            ←
                        </button>
                        <span style={{ fontSize: "14px" }}>{getIcon(selectedDoc.mimeType)}</span>
                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                            }}
                        >
                            {selectedDoc.name}
                        </span>
                    </div>

                    {isExtracting ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: "8px" }}>
                            <span className="spinner" />
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>テキスト抽出中...</span>
                        </div>
                    ) : (
                        <>
                            <textarea
                                ref={textareaRef}
                                className="editor-textarea"
                                value={docText}
                                readOnly
                                style={{
                                    flex: 1,
                                    borderRadius: "8px",
                                    background: "var(--bg-secondary)",
                                    border: "1px solid var(--border-color)",
                                    fontSize: "12px",
                                    lineHeight: 1.6,
                                }}
                            />

                            {/* カスタム指示入力欄 */}
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                <input
                                    type="text"
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="追加指示（例: 質問を考えて）"
                                    style={{
                                        flex: 1,
                                        padding: "6px 10px",
                                        borderRadius: "6px",
                                        border: "1px solid var(--border-color)",
                                        background: "var(--bg-primary)",
                                        color: "var(--text-primary)",
                                        fontSize: "11px",
                                        outline: "none",
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && docText.trim()) {
                                            onSummarizeText(docText, customPrompt || undefined);
                                        }
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                <button
                                    className="btn-secondary"
                                    onClick={() => docText.trim() && onSummarizeText(docText, customPrompt || undefined)}
                                    style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                                >
                                    {customPrompt.trim() ? "🤖 AI要約 + 指示" : "🤖 AI要約"}
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={() => docText.trim() && onInsertToNote(docText)}
                                    style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                                >
                                    📋 全文引用
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        if (!textareaRef.current) return;
                                        const ta = textareaRef.current;
                                        const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
                                        if (selected.trim()) {
                                            onInsertToNote(selected);
                                        } else {
                                            alert("テキストを選択してから押してください。");
                                        }
                                    }}
                                    style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                                >
                                    ✂️ 選択引用
                                </button>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <div style={{ flex: 1, overflow: "auto" }}>
                    {isLoading ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            <span className="spinner" />
                        </div>
                    ) : docFiles.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 8px" }}>
                            <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>📁</span>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                ドキュメントがありません
                            </p>
                            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                                PDF / Word / テキスト対応
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {docFiles.map((doc) => (
                                <button
                                    key={doc.id}
                                    className="audio-item"
                                    onClick={() => handleSelectDoc(doc)}
                                    style={{ textAlign: "left" }}
                                >
                                    <span style={{ fontSize: "16px" }}>{getIcon(doc.mimeType)}</span>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <p style={{
                                            fontSize: "13px",
                                            fontWeight: 500,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {doc.name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
