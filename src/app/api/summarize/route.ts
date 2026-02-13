import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { downloadFile } from "@/lib/drive";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
    try {
        // 認証チェック
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }

        const { fileId } = await request.json();
        if (!fileId) {
            return NextResponse.json(
                { error: "ファイルIDが必要です" },
                { status: 400 }
            );
        }

        // Google Drive から音声ファイルをダウンロード
        const audioBuffer = await downloadFile(session.accessToken, fileId);
        const base64Audio = audioBuffer.toString("base64");

        // Gemini API で要約
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent([
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
