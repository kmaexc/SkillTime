"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase/client";

export interface Post {
  id: number;
  category: string;
  title: string;
  preview: string;
  content: string;
  author: string;
  time: string;
  likes: number;
  comments: number;
  created_at?: string;
  user_id?: string;
  is_anonymous?: boolean;
}

export function usePosts(category?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (!error && data) {
      // Supabase time을 텍스트 렌더링용으로 변환하거나 그대로 사용
      const formattedData = data.map((post: any) => ({
        ...post,
        time: post.created_at ? new Date(post.created_at).toLocaleString() : "방금 전",
      }));
      setPosts(formattedData);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const addPost = async (newPost: Omit<Post, "id" | "time" | "likes" | "comments" | "created_at">) => {
    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          ...newPost,
          likes: 0,
          comments: 0,
        }
      ])
      .select();

    if (!error && data) {
      const insertedPost = {
        ...data[0],
        time: "방금 전",
      };
      setPosts((prev) => [insertedPost, ...prev]);
      return insertedPost;
    }
    return null;
  };

  const updatePost = async (id: number, updatedData: Partial<Post>) => {
    const { data, error } = await supabase
      .from("posts")
      .update(updatedData)
      .eq("id", id)
      .select();

    if (!error && data) {
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, ...data[0], time: p.time } : p));
      return data[0];
    }
    return null;
  };

  const deletePost = async (id: number) => {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      return true;
    }
    return false;
  };

  return {
    posts,
    loading,
    addPost,
    updatePost,
    deletePost,
    refreshPosts: fetchPosts,
  };
}
