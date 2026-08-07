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
  perPage: number;
  totalPage: number | null;
  totalCount: number | null;
  onPageChange: (page: number) => void;
};

export function PullList({
  items,
  selectedNumber,
  onSelect,
  loading,
  page,
  perPage,
  totalPage,
  totalCount,
  onPageChange,
}: PullListProps) {
  return (
    <PagedEntityList
      loading={loading}
      emptyHint="当前筛选条件下暂无 PR"
      itemCount={items.length}
      page={page}
      perPage={perPage}
      totalPage={totalPage}
      totalCount={totalCount}
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
