import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { google } from "googleapis";

// フォルダ名を取得するAPI
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const folderId = searchParams.get("id");

        if (!folderId) {
            return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
        }

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: session.accessToken });
        const drive = google.drive({ version: "v3", auth });

        const file = await drive.files.get({
            fileId: folderId,
            fields: "name",
        });

        return NextResponse.json({ name: file.data.name });
    } catch (error) {
        console.error("フォルダ名取得エラー:", error);
        return NextResponse.json(
            { error: "フォルダ名の取得に失敗しました" },
            { status: 500 }
        );
    }
}
