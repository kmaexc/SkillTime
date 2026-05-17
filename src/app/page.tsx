"use client";

import Link from "next/link";
import { MessageSquare, Users, Trophy, BookOpen, Heart, Clock } from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { motion } from "framer-motion";

const QUICK_MENUS = [
  { id: 1, label: "자유게시판", icon: MessageSquare, path: "/board/free", color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
  { id: 2, label: "스킬교환", icon: Users, path: "/board/skill", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  { id: 3, label: "공모전", icon: Trophy, path: "/board/contest", color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
  { id: 4, label: "스터디", icon: BookOpen, path: "/board/study", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
];

const PARTNERS = [
  { id: 1, name: "김토스", skill: "React", seed: "Felix" },
  { id: 2, name: "이배민", skill: "Java", seed: "Molly" },
  { id: 3, name: "박당근", skill: "Figma", seed: "Oreo" },
  { id: 4, name: "최쿠팡", skill: "Python", seed: "Bella" },
  { id: 5, name: "정카카오", skill: "Node.js", seed: "Buster" },
  { id: 6, name: "강라인", skill: "Swift", seed: "Charlie" },
];

const HOT_POSTS = [
  { id: 1, category: "자유", title: "프론트엔드 포트폴리오 피드백 부탁드립니다!!", time: "10분 전", likes: 24 },
  { id: 2, category: "스킬교환", title: "스프링 백엔드와 리액트 교환하실 분 (주 1회)", time: "32분 전", likes: 18 },
  { id: 3, category: "공모전", title: "이번 주말 해커톤 프론트 1명 급구합니다 🔥", time: "1시간 전", likes: 15 },
  { id: 4, category: "스터디", title: "CS 기술면접 스터디원 모집 (2/4)", time: "2시간 전", likes: 9 },
];

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8 py-6 px-4">
      {/* 퀵 메뉴 바 */}
      <section>
        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-border/50">
          {QUICK_MENUS.map((menu) => (
            <Link key={menu.id} href={menu.path} className="flex flex-col items-center gap-2 group">
              <div className={`p-3 rounded-full transition-transform group-hover:scale-110 ${menu.color}`}>
                <menu.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-foreground/80">{menu.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 스킬 교환 파트너 피드 (인스타그램 스토리 스타일) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">새로운 스킬 교환 파트너</h2>
          <Link href="#" className="text-sm text-brand font-medium hover:underline">
            더보기
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {PARTNERS.map((partner, i) => (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={partner.id} 
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <Link href={`/profile/${partner.id}`}>
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-brand to-brand-light">
                  <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getAvatarUrl(partner.seed)} alt={partner.name} className="w-full h-full object-cover" />
                  </div>
                </div>
              </Link>
              <span className="text-xs font-medium">{partner.name}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">{partner.skill}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 실시간 HOT 게시판 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">실시간 HOT</h2>
            <span className="bg-brand/10 text-brand text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</span>
          </div>
          <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
            전체보기
          </Link>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/50 overflow-hidden shadow-sm">
          {HOT_POSTS.map((post, i) => (
            <div 
              key={post.id} 
              className={`p-4 flex flex-col gap-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                i !== HOT_POSTS.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand">{post.category}</span>
                <span className="text-sm font-medium line-clamp-1 flex-1">{post.title}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{post.time}</span>
                </div>
                <div className="flex items-center gap-1 text-brand-light">
                  <Heart className="w-3 h-3 fill-current" />
                  <span className="font-medium">{post.likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 공모전 배너 */}
      <section className="pb-8">
        <h2 className="text-lg font-bold mb-3">🔥 다가오는 공모전</h2>
        <motion.div 
          whileHover={{ scale: 0.98 }}
          className="relative w-full h-32 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-5 flex flex-col justify-between text-white shadow-lg overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-bold backdrop-blur-sm">D-12</span>
              <span className="text-xs font-medium text-white/90">전국 대학생 해커톤</span>
            </div>
            <h3 className="font-bold text-lg leading-tight">2026 캠퍼스 혁신<br />아이디어톤 모집</h3>
          </div>
          <div className="flex justify-end">
            <span className="text-xs font-bold flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              자세히 보기 <span className="text-lg leading-none">→</span>
            </span>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
