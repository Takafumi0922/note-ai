import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import { Readable } from "stream";

// 画像アップロードAPI
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
        }

        // テンポラリのフォルダIDをアプリ全体の設定から取得する等の処理が必要ですが、
        // 今回は単純にルートまたは専用フォルダへアップロードします。
        // ここでは汎用的に "root" を指定していますが、適宜変更してください。
        const parentFolderId = "root";

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: session.accessToken });
        const drive = google.drive({ version: "v3", auth });

        // BlobをStreamに変換
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        // Driveへアップロード
        const response = await drive.files.create({
            requestBody: {
                name: `upload_${Date.now()}_${file.name}`,
                parents: [parentFolderId],
            },
            media: {
                mimeType: file.type,
                body: stream,
            },
            fields: "id, webViewLink, webContentLink",
        });

        const fileId = response.data.id;

        // 【重要】表示用にファイルの権限を「リンクを知っている全員が閲覧可」にする必要があります
        if (fileId) {
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                }
            });
        }

        // Markdownにはプレビュー用のURL (例: drive.google.com/uc?id=...) を返す
        const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

        return NextResponse.json({
            success: true,
            id: fileId,
            url: directUrl
        });

    } catch (error) {
        console.error("画像アップロードエラー:", error);
        return NextResponse.json(
            { error: "アップロードに失敗しました" },
            { status: 500 }
        );
    }
}
