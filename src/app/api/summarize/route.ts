import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { downloadFile } from "@/lib/drive";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }

        const body = await request.json();
        const { type } = body;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        // ストリーミング用に設定
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let streamResult;

        if (type === "pdf") {
            const { text, customPrompt } = body;
            if (!text) return NextResponse.json({ error: "テキストが必要です" }, { status: 400 });

            const baseInstruction = "以下の文書テキストを詳細に要約してください。重要なポイントを箇条書きで出力すること。日本語で回答してください。";
            const instruction = customPrompt
                ? `${baseInstruction}\n\nまた、以下の追加指示にも対応してください:\n${customPrompt}`
                : baseInstruction;

            streamResult = await model.generateContentStream([
                { text: `${instruction}\n\n---\n${text}` },
            ]);
        } else {
            const { fileId } = body;
            if (!fileId) return NextResponse.json({ error: "ファイルIDが必要です" }, { status: 400 });

            const audioBuffer = await downloadFile(session.accessToken, fileId);
            const base64Audio = audioBuffer.toString("base64");

            streamResult = await model.generateContentStream([
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

        // ReadableStreamを構築してチャンクをエンコードして送信
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of streamResult.stream) {
                        const chunkText = chunk.text();
                        controller.enqueue(encoder.encode(chunkText));
                    }
                    controller.close();
                } catch (error) {
                    console.error("ストリーミング生成エラー:", error);
                    controller.error(error);
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error) {
        console.error("要約エラー:", error);
        return NextResponse.json(
            { error: "要約処理中にエラーが発生しました" },
            { status: 500 }
        );
    }
}
