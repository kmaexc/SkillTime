"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Heart, MessageCircle, MoreVertical, Share2, Star } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { usePosts, Post } from "@/lib/usePosts";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function PostDetailPage({ params }: { params: Promise<{ category: string, id: string }> }) {
  const { category, id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { deletePost } = usePosts();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorSkills, setAuthorSkills] = useState<any[]>([]);
  const [authorRating, setAuthorRating] = useState<string | null>(null);
  const [authorReviewCount, setAuthorReviewCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    let channel: any = null;

    const fetchPost = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();
      
      if (!isMounted) return;

      if (!error && data) {
        setPost({
          ...data,
          time: data.created_at ? new Date(data.created_at).toLocaleString() : "방금 전",
        });
        
        if (data.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("skills")
            .eq("id", data.user_id)
            .single();
            
          if (!isMounted) return;

          if (profile && profile.skills) {
            setAuthorSkills(profile.skills);
          }
          
          // 작성자 평점 가져오기 및 실시간 연동
          const fetchRating = async () => {
            const { data: reviewsData } = await supabase
              .from("reviews")
              .select("rating")
              .eq("reviewee_id", data.user_id);
              
            if (!isMounted) return;

            if (reviewsData && reviewsData.length > 0) {
              const total = reviewsData.reduce((acc: number, curr: any) => acc + curr.rating, 0);
              setAuthorRating((total / reviewsData.length).toFixed(1));
              setAuthorReviewCount(reviewsData.length);
            } else {
              setAuthorRating("0.0");
              setAuthorReviewCount(0);
            }
          };

          await fetchRating();

          if (!isMounted) return;

          const channelName = `board_author_reviews_${data.user_id}`;
          const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
          if (existingChannel) {
            await supabase.removeChannel(existingChannel);
          }

          if (!isMounted) return;

          channel = supabase
            .channel(channelName)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "reviews" },
              (payload: any) => {
                if (payload.new && payload.new.reviewee_id === data.user_id) {
                  fetchRating();
                }
              }
            )
            .subscribe();
        }
      }
      if (isMounted) setLoading(false);
    };
    
    fetchPost();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background relative">
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 bg-background/95 backdrop-blur-md border-b border-border/40">
          <Link href={`/board/${category}`} className="text-foreground/80 hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </header>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground flex-1">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
          <p>데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background relative">
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 bg-background/95 backdrop-blur-md border-b border-border/40">
          <Link href={`/board/${category}`} className="text-foreground/80 hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </header>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground flex-1">
          <p>게시글을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  // 글 작성자의 임의 스킬 데이터 부분은 삭제하고 state를 사용합니다.

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background relative pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3">
          <Link href={`/board/${category}`} className="text-foreground/80 hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-medium text-sm text-muted-foreground">
            {category === "free" ? "자유게시판" : category === "skill" ? "스킬교환" : category === "contest" ? "공모전" : "스터디"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {user?.id === post.user_id && (
            <div className="flex items-center gap-1 mr-1">
              <button 
                onClick={() => router.push(`/board/${category}/${post.id}/edit`)} 
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
              >
                수정
              </button>
              <button 
                onClick={async () => {
                  if (confirm("정말로 삭제하시겠습니까?")) {
                    const success = await deletePost(post.id);
                    if (success) {
                      router.push(`/board/${category}`);
                    } else {
                      alert("삭제에 실패했습니다.");
                    }
                  }
                }} 
                className="text-xs text-red-500/80 hover:text-red-500 px-2 py-1 rounded"
              >
                삭제
              </button>
            </div>
          )}
          <button className="p-2 text-foreground/80 hover:text-foreground">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 flex flex-col gap-4">
        {/* Author Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
            {post.author[0]}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{post.author}</span>
              {authorRating !== null && !post.is_anonymous && (
                <span className="text-[10px] text-brand border border-brand/20 bg-brand/5 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <span>⭐</span> {authorRating} <span className="text-muted-foreground ml-0.5">({authorReviewCount})</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{post.time}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Title and Body */}
        <h1 className="text-xl font-bold mt-2 leading-snug">{post.title}</h1>
        <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90 mt-2">
          {post.content}
        </div>

        {/* Action Buttons (Like/Comment/Share) */}
        <div className="flex items-center gap-4 py-4 border-b border-border/40 text-muted-foreground">
          <button className="flex items-center gap-1.5 hover:text-brand transition-colors">
            <Heart className="w-5 h-5" />
            <span className="text-sm font-medium">{post.likes}</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{post.comments}</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-foreground transition-colors ml-auto">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Skill Exchange Special UI */}
        {category === "skill" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-brand/5 to-brand/10 border border-brand/20 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-brand fill-brand/20" />
              <h3 className="font-bold text-foreground">작성자의 보유 기술</h3>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {authorSkills.length > 0 ? authorSkills.map((skill, index) => (
                <span key={`${skill.name || 'skill'}-${index}`} className="px-3 py-1.5 bg-background rounded-full text-sm font-medium text-brand border border-brand/20 shadow-sm">
                  {typeof skill === 'string' ? skill : (skill.name || skill.label)}
                </span>
              )) : (
                <span className="text-sm text-muted-foreground px-1">등록된 기술이 없습니다.</span>
              )}
            </div>

            {post?.user_id !== user?.id ? (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => post?.user_id ? router.push(`/chat/${post.user_id}?postId=${post.id}&anonymous=${post.is_anonymous ? 'true' : 'false'}`) : alert("작성자 정보가 없습니다.")}
                  className="w-full py-3.5 rounded-xl bg-brand hover:bg-brand-light text-white font-bold transition-all active:scale-[0.98] shadow-md shadow-brand/20 flex items-center justify-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
                  스킬 교환 제안하기
                </button>
                
                <button 
                  onClick={() => post?.user_id ? router.push(`/chat/${post.user_id}?postId=${post.id}&anonymous=${post.is_anonymous ? 'true' : 'false'}`) : alert("작성자 정보가 없습니다.")}
                  className="w-full py-3.5 rounded-xl bg-background border border-brand/30 hover:border-brand hover:bg-brand/5 text-brand font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  도움 주고 포인트 받기 (100 P)
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button disabled className="w-full py-3.5 rounded-xl bg-muted text-muted-foreground font-bold cursor-not-allowed">
                  본인이 작성한 게시물입니다
                </button>
              </div>
            )}
            
            {post?.user_id !== user?.id && (
              <p className="text-xs text-center text-muted-foreground mt-3">
                교환 또는 도움 제안 시 상대방에게 채팅 알림이 전송됩니다.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
