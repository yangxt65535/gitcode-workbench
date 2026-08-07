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
  perPage: number;
  totalPage: number | null;
  totalCount: number | null;
  onPageChange: (page: number) => void;
};

export function IssueList({
  items,
  selectedNumber,
  onSelect,
  loading,
  page,
  perPage,
  totalPage,
  totalCount,
  onPageChange,
}: IssueListProps) {
  return (
    <PagedEntityList
      loading={loading}
      emptyHint="当前筛选条件下暂无 Issue"
      itemCount={items.length}
      page={page}
      perPage={perPage}
      totalPage={totalPage}
      totalCount={totalCount}
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
