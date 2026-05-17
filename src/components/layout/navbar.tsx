"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Search, MessageCircle, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase/client";
import { getAvatarUrl } from "@/lib/avatar";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ id: string, name: string, content: string, senderId: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      // 사용자가 참여한 모든 메시지 가져오기
      const { data } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          receiver_id,
          post_id,
          is_read,
          sender:profiles!sender_id(name, id),
          receiver:profiles!receiver_id(name, id),
          post:posts!post_id(id, title)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (data) {
        // 안 읽은 메시지 개수 계산
        const unread = data.filter((msg: any) => msg.receiver_id === user.id && !msg.is_read).length;
        setUnreadCount(unread);
        
        // 발신자/수신자별로 최신 메시지만 보여주기 위해 그룹화
        const uniquePartners = new Map();
        data.forEach((msg: any) => {
          const isMeSender = msg.sender_id === user.id;
          const partnerId = isMeSender ? msg.receiver_id : msg.sender_id;
          const partnerProfile = isMeSender ? msg.receiver : msg.sender;
          const postId = msg.post_id ? String(msg.post_id) : null;
          const roomId = `${partnerId}_${postId || 'general'}`;
          
          if (!uniquePartners.has(roomId)) {
            let previewText = msg.content;
            if (previewText.startsWith("[SYS:COMPLETED]")) previewText = "🤝 기술 교환이 완료되었습니다.";
            else if (previewText.startsWith("[SYS:CANCELED]")) previewText = "🚫 기술 교환이 취소되었습니다.";

            uniquePartners.set(roomId, {
              ...msg,
              content: previewText,
              partnerId,
              partnerName: partnerProfile?.name || "알 수 없음",
              postTitle: msg.post?.title || null
            });
          }
        });
        setRecentChats(Array.from(uniquePartners.values()).slice(0, 5));
      }
    };

    fetchChats();

    // 실시간 알림 구독
    const channel = supabase
      .channel("navbar_notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages"
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') return;

          // RLS에 의해 내 메시지만 수신되므로 목록 즉시 갱신 (읽음 처리 포함)
          fetchChats();
            
          // 내가 받은 '새로운(INSERT)' 메시지일 경우에만 토스트 띄우기
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as any;
            if (newMsg && newMsg.receiver_id === user.id) {
              const { data: sender } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', newMsg.sender_id)
                .single();
                
              setToastMessage({
                id: newMsg.id,
                name: sender?.name || "익명",
                content: newMsg.content,
                senderId: newMsg.sender_id
              });
              
              setTimeout(() => {
                setToastMessage(null);
              }, 4000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-2xl px-4 flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl text-brand">SkillTime</span>
          </Link>
          <div className="flex items-center space-x-4 relative">
            <button className="text-foreground/70 hover:text-foreground transition-colors">
              <Search className="w-5 h-5" />
            </button>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={toggleDropdown}
                className="text-foreground/70 hover:text-foreground transition-colors relative"
              >
                <MessageCircle className="w-5 h-5" />
                {mounted && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              
              {/* 채팅 목록 드롭다운 */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-background border border-border/50 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                    <h3 className="font-bold text-sm">최근 대화</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                        새 메시지 {unreadCount}개
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {!user ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">로그인이 필요합니다.</div>
                    ) : recentChats.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center gap-2 text-muted-foreground">
                        <MessageCircle className="w-8 h-8 opacity-20" />
                        <span className="text-sm">진행 중인 대화가 없습니다.</span>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {recentChats.map((chat) => (
                          <Link 
                            key={`${chat.partnerId}_${chat.post_id || 'general'}`} 
                            href={`/chat/${chat.partnerId}${chat.post_id ? `?postId=${chat.post_id}` : ''}`}
                            onClick={() => setIsDropdownOpen(false)}
                            className={cn(
                              "flex items-start gap-3 p-3 hover:bg-muted/50 border-b border-border/50 transition-colors",
                              (!chat.is_read && chat.receiver_id === user.id) ? "bg-brand/5" : ""
                            )}
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-muted">
                              <img src={getAvatarUrl(chat.partnerId)} alt="프로필" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col flex-1 overflow-hidden">
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <span className="font-bold text-sm truncate shrink-0">{chat.partnerName}</span>
                                  {chat.postTitle && (
                                    <span className="text-[9px] text-brand border border-brand/20 bg-brand/5 px-1.5 py-0.5 rounded-full truncate">
                                      📝 {chat.postTitle}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 ml-2">
                                  {new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <span className={cn(
                                "text-xs line-clamp-1",
                                (!chat.is_read && chat.receiver_id === user.id) ? "font-bold text-foreground" : "text-muted-foreground"
                              )}>
                                {chat.sender_id === user.id ? "나: " : ""}{chat.content}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  {user && (
                    <Link 
                      href="/chat" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="block w-full p-3 text-center text-xs font-bold text-brand bg-brand/5 hover:bg-brand/10 transition-colors border-t border-border/50"
                    >
                      모든 채팅 목록 보기
                    </Link>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {mounted && theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </button>
            
            {mounted && (
              user ? (
                <Link href="/profile/edit" className="text-sm font-medium bg-brand/10 text-brand px-3 py-1.5 rounded-full hover:bg-brand/20 transition-colors">
                  내 프로필
                </Link>
              ) : (
                <Link href="/auth/login" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                  로그인
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-0 right-0 z-[100] px-4 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
          <div className="max-w-md mx-auto bg-background/95 backdrop-blur-md border border-brand/30 shadow-lg shadow-brand/10 rounded-2xl p-4 flex items-start gap-4 pointer-events-auto">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-muted border border-border">
              <img src={getAvatarUrl(toastMessage.senderId)} alt={toastMessage.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col flex-1 overflow-hidden pt-0.5">
              <span className="font-bold text-sm text-foreground">{toastMessage.name}님의 새 메시지</span>
              <span className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{toastMessage.content}</span>
              <Link 
                href={`/chat/${toastMessage.senderId}`}
                onClick={() => setToastMessage(null)}
                className="text-brand text-xs font-bold mt-2 hover:underline"
              >
                답장하기
              </Link>
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

