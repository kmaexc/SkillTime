"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Users, Trophy, BookOpen, Clock, Heart, MessageCircle, PenSquare } from "lucide-react";
import { usePosts } from "@/lib/usePosts";

const CATEGORY_MAP: Record<string, { title: string, icon: any, color: string, description: string }> = {
  free: { title: "자유게시판", icon: MessageSquare, color: "text-orange-500", description: "캠퍼스 생활의 자유로운 이야기" },
  skill: { title: "스킬교환", icon: Users, color: "text-blue-500", description: "내가 가진 기술과 필요한 기술 교환" },
  contest: { title: "공모전", icon: Trophy, color: "text-green-500", description: "함께 나갈 공모전/해커톤 팀원 모집" },
  study: { title: "스터디", icon: BookOpen, color: "text-purple-500", description: "함께 성장할 스터디원 모집" },
};

export default function BoardPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = use(params);
  const [mounted, setMounted] = useState(false);
  const { posts, loading } = usePosts(category);

  useEffect(() => {
    setMounted(true);
  }, []);

  const boardInfo = CATEGORY_MAP[category] || { title: "게시판", icon: MessageSquare, color: "text-brand", description: "" };
  const Icon = boardInfo.icon;

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background relative">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-foreground/80 hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${boardInfo.color}`} />
            <h1 className="text-lg font-bold">{boardInfo.title}</h1>
          </div>
        </div>
      </header>

      {/* Description */}
      <div className="px-4 py-4 bg-muted/30 border-b border-border/40">
        <p className="text-sm text-muted-foreground">{boardInfo.description}</p>
      </div>

      {/* Board List */}
      <div className="flex-1 flex flex-col pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
            <p>데이터를 불러오는 중입니다...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Icon className="w-12 h-12 mb-4 opacity-20" />
            <p>아직 작성된 글이 없습니다.</p>
            <p className="text-sm">첫 번째 글을 작성해 보세요!</p>
          </div>
        ) : (
          posts.map((post) => (
            <Link href={`/board/${category}/${post.id}`} key={post.id} className="flex flex-col gap-2 p-4 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors block">
              <h2 className="text-base font-medium leading-tight">{post.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">{post.preview}</p>
              
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{post.author}</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{post.time}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-brand-light">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="font-medium">{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-500">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="font-medium">{post.comments}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* FAB: Floating Action Button for writing a post */}
      <Link href={`/board/${category}/write`} className="fixed bottom-6 right-4 sm:right-[max(1rem,calc(50vw-20rem))] w-14 h-14 bg-brand hover:bg-brand-light text-white rounded-full flex items-center justify-center shadow-lg shadow-brand/20 transition-transform hover:scale-105 z-50">
        <PenSquare className="w-6 h-6" />
      </Link>
    </div>
  );
}
