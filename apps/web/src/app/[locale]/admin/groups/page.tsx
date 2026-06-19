'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth.context';
import { apiFetch, resolveImageUrl } from '@/lib/api';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type GroupListItem = {
  group: {
    id: string;
    pid: string;
    name: string;
    description: string;
    photoUrl: string | null;
    discoverableBySearch: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: { displayName: string | null };
  };
  membership: {
    role: 'GROUP_ADMIN' | 'GROUP_MEMBER';
    status: 'ACCEPTED' | 'PENDING' | 'DECLINED' | 'REMOVED';
    joinedAt: string | null;
  };
};

function SortableGroupRow({ item, locale, zh }: { item: GroupListItem; locale: string; zh: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.group.id });
  const { group } = item;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-stretch rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
    >
      {/* Full-height left photo */}
      <div className="w-20 shrink-0 bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
        {group.photoUrl ? (
          <div className="relative w-full h-full">
            <Image src={resolveImageUrl(group.photoUrl) ?? ''} alt="" fill className="object-cover" />
          </div>
        ) : (
          <svg className="w-7 h-7 text-indigo-300 dark:text-indigo-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        )}
      </div>
      <Link
        href={`/${locale}/admin/groups/${group.id}`}
        className="flex-1 flex items-center px-4 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        {/* Text */}
        <div className="flex-1 min-w-0 space-y-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{group.name}</h2>
          {group.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{group.description}</p>
          )}
        </div>
      </Link>
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-10 shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none border-l border-gray-100 dark:border-gray-800"
        tabIndex={-1}
        aria-label={zh ? '拖動以排序' : 'Drag to reorder'}
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
          <rect y="1" width="14" height="1.75" rx="0.875"/>
          <rect y="6.125" width="14" height="1.75" rx="0.875"/>
          <rect y="11.25" width="14" height="1.75" rx="0.875"/>
        </svg>
      </button>
    </div>
  );
}

export default function AdminGroupsPage({ params }: { params: { locale: string } }) {
  const { user, loading } = useAuth();
  const zh = params.locale === 'zh';
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderedGroups, setOrderedGroups] = useState<GroupListItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedGroups((prev) => {
      const oldIndex = prev.findIndex((g) => g.group.id === active.id);
      const newIndex = prev.findIndex((g) => g.group.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      apiFetch('/groups/me/order', {
        method: 'PATCH',
        body: JSON.stringify({ order: next.map((g) => g.group.id) }),
      }).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    if (loading || !user) return;
    if (user.role !== 'ADMIN') { setPageLoading(false); return; }
    apiFetch<GroupListItem[]>('/groups/me')
      .then((g) => setOrderedGroups(g))
      .catch((err: Error) => setError(err.message ?? 'Failed to load groups.'))
      .finally(() => setPageLoading(false));
  }, [loading, user]);

  if (loading || pageLoading) return <p className="py-16 text-center text-gray-400">Loading…</p>;

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        {zh ? '只有平台管理員可以查看群組管理。' : 'Only platform admins can access group management.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{zh ? '群組管理' : 'Groups'}</h1>
        <Link
          href={`/${params.locale}/admin/groups/new`}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          {zh ? '+ 建立群組' : '+ Create Group'}
        </Link>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {orderedGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{zh ? '尚未建立任何群組。' : 'No groups created yet.'}</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedGroups.map((g) => g.group.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-4">
              {orderedGroups.map((item) => (
                <SortableGroupRow key={item.group.id} item={item} locale={params.locale} zh={zh} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
