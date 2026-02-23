"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { uploadAudio, getAudioFiles } from "@/app/actions";

// 音声ファイルの型
interface AudioFile {
    id: string;
    name: string;
    createdTime: string;
}

interface AudioPanelProps {
    folderId: string;
    selectedAudioId: string | null;
    onSelectAudio: (id: string) => void;
}

export default function AudioPanel({
    folderId,
    selectedAudioId,
    onSelectAudio,
}: AudioPanelProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // 音声ファイル一覧を読み込み
    const loadAudioFiles = useCallback(async () => {
        try {
            const files = await getAudioFiles(folderId);
            setAudioFiles(files);
        } catch (error) {
            console.error("音声ファイル読み込みエラー:", error);
        } finally {
            setIsLoading(false);
        }
    }, [folderId]);

    useEffect(() => {
        loadAudioFiles();
    }, [loadAudioFiles]);

    // 選択された音声が変わった時に再生用URLを設定
    useEffect(() => {
        if (selectedAudioId) {
            // Google Drive共有リンク（読み取り専用アクセスが必要）
            // /api/audio-stream のようなプロキシAPIがない場合、DirectLinkを使用
            setAudioUrl(`https://drive.google.com/uc?export=download&id=${selectedAudioId}`);
        } else {
            setAudioUrl(null);
        }
    }, [selectedAudioId]);

    // 録音タイマー
    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setRecordingTime(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    // 時間フォーマット
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // 録音開始
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm;codecs=opus",
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // ストリームの停止
                stream.getTracks().forEach((track) => track.stop());

                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                await uploadRecording(blob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("マイクアクセスエラー:", error);
            alert("マイクへのアクセスが拒否されました。");
        }
    };

    // 録音停止
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // 録音データのアップロード
    const uploadRecording = async (blob: Blob) => {
        setIsUploading(true);
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ""
                )
            );

            const now = new Date();
            const fileName = `recording_${now.getFullYear()}${(now.getMonth() + 1)
                .toString()
                .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now
                    .getHours()
                    .toString()
                    .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}.webm`;

            await uploadAudio(folderId, base64, fileName);
            await loadAudioFiles();
        } catch (error) {
            console.error("アップロードエラー:", error);
            alert("音声のアップロードに失敗しました。");
        } finally {
            setIsUploading(false);
        }
    };

    // 選択中のファイル名を取得
    const selectedFile = audioFiles.find(f => f.id === selectedAudioId);

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
            {/* タイトル */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    paddingBottom: "8px",
                    borderBottom: "1px solid var(--border-color)",
                }}
            >
                <span style={{ fontSize: "18px" }}>🎙️</span>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    音声操作
                </h3>
            </div>

            {/* 録音ボタン */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    justifyContent: "center",
                }}
            >
                {isRecording ? (
                    <button
                        className="btn-danger recording-pulse"
                        onClick={stopRecording}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            borderRadius: "50px",
                            padding: "12px 24px",
                        }}
                    >
                        ⏹ 停止 ({formatTime(recordingTime)})
                    </button>
                ) : (
                    <button
                        className="btn-primary"
                        onClick={startRecording}
                        disabled={isUploading}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            borderRadius: "50px",
                            padding: "12px 24px",
                        }}
                    >
                        {isUploading ? (
                            <>
                                <span className="spinner" /> アップロード中...
                            </>
                        ) : (
                            <>🎤 録音開始</>
                        )}
                    </button>
                )}
            </div>

            {/* 波形アニメーション */}
            {isRecording && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        height: "32px",
                    }}
                >
                    {[...Array(7)].map((_, i) => (
                        <span key={i} className="wave-bar" />
                    ))}
                </div>
            )}

            {/* 音声ファイル一覧 */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                }}
            >
                <p
                    style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                    }}
                >
                    📁 音声ファイル一覧
                </p>

                {isLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton" style={{ height: "40px" }} />
                        ))}
                    </div>
                ) : audioFiles.length === 0 ? (
                    <p
                        style={{
                            color: "var(--text-muted)",
                            fontSize: "13px",
                            textAlign: "center",
                            padding: "20px 0",
                        }}
                    >
                        音声ファイルがありません
                    </p>
                ) : (
                    audioFiles.map((file) => (
                        <div
                            key={file.id}
                            className={`audio-item ${selectedAudioId === file.id ? "selected" : ""
                                }`}
                            onClick={() => onSelectAudio(file.id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                background: selectedAudioId === file.id ? "rgba(99, 102, 241, 0.1)" : "transparent",
                                border: `1px solid ${selectedAudioId === file.id ? "var(--accent-primary)" : "transparent"}`
                            }}
                        >
                            <span style={{ fontSize: "16px" }}>🎵</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p
                                    style={{
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        color: selectedAudioId === file.id ? "var(--accent-primary)" : "var(--text-primary)"
                                    }}
                                >
                                    {file.name}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 音声プレイヤー */}
            {selectedAudioId && audioUrl && (
                <div style={{
                    marginTop: "auto",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                }}>
                    <p style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                    }}>
                        再生中: {selectedFile?.name || "音声ファイル"}
                    </p>
                    <audio
                        controls
                        src={audioUrl}
                        style={{ width: "100%", height: "36px", outline: "none" }}
                    />
                </div>
            )}
        </div>
    );
}
