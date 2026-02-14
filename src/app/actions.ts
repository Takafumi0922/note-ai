"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    getOrCreateRootFolder,
    createNoteFolder,
    listNoteFolders,
    listAudioFiles,
    uploadFile,
    findFileInFolder,
    getFileContent,
} from "@/lib/drive";

// セッションからアクセストークンを取得するヘルパー
async function getAccessToken(): Promise<string> {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
        throw new Error("認証されていません");
    }
    return session.accessToken;
}

/**
 * ノート一覧を取得
 */
export async function getNotes() {
    const token = await getAccessToken();
    const folders = await listNoteFolders(token);
    return folders.map((f) => ({
        id: f.id!,
        name: f.name!,
        createdTime: f.createdTime || "",
        modifiedTime: f.modifiedTime || "",
    }));
}

/**
 * 新規ノートを作成
 */
export async function createNote(title: string) {
    const token = await getAccessToken();
    const folderId = await createNoteFolder(token, title);
    return { id: folderId, name: title };
}

/**
 * ノートデータを読み込み
 */
export async function getNoteData(folderId: string) {
    const token = await getAccessToken();

    // 各ファイルを並行で検索・取得
    const [summaryId, noteId, sketchId] = await Promise.all([
        findFileInFolder(token, folderId, "summary.txt"),
        findFileInFolder(token, folderId, "note.md"),
        findFileInFolder(token, folderId, "sketch.png"),
    ]);

    const [summaryText, noteText] = await Promise.all([
        summaryId ? getFileContent(token, summaryId) : "",
        noteId ? getFileContent(token, noteId) : "",
    ]);

    // スケッチ画像があればBase64で取得
    let sketchBase64: string | null = null;
    if (sketchId) {
        const { downloadFile } = await import("@/lib/drive");
        const buffer = await downloadFile(token, sketchId);
        sketchBase64 = `data:image/png;base64,${buffer.toString("base64")}`;
    }

    return {
        summary: summaryText,
        note: noteText,
        hasSketch: !!sketchId,
        sketchFileId: sketchId,
        sketchBase64,
    };
}

/**
 * ノートを一括保存
 */
export async function saveNote(
    folderId: string,
    data: {
        summary: string;
        note: string;
        sketchBase64?: string;
    }
) {
    const token = await getAccessToken();

    const promises: Promise<string>[] = [];

    // summary.txt を保存
    if (data.summary) {
        promises.push(
            uploadFile(token, folderId, "summary.txt", "text/plain", data.summary)
        );
    }

    // note.md を保存
    if (data.note) {
        promises.push(
            uploadFile(token, folderId, "note.md", "text/markdown", data.note)
        );
    }

    // sketch.png を保存
    if (data.sketchBase64) {
        const base64Data = data.sketchBase64.replace(
            /^data:image\/png;base64,/,
            ""
        );
        const buffer = Buffer.from(base64Data, "base64");
        promises.push(
            uploadFile(token, folderId, "sketch.png", "image/png", buffer)
        );
    }

    await Promise.all(promises);
    return { success: true };
}

/**
 * 音声ファイルをアップロード
 */
export async function uploadAudio(folderId: string, audioBase64: string, fileName: string) {
    const token = await getAccessToken();
    const buffer = Buffer.from(audioBase64, "base64");
    const fileId = await uploadFile(
        token,
        folderId,
        fileName,
        "audio/webm",
        buffer
    );
    return { fileId, fileName };
}

/**
 * 音声ファイル一覧を取得
 */
export async function getAudioFiles(folderId: string) {
    const token = await getAccessToken();
    const files = await listAudioFiles(token, folderId);
    return files.map((f) => ({
        id: f.id!,
        name: f.name!,
        createdTime: f.createdTime || "",
    }));
}

/**
 * ルートフォルダの初期化確認
 */
export async function ensureRootFolder() {
    const token = await getAccessToken();
    await getOrCreateRootFolder(token);
    return { success: true };
}

/**
 * ノートを削除（フォルダごと削除）
 */
export async function deleteNote(folderId: string) {
    const token = await getAccessToken();
    const { deleteFolder } = await import("@/lib/drive");
    await deleteFolder(token, folderId);
    return { success: true };
}

/**
 * タグ情報を読み込み
 */
export async function getNoteTags(folderId: string) {
    const token = await getAccessToken();
    const tagsFileId = await findFileInFolder(token, folderId, "tags.json");
    if (!tagsFileId) return [];
    const content = await getFileContent(token, tagsFileId);
    try {
        return JSON.parse(content) as string[];
    } catch {
        return [];
    }
}

/**
 * タグ情報を保存
 */
export async function saveNoteTags(folderId: string, tags: string[]) {
    const token = await getAccessToken();
    await uploadFile(token, folderId, "tags.json", "application/json", JSON.stringify(tags));
    return { success: true };
}

/**
 * ドキュメントファイルをアップロード（PDF, Word, テキスト）
 */
export async function uploadDocument(folderId: string, fileName: string, base64Data: string, mimeType: string) {
    const token = await getAccessToken();
    const buffer = Buffer.from(base64Data, "base64");
    await uploadFile(token, folderId, fileName, mimeType, buffer);
    return { success: true };
}

/**
 * ドキュメントファイル一覧を取得
 */
export async function getDocumentFiles(folderId: string) {
    const token = await getAccessToken();
    const { listDocumentFiles } = await import("@/lib/drive");
    const files = await listDocumentFiles(token, folderId);
    return files.map((f) => ({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType || "",
        createdTime: f.createdTime || "",
    }));
}

/**
 * ドキュメントからテキストを抽出（PDF, Word, テキスト対応）
 */
export async function extractDocumentText(fileId: string, mimeType: string) {
    const token = await getAccessToken();
    const { downloadFile } = await import("@/lib/drive");
    const buffer = await downloadFile(token, fileId);

    if (mimeType === "application/pdf") {
        // PDF: pdf-parseでテキスト抽出
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        return data.text as string;
    } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
    ) {
        // Word: mammothでテキスト抽出
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } else {
        // テキストファイル: そのまま返す
        return buffer.toString("utf-8");
    }
}
