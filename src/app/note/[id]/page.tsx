"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import AudioPanel from "@/components/AudioPanel";
import SummaryPanel from "@/components/SummaryPanel";
import TextEditor from "@/components/TextEditor";
import DrawingCanvas, { DrawingCanvasHandle } from "@/components/DrawingCanvas";
import { getNoteData, saveNote } from "@/app/actions";

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
    const canvasRef = useRef<DrawingCanvasHandle>(null);
    // スケッチの読み込みを遅延するためのデータ保持
    const pendingSketchRef = useRef<string | null>(null);

    // ノートデータを読み込み
    const loadNote = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getNoteData(folderId);
            setSummaryText(data.summary);
            setNoteText(data.note);

            // スケッチ画像の復元
            if (data.sketchBase64) {
                if (canvasRef.current) {
                    canvasRef.current.loadImage(data.sketchBase64);
                } else {
                    // キャンバスがまだマウントされていない場合は保持
                    pendingSketchRef.current = data.sketchBase64;
                }
            }

            setNoteTitle("ノート");
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
            // 少し遅延してキャンバスが完全にマウントされるのを待つ
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

    // 保存処理
    const handleSave = async () => {
        setIsSaving(true);
        try {
            let sketchBase64: string | undefined;

            // キャンバスデータの取得
            if (canvasRef.current && !canvasRef.current.isEmpty()) {
                sketchBase64 = canvasRef.current.toDataURL();
            }

            await saveNote(folderId, {
                summary: summaryText,
                note: noteText,
                sketchBase64,
            });

            // 保存成功フィードバック
            const saveBtn = document.querySelector(".btn-primary") as HTMLElement;
            if (saveBtn) {
                saveBtn.style.boxShadow = "0 0 30px rgba(16, 185, 129, 0.5)";
                setTimeout(() => {
                    saveBtn.style.boxShadow = "";
                }, 1000);
            }
        } catch (error) {
            console.error("保存エラー:", error);
            alert("保存に失敗しました。");
        } finally {
            setIsSaving(false);
        }
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
            <Header title={noteTitle} onSave={handleSave} isSaving={isSaving} />

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
                {/* 左パネル (音声 + AI要約) */}
                <div
                    style={{
                        width: "380px",
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        overflow: "hidden",
                    }}
                >
                    {/* 左上: 音声操作 */}
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <AudioPanel
                            folderId={folderId}
                            selectedAudioId={selectedAudioId}
                            onSelectAudio={setSelectedAudioId}
                        />
                    </div>

                    {/* 左下: AI要約 */}
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <SummaryPanel
                            summaryText={summaryText}
                            onSummaryChange={setSummaryText}
                            selectedAudioId={selectedAudioId}
                        />
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
        </div>
    );
}
