import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// authOptions は lib/auth.ts から読み込み
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
