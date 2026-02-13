"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getNotes, createNote, deleteNote } from "@/app/actions";
import LoginScreen from "@/components/LoginScreen";

// ノートの型
interface NoteItem {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ノート一覧を読み込み
  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getNotes();
      setNotes(data);
    } catch (error) {
      console.error("ノート読み込みエラー:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      loadNotes();
    }
  }, [session, loadNotes]);

  // ノート作成
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const note = await createNote(newTitle.trim());
      setShowModal(false);
      setNewTitle("");
      router.push(`/note/${note.id}`);
    } catch (error) {
      console.error("ノート作成エラー:", error);
      alert("ノートの作成に失敗しました。");
    } finally {
      setIsCreating(false);
    }
  };

  // ノート削除
  const handleDelete = async (e: React.MouseEvent, noteId: string, noteName: string) => {
    e.stopPropagation();
    if (!confirm(`「${noteName}」を削除しますか？\nこの操作は元に戻せません。`)) return;

    setDeletingId(noteId);
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました。");
    } finally {
      setDeletingId(null);
    }
  };

  // 検索フィルタリング
  const filteredNotes = searchQuery
    ? notes.filter((n) => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes;

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ログイン待ち
  if (status === "loading") {
    return (
      <div
        className="login-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="spinner" style={{ width: "40px", height: "40px" }} />
      </div>
    );
  }

  // 未ログイン
  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        overflow: "auto",
        background: "var(--bg-primary)",
        backgroundImage:
          "radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 50%)",
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>📋</span>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              background: "var(--accent-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ノート管理AI
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {session.user?.email}
          </span>
          <button className="btn-secondary" onClick={() => signOut()} style={{ fontSize: "13px", padding: "8px 16px" }}>
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* アクションバー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            📚 ノート一覧
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* 検索バー */}
            <div style={{ position: "relative" }}>
              <input
                className="input-field"
                type="text"
                placeholder="🔍 ノートを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "240px",
                  padding: "8px 12px 8px 12px",
                  fontSize: "13px",
                }}
              />
            </div>

            <button
              className="btn-primary"
              onClick={() => setShowModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              ➕ 新規ノート作成
            </button>
          </div>
        </div>

        {/* ノート一覧 */}
        {isLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "120px", borderRadius: "16px" }}
              />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div
            className="glass-card fade-in"
            style={{
              padding: "60px 24px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>
              {searchQuery ? "🔍" : "📝"}
            </span>
            <p
              style={{
                fontSize: "16px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              {searchQuery
                ? `「${searchQuery}」に一致するノートがありません`
                : "ノートがまだありません"}
            </p>
            {!searchQuery && (
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                「新規ノート作成」ボタンから始めましょう
              </p>
            )}
          </div>
        ) : (
          <div
            className="fade-in"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="note-card"
                onClick={() => router.push(`/note/${note.id}`)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, overflow: "hidden" }}>
                    <span style={{ fontSize: "24px" }}>📄</span>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {note.name}
                    </h3>
                  </div>

                  {/* 削除ボタン */}
                  <button
                    className="btn-icon"
                    onClick={(e) => handleDelete(e, note.id, note.name)}
                    title="ノートを削除"
                    style={{
                      width: "32px",
                      height: "32px",
                      fontSize: "14px",
                      flexShrink: 0,
                      opacity: deletingId === note.id ? 0.5 : 0.6,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                    disabled={deletingId === note.id}
                  >
                    {deletingId === note.id ? (
                      <span className="spinner" style={{ width: "14px", height: "14px" }} />
                    ) : (
                      "🗑️"
                    )}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>作成: {formatDate(note.createdTime)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 新規作成モーダル */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "20px",
                background: "var(--accent-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              📝 新規ノート作成
            </h3>

            <input
              className="input-field"
              type="text"
              placeholder="ノートのタイトルを入力..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim()) handleCreate();
              }}
              autoFocus
              style={{ marginBottom: "20px" }}
            />

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowModal(false);
                  setNewTitle("");
                }}
              >
                キャンセル
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!newTitle.trim() || isCreating}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {isCreating ? (
                  <>
                    <span className="spinner" /> 作成中...
                  </>
                ) : (
                  "作成"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
