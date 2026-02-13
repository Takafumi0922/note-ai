"use client";

import { useRouter } from "next/navigation";

// ヘッダーコンポーネント
interface HeaderProps {
    title: string;
    onSave: () => void;
    isSaving: boolean;
}

export default function Header({ title, onSave, isSaving }: HeaderProps) {
    const router = useRouter();

    return (
        <header
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 24px",
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-color)",
                height: "60px",
                flexShrink: 0,
            }}
        >
            {/* 左: ホームへ戻る */}
            <button
                className="btn-icon"
                onClick={() => router.push("/")}
                title="ホームに戻る"
                style={{ fontSize: "20px" }}
            >
                ←
            </button>

            {/* 中央: タイトル */}
            <h1
                style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    background: "var(--accent-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "0.5px",
                }}
            >
                📋 {title}
            </h1>

            {/* 右: 保存ボタン */}
            <button
                className="btn-primary"
                onClick={onSave}
                disabled={isSaving}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    minWidth: "100px",
                    justifyContent: "center",
                }}
            >
                {isSaving ? (
                    <>
                        <span className="spinner" /> 保存中...
                    </>
                ) : (
                    <>💾 保存</>
                )}
            </button>
        </header>
    );
}
