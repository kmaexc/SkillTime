"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";

interface Skill {
  name: string;
  level: number;
  label: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [summary, setSummary] = useState("");
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLabel, setNewSkillLabel] = useState("초급");

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        setName(data.name || "");
        setMajor(data.major || "");
        setSummary(data.summary || "");
        setSkills(data.skills || []);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, authLoading, router]);

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: newSkillName.trim() })
      });
      
      const data = await res.json();
      
      if (res.ok && data.isValid) {
        let level = 30;
        if (newSkillLabel === "중급") level = 60;
        if (newSkillLabel === "상급") level = 90;

        setSkills([...skills, { 
          name: data.standardizedName, 
          label: newSkillLabel, 
          level 
        }]);
        setNewSkillName("");
      } else {
        alert(data.error || "유효한 기술명이 아니거나 AI 분석에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      alert("기술 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveSkill = (indexToRemove: number) => {
    setSkills(skills.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        name,
        major,
        summary,
        skills,
      });

    setSaving(false);
    
    if (!error) {
      alert("프로필이 저장되었습니다.");
      // 추후 내 프로필 보기 페이지로 이동할 수 있습니다.
      router.push("/");
    } else {
      alert("프로필 저장 중 오류가 발생했습니다.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-foreground/80 hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold">프로필 편집</h1>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-8 max-w-xl mx-auto w-full mt-4">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">기본 정보</h2>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">이름 (닉네임)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              placeholder="홍길동"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">소속 / 전공</label>
            <input
              type="text"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              placeholder="컴퓨터공학과 23학번"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">한 줄 소개</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-3 rounded-lg border border-border bg-background min-h-[100px] resize-none"
              placeholder="자신을 자유롭게 소개해주세요."
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">보유 스킬</h2>
            <span className="text-sm text-brand font-medium">{skills.length}개</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
              className="flex-1 h-11 px-3 rounded-lg border border-border bg-background"
              placeholder="예: React, Figma"
            />
            <select
              value={newSkillLabel}
              onChange={(e) => setNewSkillLabel(e.target.value)}
              className="h-11 px-3 rounded-lg border border-border bg-background outline-none"
            >
              <option value="초급">초급</option>
              <option value="중급">중급</option>
              <option value="상급">상급</option>
            </select>
            <button
              onClick={handleAddSkill}
              disabled={isAnalyzing || !newSkillName.trim()}
              className="h-11 px-4 min-w-[70px] bg-brand text-white rounded-lg font-medium hover:bg-brand-light transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : "추가"}
            </button>
          </div>

          {skills.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {skills.map((skill, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-xs px-2 py-1 bg-brand/10 text-brand rounded-full">{skill.label}</span>
                  </div>
                  <button onClick={() => handleRemoveSkill(index)} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
        <div className="container mx-auto max-w-2xl flex gap-3">
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
            }} 
            className="h-14 px-6 rounded-2xl font-bold border border-border bg-background hover:bg-muted transition-colors whitespace-nowrap text-muted-foreground"
          >
            로그아웃
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-light text-white h-14 rounded-2xl font-bold text-lg shadow-lg shadow-brand/20 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
