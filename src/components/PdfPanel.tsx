"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { uploadPdf, getPdfFiles, extractPdfText } from "@/app/actions";

interface PdfFile {
    id: string;
    name: string;
    createdTime: string;
}

interface PdfPanelProps {
    folderId: string;
    onInsertToNote: (text: string) => void;
    onSummarizeText: (text: string) => void;
}

export default function PdfPanel({
    folderId,
    onInsertToNote,
    onSummarizeText,
}: PdfPanelProps) {
    const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedPdf, setSelectedPdf] = useState<PdfFile | null>(null);
    const [pdfText, setPdfText] = useState("");
    const [isExtracting, setIsExtracting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // PDF一覧を読み込み
    const loadPdfs = useCallback(async () => {
        try {
            setIsLoading(true);
            const files = await getPdfFiles(folderId);
            setPdfFiles(files);
        } catch (error) {
            console.error("PDF一覧取得エラー:", error);
        } finally {
            setIsLoading(false);
        }
    }, [folderId]);

    useEffect(() => {
        loadPdfs();
    }, [loadPdfs]);

    // PDFアップロード
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== "application/pdf") {
            alert("PDFファイルのみアップロードできます。");
            return;
        }

        setIsUploading(true);
        try {
            // ファイルをBase64に変換
            const arrayBuffer = await file.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            await uploadPdf(folderId, file.name, base64);
            await loadPdfs();
        } catch (error) {
            console.error("PDFアップロードエラー:", error);
            alert("アップロードに失敗しました。");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // PDFテキスト抽出
    const handleSelectPdf = async (pdf: PdfFile) => {
        setSelectedPdf(pdf);
        setIsExtracting(true);
        setPdfText("");
        try {
            const text = await extractPdfText(pdf.id);
            setPdfText(text);
        } catch (error) {
            console.error("テキスト抽出エラー:", error);
            setPdfText("テキストの抽出に失敗しました。");
        } finally {
            setIsExtracting(false);
        }
    };

    // 全文をノートに追加
    const handleInsertAll = () => {
        if (pdfText.trim()) {
            onInsertToNote(pdfText);
        }
    };

    // 選択テキストをノートに追加
    const handleInsertSelection = () => {
        if (!textareaRef.current) return;
        const ta = textareaRef.current;
        const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
        if (selected.trim()) {
            onInsertToNote(selected);
        } else {
            alert("テキストを選択してから押してください。");
        }
    };

    // AI要約を実行
    const handleSummarize = () => {
        if (pdfText.trim()) {
            onSummarizeText(pdfText);
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
                    <span style={{ fontSize: "18px" }}>📄</span>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
                        PDF
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
                        accept=".pdf"
                        onChange={handleUpload}
                        disabled={isUploading}
                        style={{ display: "none" }}
                    />
                </label>
            </div>

            {/* PDF一覧 / テキスト表示の切り替え */}
            {selectedPdf ? (
                /* テキスト表示モード */
                <>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                            className="btn-icon"
                            onClick={() => { setSelectedPdf(null); setPdfText(""); }}
                            style={{ width: "28px", height: "28px", fontSize: "12px" }}
                        >
                            ←
                        </button>
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
                            {selectedPdf.name}
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
                                value={pdfText}
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

                            {/* アクションボタン */}
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                <button
                                    className="btn-secondary"
                                    onClick={handleSummarize}
                                    style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                                >
                                    🤖 AI要約
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={handleInsertAll}
                                    style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                                >
                                    📋 全文引用
                                </button>
                                <button
                                    className="btn-secondary"
                                    onClick={handleInsertSelection}
                                    style={{ flex: 1, fontSize: "11px", padding: "6px 8px" }}
                                >
                                    ✂️ 選択引用
                                </button>
                            </div>
                        </>
                    )}
                </>
            ) : (
                /* ファイル一覧モード */
                <div style={{ flex: 1, overflow: "auto" }}>
                    {isLoading ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            <span className="spinner" />
                        </div>
                    ) : pdfFiles.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 8px" }}>
                            <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>📄</span>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                PDFがありません
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {pdfFiles.map((pdf) => (
                                <button
                                    key={pdf.id}
                                    className="audio-item"
                                    onClick={() => handleSelectPdf(pdf)}
                                    style={{ textAlign: "left" }}
                                >
                                    <span style={{ fontSize: "16px" }}>📄</span>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <p style={{
                                            fontSize: "13px",
                                            fontWeight: 500,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {pdf.name}
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
