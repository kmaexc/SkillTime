"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Supabase Auth 가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Profiles 테이블에 초기 정보 저장
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              id: authData.user.id,
              name,
              major: "",
              summary: "",
              skills: [],
            }
          ]);

        // 만약 에러가 나더라도(이미 존재 등) 무시하고 진행
        if (profileError && profileError.code !== '23505') {
          console.error("프로필 생성 실패:", profileError);
        }

        // 프로필 편집 페이지로 이동
        router.push("/profile/edit");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "회원가입 중 오류가 발생했습니다.");
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
            <h1 className="text-2xl font-bold">회원가입</h1>
            <p className="text-sm text-muted-foreground">SkillTime에서 팀원을 찾아보세요!</p>
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">이름 (닉네임)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
                placeholder="홍길동"
                required
              />
            </div>
            
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
              <label className="text-sm font-medium">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
                placeholder="6자리 이상"
                minLength={6}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-brand text-white rounded-xl font-bold flex items-center justify-center hover:bg-brand-light transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "가입하기"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/auth/login" className="text-brand font-medium hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
