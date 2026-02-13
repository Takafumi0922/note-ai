"use client";

import { signIn } from "next-auth/react";

export default function LoginScreen() {
    return (
        <div className="login-container">
            <div
                className="fade-in"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "32px",
                    maxWidth: "480px",
                    width: "100%",
                    padding: "0 24px",
                }}
            >
                {/* ロゴ・タイトル */}
                <div style={{ textAlign: "center" }}>
                    <div
                        style={{
                            fontSize: "64px",
                            marginBottom: "16px",
                            filter: "drop-shadow(0 0 20px rgba(99,102,241,0.4))",
                        }}
                    >
                        📋
                    </div>
                    <h1
                        style={{
                            fontSize: "32px",
                            fontWeight: 700,
                            background: "var(--accent-gradient)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            marginBottom: "8px",
                        }}
                    >
                        ノート管理AI
                    </h1>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            fontSize: "15px",
                            lineHeight: 1.6,
                        }}
                    >
                        音声・テキスト・手書きメモを
                        <br />
                        AIで要約し、一元管理
                    </p>
                </div>

                {/* 機能紹介 */}
                <div
                    className="glass-card"
                    style={{
                        padding: "24px",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                    }}
                >
                    {[
                        { icon: "🎙️", text: "音声メモの録音・管理" },
                        { icon: "🤖", text: "AIで音声を自動要約" },
                        { icon: "📝", text: "Markdownテキストエディタ" },
                        { icon: "✏️", text: "手書きスケッチ機能" },
                        { icon: "☁️", text: "Google Driveで同期" },
                    ].map(({ icon, text }, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "8px 0",
                            }}
                        >
                            <span style={{ fontSize: "20px" }}>{icon}</span>
                            <span
                                style={{ fontSize: "14px", color: "var(--text-secondary)" }}
                            >
                                {text}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ログインボタン */}
                <button
                    onClick={() => signIn("google")}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        width: "100%",
                        padding: "16px 24px",
                        background: "white",
                        color: "#333",
                        border: "none",
                        borderRadius: "14px",
                        fontSize: "16px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 30px rgba(0,0,0,0.3)";
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Googleでログイン
                </button>

                {/* フッター */}
                <p
                    style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        textAlign: "center",
                    }}
                >
                    ログインすることで、Google Driveにノートを保存できます
                </p>
            </div>
        </div>
    );
}
