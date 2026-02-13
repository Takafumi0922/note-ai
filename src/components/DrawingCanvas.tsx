"use client";

import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";

// 外部から呼び出せるメソッド
export interface DrawingCanvasHandle {
    toDataURL: () => string;
    loadImage: (src: string) => void;
    isEmpty: () => boolean;
    clear: () => void;
}

interface Point {
    x: number;
    y: number;
    pressure: number;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle>(function DrawingCanvas(_, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [penColor, setPenColor] = useState("#1e293b");
    const [penSize, setPenSize] = useState(2);
    const [isEraser, setIsEraser] = useState(false);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<Point | null>(null);
    const prevPointRef = useRef<Point | null>(null);
    const hasContentRef = useRef(false);
    const undoStackRef = useRef<ImageData[]>([]);
    const bgColor = "#ffffff";

    // カラーパレット
    const colors = [
        "#1e293b",
        "#ef4444",
        "#f59e0b",
        "#10b981",
        "#3b82f6",
        "#8b5cf6",
        "#ec4899",
    ];

    // キャンバスの背景を塗る
    const fillBackground = useCallback((ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }, []);

    // キャンバスサイズの更新
    const updateCanvasSize = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width;
        const height = rect.height;

        // 既存の描画を保存
        let imageData: ImageData | null = null;
        const ctx = canvas.getContext("2d");
        if (ctx && canvas.width > 0 && canvas.height > 0) {
            try {
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch {
                // 初回はエラーになることがある
            }
        }

        // サイズを設定（高解像度ディスプレイ対応）
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        if (ctx) {
            ctx.scale(dpr, dpr);
            fillBackground(ctx);
            // 既存の描画を復元
            if (imageData) {
                ctx.putImageData(imageData, 0, 0);
            }
        }
    }, [fillBackground]);

    useEffect(() => {
        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);
        return () => window.removeEventListener("resize", updateCanvasSize);
    }, [updateCanvasSize]);

    // iOS Safari でのテキスト選択・ロングプレスメニューを防止
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // touchstart を passive: false で防止しないとiOSで選択される
        const preventTouch = (e: TouchEvent) => {
            e.preventDefault();
        };
        const preventSelect = (e: Event) => {
            e.preventDefault();
        };

        container.addEventListener("touchstart", preventTouch, { passive: false });
        container.addEventListener("touchmove", preventTouch, { passive: false });
        container.addEventListener("selectstart", preventSelect);
        container.addEventListener("contextmenu", preventSelect);

        return () => {
            container.removeEventListener("touchstart", preventTouch);
            container.removeEventListener("touchmove", preventTouch);
            container.removeEventListener("selectstart", preventSelect);
            container.removeEventListener("contextmenu", preventSelect);
        };
    }, []);

    // 外部メソッドを公開
    useImperativeHandle(ref, () => ({
        // 背景付きDataURLを返す
        toDataURL: () => {
            const canvas = canvasRef.current;
            if (!canvas) return "";
            return canvas.toDataURL("image/png");
        },
        // 画像をキャンバスにロード
        loadImage: (src: string) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const img = new Image();
            img.onload = () => {
                fillBackground(ctx);
                ctx.drawImage(img, 0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
                hasContentRef.current = true;
            };
            img.src = src;
        },
        isEmpty: () => !hasContentRef.current,
        clear: () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            fillBackground(ctx);
            hasContentRef.current = false;
        },
    }), [fillBackground]);

    // --- 描画ロジック ---
    const getPoint = (e: React.PointerEvent): Point => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            pressure: e.pressure || 0.5,
        };
    };

    const drawLine = (from: Point, to: Point, control?: Point) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const currentSize = isEraser ? penSize * 5 : penSize;

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        ctx.strokeStyle = isEraser ? bgColor : penColor;
        ctx.lineWidth = currentSize * (0.5 + to.pressure * 0.5);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (control) {
            // ベジェ曲線で滑らか描画
            ctx.moveTo(from.x, from.y);
            ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        } else {
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
        }

        ctx.stroke();
        ctx.restore();
    };

    // アンドゥ用スナップショットを保存
    const saveSnapshot = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        undoStackRef.current.push(snapshot);
        // 最大20スナップショット
        if (undoStackRef.current.length > 20) {
            undoStackRef.current.shift();
        }
    };

    // アンドゥ実行
    const handleUndo = () => {
        const canvas = canvasRef.current;
        if (!canvas || undoStackRef.current.length === 0) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const snapshot = undoStackRef.current.pop()!;
        ctx.putImageData(snapshot, 0, 0);
        if (undoStackRef.current.length === 0) {
            hasContentRef.current = false;
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.setPointerCapture(e.pointerId);

        // ストローク開始前にスナップショット保存
        saveSnapshot();

        isDrawingRef.current = true;
        hasContentRef.current = true;
        const point = getPoint(e);
        lastPointRef.current = point;
        prevPointRef.current = null;

        // 点を描画
        const ctx = canvas.getContext("2d");
        if (ctx) {
            const dpr = window.devicePixelRatio || 1;
            const currentSize = isEraser ? penSize * 5 : penSize;
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.beginPath();
            ctx.fillStyle = isEraser ? bgColor : penColor;
            ctx.arc(point.x, point.y, currentSize * 0.5 * (0.5 + point.pressure * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();

        const currentPoint = getPoint(e);
        const lastPoint = lastPointRef.current;
        const prevPoint = prevPointRef.current;

        if (lastPoint) {
            if (prevPoint) {
                // 3点のベジェ曲線で滑らかに
                const midX = (lastPoint.x + currentPoint.x) / 2;
                const midY = (lastPoint.y + currentPoint.y) / 2;
                drawLine(
                    { x: (prevPoint.x + lastPoint.x) / 2, y: (prevPoint.y + lastPoint.y) / 2, pressure: lastPoint.pressure },
                    { x: midX, y: midY, pressure: currentPoint.pressure },
                    lastPoint
                );
            } else {
                drawLine(lastPoint, currentPoint);
            }
        }

        prevPointRef.current = lastPointRef.current;
        lastPointRef.current = currentPoint;
    };

    const handlePointerUp = () => {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        prevPointRef.current = null;
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
                    onClick={() => setIsEraser(!isEraser)}
                    title="消しゴム"
                    style={{ width: "36px", height: "36px", fontSize: "16px" }}
                >
                    🧹
                </button>

                {/* クリア */}
                <button
                    className="btn-icon"
                    onClick={() => {
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;
                        fillBackground(ctx);
                        hasContentRef.current = false;
                    }}
                    title="全消去"
                    style={{ width: "36px", height: "36px", fontSize: "16px" }}
                >
                    🗑️
                </button>

                {/* アンドゥ */}
                <button
                    className="btn-icon"
                    onClick={handleUndo}
                    title="元に戻す"
                    style={{ width: "36px", height: "36px", fontSize: "16px" }}
                >
                    ↩️
                </button>
            </div>

            {/* キャンバス */}
            <div
                ref={containerRef}
                className="drawing-canvas"
                style={{
                    flex: 1,
                    background: bgColor,
                    cursor: isEraser ? "cell" : "crosshair",
                    overflow: "hidden",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{ touchAction: "none", display: "block", userSelect: "none" }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onContextMenu={(e) => e.preventDefault()}
                />
            </div>
        </div>
    );
});

export default DrawingCanvas;
