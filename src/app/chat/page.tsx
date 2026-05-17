"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { getAvatarUrl } from "@/lib/avatar";

interface ChatRoom {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  postId: string | null;
  postTitle: string | null;
}

export default function ChatListPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);

  const fetchChatRooms = async (currentUser: any) => {
    // 로그인한 유저가 보냈거나 받은 모든 메시지 가져오기
    const { data: messages } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        sender_id,
        receiver_id,
        post_id,
        is_read,
        sender:profiles!sender_id(id, name),
        receiver:profiles!receiver_id(id, name),
        post:posts!post_id(id, title)
      `)
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order("created_at", { ascending: false });

    if (messages) {
      const roomMap = new Map<string, ChatRoom>();

      messages.forEach((msg: any) => {
        // 대화 상대 및 게시글 파악
        const isMeSender = msg.sender_id === currentUser.id;
        const partnerId = isMeSender ? msg.receiver_id : msg.sender_id;
        const partnerProfile = isMeSender ? msg.receiver : msg.sender;
        const postId = msg.post_id ? String(msg.post_id) : null;
        const roomId = `${partnerId}_${postId || 'general'}`;
        
        if (!roomMap.has(roomId)) {
          // 처음 발견된 메시지(가장 최신 메시지)
          let previewText = msg.content;
          if (previewText.startsWith("[SYS:COMPLETED]")) previewText = "🤝 기술 교환이 완료되었습니다.";
          else if (previewText.startsWith("[SYS:CANCELED]")) previewText = "🚫 기술 교환이 취소되었습니다.";
          
          roomMap.set(roomId, {
            partnerId,
            partnerName: partnerProfile?.name || "알 수 없음",
            partnerAvatar: partnerId,
            lastMessage: previewText,
            lastMessageTime: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unreadCount: (!isMeSender && !msg.is_read) ? 1 : 0,
            postId,
            postTitle: msg.post?.title || null
          });
        } else {
          // 안 읽은 메시지 개수 누적
          if (!isMeSender && !msg.is_read) {
            const room = roomMap.get(roomId)!;
            room.unreadCount += 1;
          }
        }
      });

      setChatRooms(Array.from(roomMap.values()));
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const init = async () => {
      setLoading(true);
      await fetchChatRooms(user);
      setLoading(false);
    };

    init();

    // 실시간 메시지 구독 (새로운 메시지가 오거나 읽음 처리되면 채팅 목록 갱신)
    const channel = supabase
      .channel("chat_list_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          
          // RLS에 의해 나침반(나와 관련된 메시지)만 수신되므로 즉시 갱신
          fetchChatRooms(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
        <header className="flex items-center justify-between h-14 px-4 bg-background/95 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-foreground/80 hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold">채팅 목록</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
          <p>채팅 목록을 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
        <header className="flex items-center justify-between h-14 px-4 bg-background/95 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-foreground/80 hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold">채팅 목록</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-4">
          <p>로그인이 필요한 서비스입니다.</p>
          <Link href="/auth/login" className="px-4 py-2 bg-brand text-white rounded-xl font-bold">로그인 하러 가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur-md border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-foreground/80 hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">채팅 목록</h1>
        </div>
      </header>

      {/* List */}
      <div className="flex flex-col p-4 gap-2">
        {chatRooms.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageCircle className="w-12 h-12 opacity-20" />
            <p className="text-sm">아직 진행 중인 대화가 없습니다.</p>
            <Link href="/board/skill" className="mt-2 text-brand text-sm hover:underline font-bold">
              스킬 교환 파트너 찾아보기
            </Link>
          </div>
        ) : (
          chatRooms.map((room) => (
            <Link 
              key={`${room.partnerId}_${room.postId || 'general'}`} 
              href={`/chat/${room.partnerId}${room.postId ? `?postId=${room.postId}` : ''}`}
              className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors border border-border/50"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-muted border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getAvatarUrl(room.partnerAvatar)} alt={room.partnerName} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-bold text-base truncate shrink-0">{room.partnerName}</span>
                    {room.postTitle && (
                      <span className="text-[10px] text-brand border border-brand/20 bg-brand/5 px-2 py-0.5 rounded-full truncate">
                        📝 {room.postTitle}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2 shrink-0">
                    {room.lastMessageTime}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-sm text-foreground/80 line-clamp-1 flex-1">
                    {room.lastMessage}
                  </span>
                  {room.unreadCount > 0 && (
                    <span className="shrink-0 bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center min-w-5 h-5">
                      {room.unreadCount > 99 ? '99+' : room.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
