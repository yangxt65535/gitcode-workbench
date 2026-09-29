"use client";

import type { Pull } from "@/lib/pulls/types";
import { PullListItem } from "./PullListItem";
import { PagedEntityList } from "@/components/workbench/PagedEntityList";

type PullListProps = {
  items: Pull[];
  selectedNumber: number | null;
  onSelect: (number: number) => void;
  loading?: boolean;
  page: number;
  totalPage: number;
  totalCount: number;
  countApprox: boolean;
  hasMore: boolean;
  disabled: boolean;
  loadingMore: boolean;
  onPageChange: (page: number) => void;
};

export function PullList({
  items,
  selectedNumber,
  onSelect,
  loading,
  page,
  totalPage,
  totalCount,
  countApprox,
  hasMore,
  disabled,
  loadingMore,
  onPageChange,
}: PullListProps) {
  return (
    <PagedEntityList
      loading={loading}
      emptyHint="当前筛选条件下暂无 PR"
      itemCount={items.length}
      page={page}
      totalPage={totalPage}
      totalCount={totalCount}
      countApprox={countApprox}
      hasMore={hasMore}
      disabled={disabled}
      loadingMore={loadingMore}
      onPageChange={onPageChange}
    >
      {items.map((pull) => (
        <PullListItem
          key={pull.number}
          pull={pull}
          selected={selectedNumber === pull.number}
          onSelect={onSelect}
        />
      ))}
    </PagedEntityList>
  );
}
