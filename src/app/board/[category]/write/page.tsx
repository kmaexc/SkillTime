"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePosts } from "@/lib/usePosts";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase/client";

const CATEGORY_MAP: Record<string, string> = {
  free: "자유게시판",
  skill: "스킬교환",
  contest: "공모전",
  study: "스터디",
};

export default function WritePage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const router = useRouter();
  const { addPost } = usePosts();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const categoryName = CATEGORY_MAP[category] || "게시판";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (!user) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }

    setIsSubmitting(true);
    
    let authorName = "익명";
    if (!isAnonymous) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
        
      if (profile && profile.name) {
        authorName = profile.name;
      }
    }
    
    // 데이터베이스에 저장
    await addPost({
      category,
      title: title.trim(),
      preview: content.trim().substring(0, 50) + (content.length > 50 ? "..." : ""),
      content: content.trim(),
      author: authorName,
      user_id: user.id,
      is_anonymous: category === "skill" ? false : isAnonymous
    });

    setIsSubmitting(false);
    router.push(`/board/${category}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur-md border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/board/${category}`} className="text-foreground/80 hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">글쓰기</h1>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || isSubmitting}
          className="bg-brand text-white text-xs font-bold px-4 py-1.5 rounded-full disabled:opacity-50 transition-opacity hover:bg-brand-light"
        >
          {isSubmitting ? "등록 중..." : "등록"}
        </button>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 gap-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded">
            {categoryName}
          </span>
          {category !== "skill" ? (
            <label className="flex items-center gap-1.5 ml-auto text-sm text-muted-foreground cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-border text-brand focus:ring-brand accent-brand"
              />
              익명으로 작성하기
            </label>
          ) : (
            <span className="ml-auto text-xs text-muted-foreground/60">
              스킬교환 게시판은 익명 작성이 불가합니다
            </span>
          )}
        </div>
        
        <input 
          type="text" 
          placeholder="제목을 입력하세요." 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50"
        />
        
        <div className="h-[1px] w-full bg-border/50" />
        
        <textarea 
          placeholder="내용을 입력하세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-base leading-relaxed placeholder:text-muted-foreground/50"
        />
      </form>
    </div>
  );
}
