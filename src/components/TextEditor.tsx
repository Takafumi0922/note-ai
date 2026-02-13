"use client";

interface TextEditorProps {
    content: string;
    onChange: (content: string) => void;
}

export default function TextEditor({ content, onChange }: TextEditorProps) {
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
                }}
            >
                <button
                    className="btn-icon"
                    title="見出し"
                    style={{ width: "36px", height: "36px", fontSize: "14px", fontWeight: 700 }}
                    onClick={() => onChange(content + "\n# ")}
                >
                    H
                </button>
                <button
                    className="btn-icon"
                    title="太字"
                    style={{ width: "36px", height: "36px", fontSize: "14px", fontWeight: 700 }}
                    onClick={() => onChange(content + "****")}
                >
                    B
                </button>
                <button
                    className="btn-icon"
                    title="斜体"
                    style={{
                        width: "36px",
                        height: "36px",
                        fontSize: "14px",
                        fontStyle: "italic",
                    }}
                    onClick={() => onChange(content + "**")}
                >
                    I
                </button>
                <button
                    className="btn-icon"
                    title="箇条書き"
                    style={{ width: "36px", height: "36px", fontSize: "14px" }}
                    onClick={() => onChange(content + "\n- ")}
                >
                    •
                </button>
                <button
                    className="btn-icon"
                    title="チェックリスト"
                    style={{ width: "36px", height: "36px", fontSize: "14px" }}
                    onClick={() => onChange(content + "\n- [ ] ")}
                >
                    ☑
                </button>
                <button
                    className="btn-icon"
                    title="コードブロック"
                    style={{ width: "36px", height: "36px", fontSize: "13px" }}
                    onClick={() => onChange(content + "\n```\n\n```")}
                >
                    {"</>"}
                </button>
            </div>

            {/* エディタ本体 */}
            <textarea
                className="editor-textarea"
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder="ここにノートを入力してください...&#10;&#10;Markdown記法が使用できます。&#10;# 見出し&#10;- リスト&#10;**太字**"
                style={{ flex: 1 }}
            />
        </div>
    );
}
