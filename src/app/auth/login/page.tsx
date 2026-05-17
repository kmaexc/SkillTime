"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "이메일이나 비밀번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      <header className="flex items-center h-14 px-4">
        <button onClick={() => router.back()} className="text-foreground/80 hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold">로그인</h1>
            <p className="text-sm text-muted-foreground">다시 오신 것을 환영합니다!</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">비밀번호</label>
                <button type="button" className="text-xs text-brand hover:underline">
                  비밀번호를 잊으셨나요?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
                placeholder="비밀번호"
                required
              />
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-brand text-white rounded-xl font-bold flex items-center justify-center hover:bg-brand-light transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "로그인"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            아직 계정이 없으신가요?{" "}
            <Link href="/auth/signup" className="text-brand font-medium hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
