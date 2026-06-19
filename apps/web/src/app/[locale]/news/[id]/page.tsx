'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { apiFetch, resolveImageUrl } from '@/lib/api';
import type { News } from '@judien/shared';

export default function NewsDetailPage() {
  const params = useParams<{ locale: string; id: string }>();
  const zh = params.locale === 'zh';
  const [post, setPost] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<News>(`/news/${params.id}`)
      .then(setPost)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
  if (!post) return <p className="text-red-500 mt-8 text-sm">{zh ? '找不到此文章。' : 'Post not found.'}</p>;

  const title = zh ? post.title_zh : post.title_en;
  const body = zh ? post.body_zh : post.body_en;
  const coverUrl = resolveImageUrl(post.coverImageUrl ?? null);

  return (
    <div className="flex flex-col gap-6">
      {coverUrl && (
        <div className="relative w-full h-56 rounded-xl overflow-hidden">
          <Image src={coverUrl} alt={title} fill className="object-cover" />
        </div>
      )}

      {post.group && (
        <span className="self-start inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-3 py-1 rounded-full">
          👥 {post.group.name}
        </span>
      )}

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-snug">{title}</h1>

      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0">
          {(post.createdBy?.displayName?.[0] ?? '?').toUpperCase()}
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">{post.createdBy?.displayName ?? ''}</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span>{new Date(post.createdAt).toLocaleDateString(zh ? 'zh-TW' : 'en-US', { dateStyle: 'long' })}</span>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800" />

      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">
        {body}
      </p>
    </div>
  );
}
