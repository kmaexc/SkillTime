"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, MoreVertical, Send, Star, CheckCircle2, XCircle } from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isAnonymous = searchParams.get("anonymous") === "true";
  const postId = searchParams.get("postId");
  
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  
  // Modals state
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [postTitle, setPostTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Cancel options
  const [cancelReason, setCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // 대화 종료 여부 (진행 중인 채팅방인지 확인)
  const isEnded = messages.some(m => m.text.startsWith("[SYS:"));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 렌더링 후 브라우저가 높이를 계산할 시간을 약간 줍니다.
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    const checkAndFetchRating = async () => {
      // 새로운 [SYS:COMPLETED] 메시지가 추가되면 상대방의 평점을 다시 불러옵니다 (실시간 연동 효과)
      if (messages.length > 0 && messages[messages.length - 1].text.startsWith("[SYS:COMPLETED]")) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("rating")
          .eq("reviewee_id", id);
          
        let avgRating = "0.0";
        let reviewCount = 0;
        if (reviewsData && reviewsData.length > 0) {
          const total = reviewsData.reduce((acc: number, curr: any) => acc + curr.rating, 0);
          avgRating = (total / reviewsData.length).toFixed(1);
          reviewCount = reviewsData.length;
        }
        
        setPartnerInfo((prev: any) => prev ? { ...prev, avgRating, reviewCount } : null);
      }
    };
    checkAndFetchRating();
  }, [messages, id]);

  useEffect(() => {
    let isMounted = true;
    let channel: any = null;

    const initChat = async () => {
      setLoading(true);
      // 1. 현재 로그인한 유저 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isMounted) {
        if (isMounted) setLoading(false);
        return;
      }
      setCurrentUser(session.user);

      // 2. 파트너(상대방) 정보 가져오기
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
        
      if (!isMounted) return;
      
      if (profile) {
        // 상대방 평점 가져오기
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("rating")
          .eq("reviewee_id", profile.id);
          
        let avgRating = "0.0";
        let reviewCount = 0;
        if (reviewsData && reviewsData.length > 0) {
          const total = reviewsData.reduce((acc: number, curr: any) => acc + curr.rating, 0);
          avgRating = (total / reviewsData.length).toFixed(1);
          reviewCount = reviewsData.length;
        }

        setPartnerInfo({
          id: profile.id,
          name: isAnonymous ? "익명" : profile.name,
          skill: isAnonymous ? "비공개" : (profile.skills?.[0]?.name || profile.skills?.[0] || "등록된 기술 없음"),
          seed: isAnonymous ? "anonymous" : profile.id, // 아바타 시드
          summary: isAnonymous ? "익명 사용자와의 대화입니다." : (profile.summary || "소개가 없습니다."),
          avgRating,
          reviewCount
        });
      }

      if (postId) {
        const { data: postData } = await supabase
          .from("posts")
          .select("title")
          .eq("id", postId)
          .single();
        if (postData) {
          setPostTitle(postData.title);
        }
      }

      // 3. 기존 메시지 내역 불러오기
      let query = supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${session.user.id})`)
        .order("created_at", { ascending: true });

      if (postId) {
        query = query.eq("post_id", postId);
      } else {
        query = query.is("post_id", null);
      }

      const { data: msgs } = await query;

      if (!isMounted) return;

      if (msgs) {
        setMessages(msgs.map(msg => ({
          id: msg.id,
          text: msg.content,
          isMe: msg.sender_id === session.user.id,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));

        // 상대방이 나에게 보낸 메시지 중 안 읽은 메시지를 읽음 처리
        const unreadMsgIds = msgs
          .filter(msg => msg.receiver_id === session.user.id && !msg.is_read)
          .map(msg => msg.id);

        if (unreadMsgIds.length > 0) {
          const { error } = await supabase
            .from("messages")
            .update({ is_read: true })
            .in("id", unreadMsgIds);
            
          if (error) {
            console.error("메시지 읽음 처리 실패 (RLS 정책 문제일 수 있습니다):", error);
          }
        }
      }

      setLoading(false);

      if (!isMounted) return;

      // 이미 같은 이름의 채널이 남아있을 수 있으므로 안전을 위해 이전 채널을 먼저 제거합니다.
      const channelName = `chat_${session.user.id}_${id}_${postId || 'general'}`;
      const existingChannel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      // 4. 실시간 메시지 구독 (Realtime)
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            const newMsg = payload.new;
            // 현재 대화 중인 두 사람 간의 메시지만 추가
            // postId가 지정된 방이라면, 해당 postId와 일치하는지 확인
            const isMatchingPost = postId ? (newMsg.post_id === Number(postId)) : !newMsg.post_id;
            
            if (
              isMatchingPost &&
              ((newMsg.sender_id === session.user.id && newMsg.receiver_id === id) ||
              (newMsg.sender_id === id && newMsg.receiver_id === session.user.id))
            ) {
              setMessages(prev => {
                // 이미 존재하는지 확인 (자신이 보낸 메시지는 handleSend에서 먼저 추가될 수 있음)
                if (prev.some(m => m.id === newMsg.id)) return prev;
                
                return [...prev, {
                  id: newMsg.id,
                  text: newMsg.content,
                  isMe: newMsg.sender_id === session.user.id,
                  time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }];
              });

              // 내가 받은 메시지라면 즉시 읽음 처리
              if (newMsg.receiver_id === session.user.id && !newMsg.is_read) {
                supabase
                  .from("messages")
                  .update({ is_read: true })
                  .eq("id", newMsg.id)
                  .then(({ error }) => {
                    if (error) console.error("실시간 메시지 읽음 처리 실패:", error);
                  });
              }
            }
          }
        )
        .subscribe();
    };

    initChat();

    // useEffect의 cleanup 함수로 등록
    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id, isAnonymous, postId]);

  const PRESET_MESSAGES = [
    "포트폴리오 잘 보았습니다!",
    "특정 기술 질문이 있습니다.",
    "언제 시간 괜찮으신가요?",
    "스킬 교환을 시작할까요?"
  ];

  const handleSend = async (text: string) => {
    if (!text.trim() || !currentUser) return;
    
    // UI에 임시 ID로 먼저 추가하여 빠른 반응성 제공 (Optimistic UI)
    const tempId = Date.now();
    const newMessage = {
      id: tempId,
      text,
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText("");

    // 서버로 전송
    const messageData: any = {
      sender_id: currentUser.id,
      receiver_id: id,
      content: text
    };
    if (postId) {
      messageData.post_id = Number(postId);
    }

    const { error, data } = await supabase
      .from("messages")
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error("메시지 전송 실패:", error);
      // 실패 시 UI에서 제거하는 로직 등을 추가할 수 있습니다.
    } else if (data) {
      // 서버에서 발급된 ID로 업데이트
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id } : m));
    }
  };

  const submitComplete = async () => {
    if (rating > 0 && currentUser) {
      const reviewData: any = {
        reviewer_id: currentUser.id,
        reviewee_id: id,
        rating,
        tags: selectedTags
      };
      
      if (postId && postId !== "undefined" && postId !== "null") {
        reviewData.post_id = Number(postId);
      }
      
      const { error } = await supabase
        .from("reviews")
        .insert(reviewData);
        
      if (error) {
        console.error("리뷰 저장 실패 상세 에러:", JSON.stringify(error, null, 2), error);
      }
    }
    
    handleSend("[SYS:COMPLETED]");
    setIsCompleteModalOpen(false);
  };

  const submitCancel = () => {
    const reason = cancelReason === "기타 (직접 입력)" ? customCancelReason : cancelReason;
    if (!reason.trim()) return;
    handleSend(`[SYS:CANCELED]${reason}`);
    setIsCancelModalOpen(false);
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background relative overflow-hidden items-center justify-center text-muted-foreground">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p>채팅을 불러오는 중입니다...</p>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!currentUser) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background relative overflow-hidden items-center justify-center text-muted-foreground">
        <p>로그인이 필요한 서비스입니다.</p>
        <Link href="/auth/login" className="mt-4 px-4 py-2 bg-brand text-white rounded-xl">로그인 하러 가기</Link>
      </div>
    );
  }

  // 상대를 찾을 수 없는 경우
  if (!partnerInfo) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background relative overflow-hidden items-center justify-center text-muted-foreground">
        <p>상대방 정보를 찾을 수 없습니다.</p>
        <Link href="/board/skill" className="mt-4 px-4 py-2 bg-muted text-foreground rounded-xl">목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between h-16 px-4 bg-background/90 backdrop-blur-md border-b border-border/40 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="text-foreground/80 hover:text-foreground shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getAvatarUrl(partnerInfo.seed)} alt={partnerInfo.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate flex items-center gap-1.5">
                {partnerInfo.name}
                {!isAnonymous && partnerInfo.avgRating !== null && (
                  <span className="text-[10px] text-brand border border-brand/20 bg-brand/5 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                    <span>⭐</span> {partnerInfo.avgRating} <span className="text-muted-foreground ml-0.5">({partnerInfo.reviewCount || 0})</span>
                  </span>
                )}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {postTitle ? `📝 ${postTitle}` : `${partnerInfo.skill} | ${partnerInfo.summary}`}
              </span>
            </div>
          </div>
        </div>
        {!isEnded && (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsCancelModalOpen(true)}
              className="shrink-0 bg-muted/80 text-foreground text-xs font-bold px-3 py-1.5 rounded-full hover:bg-muted transition-colors border border-border/50"
            >
              교환 취소
            </button>
            <button 
              onClick={() => setIsCompleteModalOpen(true)}
              className="shrink-0 bg-brand/10 text-brand text-xs font-bold px-3 py-1.5 rounded-full hover:bg-brand/20 transition-colors"
            >
              교환 완료
            </button>
          </div>
        )}
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm opacity-60">
            <p>아직 나눈 대화가 없습니다.</p>
            <p>아래 추천 메시지로 인사를 건네보세요!</p>
          </div>
        ) : (
          messages.map((msg) => {
            // 시스템 메시지 처리
            if (msg.text.startsWith("[SYS:")) {
              let sysText = "";
              if (msg.text.startsWith("[SYS:COMPLETED]")) {
                sysText = "🤝 기술 교환이 완료되었습니다.";
              } else if (msg.text.startsWith("[SYS:CANCELED]")) {
                const reason = msg.text.replace("[SYS:CANCELED]", "");
                sysText = `🚫 기술 교환이 취소되었습니다. (사유: ${reason})`;
              }
              
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <div className="bg-muted/50 text-muted-foreground text-xs font-medium px-4 py-2 rounded-full border border-border/50">
                    {sysText}
                  </div>
                </div>
              );
            }

            // 일반 메시지 처리
            return (
              <div key={msg.id} className={`flex ${msg.isMe ? "justify-end" : "justify-start"} items-end gap-1.5`}>
                {!msg.isMe && (
                  <>
                    <div className="max-w-[75%] bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-2">
                      <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0 mb-1">{msg.time}</span>
                  </>
                )}
                
                {msg.isMe && (
                  <>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0 mb-1">{msg.time}</span>
                    <div className="max-w-[75%] bg-brand text-white rounded-2xl rounded-br-sm px-4 py-2 shadow-sm">
                      <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 bg-background border-t border-border/40 p-4 pb-8">
        {isEnded ? (
          <div className="w-full text-center py-4 bg-muted/30 rounded-2xl border border-border/50">
            <p className="text-sm font-bold text-muted-foreground">이 대화는 종료되었습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">더 이상 메시지를 보낼 수 없습니다.</p>
          </div>
        ) : (
          <>
            {/* Presets */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 -mx-4 px-4 pb-1">
              {PRESET_MESSAGES.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(preset)}
                  className="shrink-0 bg-muted/50 hover:bg-muted border border-border/50 text-xs font-medium px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                >
                  {preset}
                </button>
              ))}
            </div>
            
            {/* Input Box */}
            <div className="flex items-end gap-2 bg-muted/30 border border-border/50 rounded-2xl p-1.5 pl-4 focus-within:border-brand/50 transition-colors">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(inputText);
                  }
                }}
                placeholder="메시지를 입력하세요..."
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-2.5 text-sm max-h-32 min-h-[44px]"
                rows={1}
              />
              <button 
                onClick={() => handleSend(inputText)}
                disabled={!inputText.trim()}
                className="shrink-0 bg-brand text-white w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 transition-opacity"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Complete Review Modal */}
      <AnimatePresence>
        {isCompleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCompleteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-background border border-border/50 rounded-3xl p-6 shadow-xl flex flex-col gap-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-1">기술 교환 완료!</h3>
                <p className="text-sm text-muted-foreground">
                  {partnerInfo?.name}님과의 교환은 어떠셨나요?
                </p>
              </div>

              {/* Star Rating */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-bold">전문성 및 전달력</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none"
                    >
                      <Star 
                        className={`w-8 h-8 transition-colors ${
                          star <= (hoverRating || rating) 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-muted-foreground/30"
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-center">어떤 점이 좋았나요?</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {["설명이 이해하기 쉬워요", "시간 약속을 잘 지켜요", "전문성이 뛰어나요", "친절하고 매너가 좋아요"].map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button 
                        key={tag} 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(prev => prev.filter(t => t !== tag));
                          } else {
                            setSelectedTags(prev => [...prev, tag]);
                          }
                        }}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all border ${
                          isSelected 
                            ? "bg-brand/20 text-brand border-brand font-bold shadow-sm" 
                            : "bg-muted/50 text-foreground hover:bg-brand/5 hover:text-brand border-border/50"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 rounded-xl transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={submitComplete}
                  className="flex-1 bg-brand hover:bg-brand-light text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-brand/20"
                >
                  완료 처리하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCancelModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-background border border-border/50 rounded-3xl p-6 shadow-xl flex flex-col gap-5"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-1">교환을 취소하시겠습니까?</h3>
                <p className="text-sm text-muted-foreground">
                  취소 사유를 선택해 주세요. 취소하면 더 이상 대화를 나눌 수 없습니다.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {["상대방이 응답하지 않아요", "일정이 맞지 않아요", "서로 원하는 교환 조건이 달라요", "기타 (직접 입력)"].map(reason => (
                  <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="cancel_reason" 
                      value={reason} 
                      checked={cancelReason === reason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="accent-red-500 w-4 h-4"
                    />
                    <span className="text-sm">{reason}</span>
                  </label>
                ))}
                
                {cancelReason === "기타 (직접 입력)" && (
                  <textarea
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder="상세 사유를 입력해주세요..."
                    className="w-full mt-2 p-3 bg-muted/30 border border-border/50 rounded-xl text-sm resize-none focus:outline-none focus:border-red-500/50 transition-colors"
                    rows={3}
                  />
                )}
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 rounded-xl transition-colors"
                >
                  닫기
                </button>
                <button 
                  onClick={submitCancel}
                  disabled={!cancelReason || (cancelReason === "기타 (직접 입력)" && !customCancelReason.trim())}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:shadow-none"
                >
                  교환 취소
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
