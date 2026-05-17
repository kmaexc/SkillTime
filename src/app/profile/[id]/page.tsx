"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { motion } from "framer-motion";

import { supabase } from "@/lib/supabase/client";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    const fetchProfile = async () => {
      setLoading(true);
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", id).single();
      const { data: reviewsData } = await supabase.from("reviews").select("*").eq("reviewee_id", id);
      
      if (profileData) {
        // Calculate average rating
        const totalRating = reviewsData ? reviewsData.reduce((acc, curr) => acc + curr.rating, 0) : 0;
        const avgRating = reviewsData && reviewsData.length > 0 ? (totalRating / reviewsData.length).toFixed(1) : "0.0";
        const reviewCount = reviewsData ? reviewsData.length : 0;

        // Aggregate tags
        const tagCounts: Record<string, number> = {};
        if (reviewsData) {
          reviewsData.forEach(r => {
            if (r.tags && Array.isArray(r.tags)) {
              r.tags.forEach((tag: string) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              });
            }
          });
        }
        const aggregatedTags = Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count);

        setUser({
          ...profileData,
          seed: profileData.id, // Generate avatar based on ID
          skills: profileData.skills || [],
          avgRating,
          reviewCount,
          reviews: aggregatedTags
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [id]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground">프로필을 불러오는 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <p className="text-muted-foreground">프로필을 찾을 수 없습니다.</p>
        <button onClick={() => window.history.back()} className="mt-4 px-4 py-2 bg-muted rounded-xl text-sm">뒤로 가기</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center h-14 px-4 bg-background/80 backdrop-blur-md border-b border-border/40">
        <Link href="/" className="mr-4 text-foreground/80 hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">프로필</h1>
      </header>

      <div className="flex-1 px-4 py-6 flex flex-col gap-8">
        {/* Profile Basic Info */}
        <section className="flex flex-col items-center text-center gap-3">
          <div className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-brand to-brand-light">
            <div className="w-full h-full rounded-full border-4 border-background overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getAvatarUrl(user.seed)} alt={user.name} className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              {user.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{user.major || '전공 미입력'}</p>
            
            {/* Rating Display */}
            {user.reviewCount > 0 && (
              <div className="flex items-center justify-center gap-1.5 mt-3 bg-brand/5 border border-brand/20 px-3 py-1.5 rounded-full inline-flex">
                <span className="text-lg">⭐</span>
                <span className="font-bold text-brand">{user.avgRating}</span>
                <span className="text-xs text-muted-foreground ml-1">({user.reviewCount}개의 평가)</span>
              </div>
            )}
          </div>
        </section>

        {/* AI Summary */}
        {user.summary && (
          <section>
            <div className="bg-brand/5 dark:bg-brand/10 border border-brand/20 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <Sparkles className="w-16 h-16 text-brand" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-2 text-brand font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">AI가 요약한 강점</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  "{user.summary}"
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Skill Progress */}
        <section>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            보유 스킬 <span className="text-brand text-sm">{user.skills.length}</span>
          </h3>
          <div className="flex flex-col gap-4">
            {user.skills.map((skill: any, index: number) => (
              <div key={index} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold">{skill.name}</span>
                  <span className="text-xs font-medium text-brand">{skill.label}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${skill.level}%` }}
                    transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                    className="h-full bg-brand rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">가장 많이 받은 평가</h3>
            {user.reviews.length > 0 && (
              <button className="text-xs text-muted-foreground flex items-center">
                전체보기 <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>
          {user.reviews.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.reviews.map((review: any, index: number) => (
                <div key={index} className="flex items-center gap-1.5 bg-muted/50 border border-border/50 px-3 py-1.5 rounded-full text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="font-medium text-foreground/80">{review.tag}</span>
                  <span className="text-xs text-brand font-bold ml-1">{review.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-muted/30 py-6 text-center rounded-xl border border-border/50">
              아직 받은 평가 태그가 없습니다.
            </div>
          )}
        </section>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
        <div className="container mx-auto max-w-2xl">
          <Link href={`/chat/${user.id}`}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-light text-white h-14 rounded-2xl font-bold text-lg shadow-lg shadow-brand/20 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              대화하기
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  );
}
