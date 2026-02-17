import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { downloadFile } from "@/lib/drive";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel Serverless Function のタイムアウト設定 (秒)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        // 認証チェック
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }

        const body = await request.json();
        const { type } = body;

        // Gemini API 準備
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let result;

        if (type === "pdf") {
            // ドキュメントテキスト要約（カスタム指示対応）
            const { text, customPrompt } = body;
            if (!text) {
                return NextResponse.json({ error: "テキストが必要です" }, { status: 400 });
            }

            // カスタム指示がある場合は追加
            const baseInstruction = "以下の文書テキストを詳細に要約してください。重要なポイントを箇条書きで出力すること。日本語で回答してください。";
            const instruction = customPrompt
                ? `${baseInstruction}\n\nまた、以下の追加指示にも対応してください:\n${customPrompt}`
                : baseInstruction;

            result = await model.generateContent([
                {
                    text: `${instruction}\n\n---\n${text}`,
                },
            ]);
        } else {
            // 音声ファイル要約（従来の処理）
            const { fileId } = body;
            if (!fileId) {
                return NextResponse.json({ error: "ファイルIDが必要です" }, { status: 400 });
            }

            // Google Drive から音声ファイルをダウンロード
            const audioBuffer = await downloadFile(session.accessToken, fileId);
            const base64Audio = audioBuffer.toString("base64");

            result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: "audio/webm",
                        data: base64Audio,
                    },
                },
                {
                    text: "以下の音声を詳細に要約してください。重要なポイントを箇条書きで出力すること。日本語で回答してください。",
                },
            ]);
        }

        const response = await result.response;
        const summaryText = response.text();

        return NextResponse.json({ summary: summaryText });
    } catch (error) {
        console.error("要約エラー:", error);
        return NextResponse.json(
            { error: "要約処理中にエラーが発生しました" },
            { status: 500 }
        );
    }
}
