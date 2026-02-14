import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// アクセストークンをリフレッシュする関数
async function refreshAccessToken(token: Record<string, unknown>) {
    try {
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
        });

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            // 新しい有効期限を設定（秒単位 → ミリ秒単位のタイムスタンプに変換）
            expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
            // リフレッシュトークンが返ってきた場合は更新
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
    } catch (error) {
        console.error("トークンリフレッシュエラー:", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

// NextAuth.js の設定
export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    // Google Drive のファイルアクセス用スコープ
                    scope:
                        "openid email profile https://www.googleapis.com/auth/drive.file",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
    ],
    callbacks: {
        // JWT にアクセストークンとリフレッシュトークンを保持
        async jwt({ token, account }) {
            // 初回ログイン時: アカウント情報をトークンに保存
            if (account) {
                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    expiresAt: account.expires_at,
                };
            }

            // トークンがまだ有効な場合: そのまま返す（60秒の余裕を持つ）
            if (typeof token.expiresAt === "number" && Date.now() / 1000 < token.expiresAt - 60) {
                return token;
            }

            // トークンが期限切れ: リフレッシュ
            console.log("アクセストークン期限切れ、リフレッシュ中...");
            return await refreshAccessToken(token);
        },
        // セッションにアクセストークンを公開
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            // エラーがあればセッションにセット（クライアントで再ログインを促せる）
            if (token.error) {
                session.error = token.error as string;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/",
    },
};
