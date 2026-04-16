'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import styles from './GroupHierarchyChart.module.css';

type SubgroupInfo = { id: string; name: string; description?: string };

type TreeApiItem = SubgroupInfo & { children: SubgroupInfo[] };

type TreeNode = {
  id: string;
  name: string;
  isCurrent: boolean;
  children: TreeNode[];
};

export type HierarchyData = {
  parentGroup: SubgroupInfo | null;
  subgroups: SubgroupInfo[];
  lineage?: Array<{ id: string; name: string }>;
  tree?: TreeApiItem[];
};

interface Props {
  data: HierarchyData;
  currentGroupId: string;
  locale: string;
  loading?: boolean;
  onClose: () => void;
}

function buildTree(data: HierarchyData, currentGroupId: string): TreeNode | null {
  const { lineage, tree } = data;

  // Fallback: no lineage at all — just show current group + children
  if (!lineage || lineage.length === 0) {
    return {
      id: currentGroupId,
      name: '(current group)',
      isCurrent: true,
      children: (tree ?? []).map((sg) => ({
        id: sg.id,
        name: sg.name,
        isCurrent: false,
        children: (sg.children ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          isCurrent: false,
          children: [],
        })),
      })),
    };
  }

  // Build children for the current group from `tree`
  const treeChildren: TreeNode[] = (tree ?? []).map((sg) => ({
    id: sg.id,
    name: sg.name,
    isCurrent: false,
    children: (sg.children ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      isCurrent: false,
      children: [],
    })),
  }));

  // The last lineage entry is the current group
  let node: TreeNode = {
    id: lineage[lineage.length - 1].id,
    name: lineage[lineage.length - 1].name,
    isCurrent: lineage[lineage.length - 1].id === currentGroupId,
    children: treeChildren,
  };

  // Wrap in ancestor chain (walk lineage in reverse, skipping the last)
  for (let i = lineage.length - 2; i >= 0; i--) {
    node = {
      id: lineage[i].id,
      name: lineage[i].name,
      isCurrent: lineage[i].id === currentGroupId,
      children: [node],
    };
  }

  return node;
}

function NodeComponent({ node, locale }: { node: TreeNode; locale: string }) {
  return (
    <li>
      <Link
        href={`/${locale}/groups/${node.id}`}
        className={`${styles.nodeBox} ${node.isCurrent ? styles.nodeBoxCurrent : styles.nodeBoxDefault}`}
        title={node.name}
      >
        {node.name}
      </Link>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <NodeComponent key={child.id} node={child} locale={locale} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function GroupHierarchyChart({ data, currentGroupId, locale, loading, onClose }: Props) {
  const zh = locale === 'zh';

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const root = buildTree(data, currentGroupId);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
            <span className={styles.headerTitle}>{zh ? '群組層級圖' : 'Group Hierarchy'}</span>
            <span className={styles.headerLegend}>
              <span className={styles.legendDot}>
                <span className={styles.legendDotIndigo} />
                {zh ? '目前群組' : 'Current'}
              </span>
              <span className={styles.legendDot}>
                <span className={styles.legendDotGray} />
                {zh ? '其他群組' : 'Other group'}
              </span>
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Chart */}
        <div className={styles.chartContainer}>
          {loading ? (
            <div className={styles.spinner} />
          ) : root ? (
            <div className={styles.tree}>
              <ul>
                <NodeComponent node={root} locale={locale} />
              </ul>
            </div>
          ) : (
            <p className={styles.noData}>
              {zh ? '無層級資料。' : 'No hierarchy data available.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
