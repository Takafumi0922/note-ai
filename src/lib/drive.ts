import { google, drive_v3 } from "googleapis";

// Google Drive API クライアントを作成
function getDriveClient(accessToken: string): drive_v3.Drive {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: "v3", auth });
}

// ルートフォルダ名
const ROOT_FOLDER_NAME = "ノート管理";

/**
 * 「ノート管理」ルートフォルダを取得または作成
 */
export async function getOrCreateRootFolder(
    accessToken: string
): Promise<string> {
    const drive = getDriveClient(accessToken);

    // 既存フォルダの検索
    const res = await drive.files.list({
        q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
    }

    // フォルダを新規作成
    const folder = await drive.files.create({
        requestBody: {
            name: ROOT_FOLDER_NAME,
            mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
    });

    return folder.data.id!;
}

/**
 * ノートフォルダを作成
 */
export async function createNoteFolder(
    accessToken: string,
    title: string
): Promise<string> {
    const drive = getDriveClient(accessToken);
    const rootFolderId = await getOrCreateRootFolder(accessToken);

    const folder = await drive.files.create({
        requestBody: {
            name: title,
            mimeType: "application/vnd.google-apps.folder",
            parents: [rootFolderId],
        },
        fields: "id",
    });

    return folder.data.id!;
}

/**
 * ノートフォルダ一覧を取得
 */
export async function listNoteFolders(
    accessToken: string
): Promise<drive_v3.Schema$File[]> {
    const drive = getDriveClient(accessToken);
    const rootFolderId = await getOrCreateRootFolder(accessToken);

    const res = await drive.files.list({
        q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name, createdTime, modifiedTime)",
        orderBy: "createdTime desc",
        spaces: "drive",
    });

    return res.data.files || [];
}

/**
 * 指定フォルダ内の音声ファイル一覧を取得
 */
export async function listAudioFiles(
    accessToken: string,
    folderId: string
): Promise<drive_v3.Schema$File[]> {
    const drive = getDriveClient(accessToken);

    const res = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'audio/') and trashed=false`,
        fields: "files(id, name, createdTime, mimeType)",
        orderBy: "createdTime desc",
        spaces: "drive",
    });

    return res.data.files || [];
}

/**
 * 指定フォルダ内のPDFファイル一覧を取得
 */
export async function listPdfFiles(
    accessToken: string,
    folderId: string
): Promise<drive_v3.Schema$File[]> {
    const drive = getDriveClient(accessToken);

    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
        fields: "files(id, name, createdTime, mimeType)",
        orderBy: "createdTime desc",
        spaces: "drive",
    });

    return res.data.files || [];
}

/**
 * ファイルをアップロード
 */
export async function uploadFile(
    accessToken: string,
    folderId: string,
    name: string,
    mimeType: string,
    data: Buffer | string
): Promise<string> {
    const drive = getDriveClient(accessToken);

    // 既存ファイルを検索して上書き対応
    const existing = await drive.files.list({
        q: `'${folderId}' in parents and name='${name}' and trashed=false`,
        fields: "files(id)",
        spaces: "drive",
    });

    const body =
        typeof data === "string" ? Buffer.from(data, "utf-8") : data;
    const { Readable } = await import("stream");
    const stream = Readable.from(body);

    if (existing.data.files && existing.data.files.length > 0) {
        // 既存ファイルを更新
        const fileId = existing.data.files[0].id!;
        await drive.files.update({
            fileId,
            media: {
                mimeType,
                body: stream,
            },
        });
        return fileId;
    }

    // 新規ファイル作成
    const file = await drive.files.create({
        requestBody: {
            name,
            parents: [folderId],
        },
        media: {
            mimeType,
            body: stream,
        },
        fields: "id",
    });

    return file.data.id!;
}

/**
 * ファイルの内容をダウンロード（バイナリ）
 */
export async function downloadFile(
    accessToken: string,
    fileId: string
): Promise<Buffer> {
    const drive = getDriveClient(accessToken);

    const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
    );

    return Buffer.from(res.data as ArrayBuffer);
}

/**
 * テキストファイルの内容を取得
 */
export async function getFileContent(
    accessToken: string,
    fileId: string
): Promise<string> {
    const buffer = await downloadFile(accessToken, fileId);
    return buffer.toString("utf-8");
}

/**
 * フォルダ内の特定ファイルを名前で検索
 */
export async function findFileInFolder(
    accessToken: string,
    folderId: string,
    fileName: string
): Promise<string | null> {
    const drive = getDriveClient(accessToken);

    const res = await drive.files.list({
        q: `'${folderId}' in parents and name='${fileName}' and trashed=false`,
        fields: "files(id)",
        spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
    }
    return null;
}

/**
 * フォルダをゴミ箱に移動（削除）
 */
export async function deleteFolder(
    accessToken: string,
    folderId: string
): Promise<void> {
    const drive = getDriveClient(accessToken);
    await drive.files.update({
        fileId: folderId,
        requestBody: { trashed: true },
    });
}
