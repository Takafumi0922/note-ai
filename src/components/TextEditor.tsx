"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TextEditorProps {
    content: string;
    onChange: (content: string) => void;
}

export default function TextEditor({ content, onChange }: TextEditorProps) {
    const [showPreview, setShowPreview] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    // テキストエリアに文字列を挿入してカーソルを合わせる補助関数
    const insertText = (before: string, after: string = "") => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = content.substring(start, end);

        const newText = content.substring(0, start) + before + selected + after + content.substring(end);
        onChange(newText);

        // カーソル位置を更新 (Reactの再レンダリング後に行う)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    // キーボードショートカット
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case "b":
                    e.preventDefault();
                    insertText("**", "**");
                    break;
                case "i":
                    e.preventDefault();
                    insertText("*", "*");
                    break;
                case "k":
                    e.preventDefault();
                    insertText("[", "](url)");
                    break;
            }
        }

        // Tabキーでのインデント
        if (e.key === "Tab") {
            e.preventDefault();
            insertText("  ");
        }
    };

    // 画像のドラッグ＆ドロップ
    const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();

        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image/")) return;

        setIsUploading(true);
        // 一時的にプレースホルダーを挿入
        const placeholder = `\n![アップロード中...]()\n`;
        const startPos = textareaRef.current?.selectionStart || content.length;
        const newContent = content.slice(0, startPos) + placeholder + content.slice(startPos);
        onChange(newContent);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload-image", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("アップロード失敗");
            const data = await res.json();

            // プレースホルダーを実際の画像URLに置換
            onChange(newContent.replace(placeholder, `\n![${file.name}](${data.url})\n`));

        } catch (error) {
            console.error("画像アップロードエラー:", error);
            alert("画像のアップロードに失敗しました");
            // プレースホルダーを削除
            onChange(newContent.replace(placeholder, ""));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* ツールバー */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--border-color)",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                }}
            >
                <div style={{ display: "flex", gap: "4px" }}>
                    <button
                        className="btn-icon"
                        title="見出し"
                        style={{ width: "36px", height: "36px", fontSize: "14px", fontWeight: 700 }}
                        onClick={() => insertText("\n### ")}
                    >
                        H
                    </button>
                    <button
                        className="btn-icon"
                        title="太字 (Ctrl+B)"
                        style={{ width: "36px", height: "36px", fontSize: "14px", fontWeight: 700 }}
                        onClick={() => insertText("**", "**")}
                    >
                        B
                    </button>
                    <button
                        className="btn-icon"
                        title="斜体 (Ctrl+I)"
                        style={{
                            width: "36px",
                            height: "36px",
                            fontSize: "14px",
                            fontStyle: "italic",
                        }}
                        onClick={() => insertText("*", "*")}
                    >
                        I
                    </button>
                    <button
                        className="btn-icon"
                        title="箇条書き"
                        style={{ width: "36px", height: "36px", fontSize: "14px" }}
                        onClick={() => insertText("\n- ")}
                    >
                        •
                    </button>
                    <button
                        className="btn-icon"
                        title="チェックリスト"
                        style={{ width: "36px", height: "36px", fontSize: "14px" }}
                        onClick={() => insertText("\n- [ ] ")}
                    >
                        ☑
                    </button>
                    <button
                        className="btn-icon"
                        title="画像"
                        style={{ width: "36px", height: "36px", fontSize: "14px" }}
                        onClick={() => insertText("\n![altテキスト](", ")")}
                    >
                        🖼️
                    </button>
                    <button
                        className="btn-icon"
                        title="コードブロック"
                        style={{ width: "36px", height: "36px", fontSize: "13px" }}
                        onClick={() => insertText("\n```\n", "\n```")}
                    >
                        {"</>"}
                    </button>
                </div>

                {/* プレビュー切り替え */}
                <button
                    className={`btn-secondary ${showPreview ? 'active' : ''}`}
                    onClick={() => setShowPreview(!showPreview)}
                    style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        background: showPreview ? "var(--accent-primary)" : "",
                        color: showPreview ? "white" : "",
                        border: showPreview ? "none" : "",
                    }}
                >
                    {showPreview ? "👁️ プレビュー分割" : "👁️ プレビュー表示"}
                </button>
            </div>

            {/* エディタ本体レイアウト */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {/* 編集エリア */}
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    borderRight: showPreview ? "1px solid var(--border-color)" : "none"
                }}>
                    <textarea
                        ref={textareaRef}
                        className="editor-textarea"
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        placeholder="ここにノートを入力してください...&#10; (画像をドラッグ＆ドロップで挿入できます)&#10;&#10;Markdown記法が使用できます。&#10;# 見出し&#10;- リスト&#10;**太字**"
                        style={{ flex: 1, padding: "16px", resize: "none", opacity: isUploading ? 0.7 : 1 }}
                        disabled={isUploading}
                    />
                </div>

                {/* プレビューエリア */}
                {showPreview && (
                    <div style={{ flex: 1, overflow: "auto", padding: "16px" }} className="markdown-preview">
                        {content ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content}
                            </ReactMarkdown>
                        ) : (
                            <div style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>
                                プレビュー...
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Markdown固有のスタイル (グローバルCSSで定義する方がベターですがコンポーネント内に閉じ込めるため) */}
            <style jsx global>{`
                .markdown-preview {
                    color: var(--text-primary);
                    font-size: 14px;
                    line-height: 1.7;
                }
                .markdown-preview h1,
                .markdown-preview h2,
                .markdown-preview h3 {
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                .markdown-preview h1 { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
                .markdown-preview h2 { font-size: 1.3em; }
                .markdown-preview h3 { font-size: 1.1em; }
                .markdown-preview p { margin-bottom: 1em; }
                .markdown-preview ul, .markdown-preview ol { padding-left: 2em; margin-bottom: 1em; }
                .markdown-preview li { margin-bottom: 0.25em; }
                .markdown-preview img { max-width: 100%; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .markdown-preview code { background: rgba(0,0,0,0.05); padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
                .markdown-preview pre { background: var(--bg-primary); padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; border: 1px solid var(--border-color); }
                .markdown-preview pre code { background: none; padding: 0; }
                .markdown-preview blockquote { border-left: 4px solid var(--border-color); padding-left: 1em; color: var(--text-muted); margin: 0 0 1em 0; }
                .markdown-preview input[type="checkbox"] { margin-right: 0.5em; }
            `}</style>
        </div>
    );
}
