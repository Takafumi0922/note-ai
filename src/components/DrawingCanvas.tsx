"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";

interface DrawingCanvasProps {
    onCanvasRef: (ref: SignatureCanvas | null) => void;
}

export default function DrawingCanvas({ onCanvasRef }: DrawingCanvasProps) {
    const canvasRef = useRef<SignatureCanvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [penColor, setPenColor] = useState("#ffffff");
    const [penSize, setPenSize] = useState(2);
    const [isEraser, setIsEraser] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 100, height: 100 });

    // カラーパレット
    const colors = [
        "#ffffff",
        "#ef4444",
        "#f59e0b",
        "#10b981",
        "#3b82f6",
        "#8b5cf6",
        "#ec4899",
    ];

    // キャンバスサイズのリサイズ対応
    const updateCanvasSize = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCanvasSize({
                width: rect.width,
                height: rect.height,
            });
        }
    }, []);

    useEffect(() => {
        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);
        return () => window.removeEventListener("resize", updateCanvasSize);
    }, [updateCanvasSize]);

    // キャンバス参照を親に渡す
    useEffect(() => {
        onCanvasRef(canvasRef.current);
    }, [onCanvasRef]);

    // 消しゴムモード切替
    const toggleEraser = () => {
        setIsEraser(!isEraser);
    };

    // クリア
    const handleClear = () => {
        if (canvasRef.current) {
            canvasRef.current.clear();
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
                    gap: "8px",
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--border-color)",
                    flexWrap: "wrap",
                }}
            >
                {/* ペンサイズ */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        太さ:
                    </span>
                    {[1, 2, 4, 8].map((size) => (
                        <button
                            key={size}
                            className={`btn-icon ${penSize === size && !isEraser ? "active" : ""}`}
                            onClick={() => {
                                setPenSize(size);
                                setIsEraser(false);
                            }}
                            style={{ width: "32px", height: "32px" }}
                        >
                            <span
                                style={{
                                    width: size + 4 + "px",
                                    height: size + 4 + "px",
                                    borderRadius: "50%",
                                    background: penColor,
                                    display: "block",
                                }}
                            />
                        </button>
                    ))}
                </div>

                {/* 区切り */}
                <div
                    style={{
                        width: "1px",
                        height: "24px",
                        background: "var(--border-color)",
                    }}
                />

                {/* カラーパレット */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {colors.map((color) => (
                        <button
                            key={color}
                            onClick={() => {
                                setPenColor(color);
                                setIsEraser(false);
                            }}
                            style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                background: color,
                                border:
                                    penColor === color && !isEraser
                                        ? "2px solid var(--accent-primary)"
                                        : "2px solid var(--border-color)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                boxShadow:
                                    penColor === color && !isEraser
                                        ? "0 0 10px rgba(99,102,241,0.4)"
                                        : "none",
                            }}
                        />
                    ))}
                </div>

                {/* 区切り */}
                <div
                    style={{
                        width: "1px",
                        height: "24px",
                        background: "var(--border-color)",
                    }}
                />

                {/* 消しゴム */}
                <button
                    className={`btn-icon ${isEraser ? "active" : ""}`}
                    onClick={toggleEraser}
                    title="消しゴム"
                    style={{ width: "36px", height: "36px", fontSize: "16px" }}
                >
                    🧹
                </button>

                {/* クリア */}
                <button
                    className="btn-icon"
                    onClick={handleClear}
                    title="全消去"
                    style={{ width: "36px", height: "36px", fontSize: "16px" }}
                >
                    🗑️
                </button>
            </div>

            {/* キャンバス */}
            <div
                ref={containerRef}
                className="drawing-canvas"
                style={{
                    flex: 1,
                    background: "#1a1f35",
                    cursor: isEraser ? "cell" : "crosshair",
                    overflow: "hidden",
                }}
            >
                <SignatureCanvas
                    ref={canvasRef}
                    penColor={isEraser ? "#1a1f35" : penColor}
                    minWidth={isEraser ? penSize * 4 : penSize}
                    maxWidth={isEraser ? penSize * 6 : penSize + 1}
                    canvasProps={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        style: {
                            touchAction: "none",
                        },
                    }}
                />
            </div>
        </div>
    );
}
