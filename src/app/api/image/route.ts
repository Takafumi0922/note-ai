import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return new NextResponse("認証されていません", { status: 401 });
        }

        const url = new URL(request.url);
        const fileId = url.searchParams.get("id");

        if (!fileId) {
            return new NextResponse("ファイルIDがありません", { status: 400 });
        }

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: session.accessToken });
        const drive = google.drive({ version: "v3", auth });

        const response = await drive.files.get(
            { fileId, alt: "media" },
            { responseType: "stream" }
        );

        // MIMEタイプをレスポンスヘッダから取得、または推論
        const contentType = response.headers["content-type"] || "image/jpeg";

        return new NextResponse(response.data as unknown as ReadableStream, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        console.error("画像取得エラー:", error);
        return new NextResponse("画像の取得に失敗しました", { status: 500 });
    }
}
