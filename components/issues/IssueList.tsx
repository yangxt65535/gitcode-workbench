"use client";

import type { Issue } from "@/lib/issues/types";
import { IssueListItem } from "./IssueListItem";
import { PagedEntityList } from "@/components/workbench/PagedEntityList";

type IssueListProps = {
  items: Issue[];
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

export function IssueList({
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
}: IssueListProps) {
  return (
    <PagedEntityList
      loading={loading}
      emptyHint="当前筛选条件下暂无 Issue"
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
      {items.map((issue) => (
        <IssueListItem
          key={issue.number}
          issue={issue}
          selected={selectedNumber === issue.number}
          onSelect={onSelect}
        />
      ))}
    </PagedEntityList>
  );
}
