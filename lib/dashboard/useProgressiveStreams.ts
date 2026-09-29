"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GitCodeHttpError } from "@/lib/gitcode/client";
import {
  mergeDashboardItems,
  serverPageForDisplayPage,
} from "@/lib/dashboard/progressiveList";

export type StreamPageResult<T> = {
  items: T[];
  rawCount: number;
  perPage: number;
  capped: boolean;
};

export type UseProgressiveStreamsOptions<T> = {
  /** 变化即重置并重新加载（workspace / 筛选 / 排序等编码进 key）。 */
  queryKey: string | null;
  enabled: boolean;
  /** 数据流 id 列表；多流按序去重合并（前面的流优先），单流直接拼接。 */
  streams: string[];
  serverPerPage: number;
  displayPageSize: number;
  maxServerPages: number;
  /** 首屏后是否后台继续补齐（用于总数精确与关联匹配）。 */
  background: boolean;
  fetchPage: (
    stream: string,
    page: number,
    signal: AbortSignal,
  ) => Promise<StreamPageResult<T>>;
  getKey: (item: T) => string;
  onUnauthorized?: () => void;
};

export type ProgressiveStreams<T> = {
  items: T[];
  /** 所有流都到尾（或到页数上限）。 */
  exhausted: boolean;
  /** 有流因页数上限截断，总数可能偏小。 */
  capped: boolean;
  initialLoading: boolean;
  loadingMore: boolean;
  error: string | null;
  /** 就地修补已加载项（如行内刷新 meta），不会被后续合并覆盖。 */
  updateItems: (updater: (prev: T[]) => T[]) => void;
  /** 确保展示第 displayPage 页所需的服务器页已加载（按需补拉）。 */
  ensureDisplayPage: (displayPage: number) => void;
  /** 拉齐全部剩余页（关联匹配 / 精确总数用）。 */
  ensureAll: () => void;
  reload: () => void;
};

type StreamDone = "end" | "cap";

/**
 * 渐进式多流分页加载：首屏只拉每个流第 1 个服务器页，渲染后（可选）后台
 * 逐段补齐；翻页/跳页时按需补拉缺失的服务器页。同一目标段内的页并行拉取，
 * 但只按「连续前缀」发布（第 1..loadedMax 页齐全才合并），保证排序拼接正确。
 */
export function useProgressiveStreams<T>(
  options: UseProgressiveStreamsOptions<T>,
): ProgressiveStreams<T> {
  const { queryKey, enabled } = options;

  const [items, setItems] = useState<T[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [capped, setCapped] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  const effectiveKey =
    enabled && queryKey ? `${queryKey}\0v${reloadVersion}` : null;

  // 与 Workbench 相同的 render 期绑定重置模式
  const [boundKey, setBoundKey] = useState<string | null>(null);
  if (boundKey !== effectiveKey) {
    setBoundKey(effectiveKey);
    setItems([]);
    setExhausted(false);
    setCapped(false);
    setInitialLoading(effectiveKey != null);
    setLoadingMore(false);
    setError(null);
  }

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const runIdRef = useRef(0);
  const acRef = useRef<AbortController | null>(null);
  const cachesRef = useRef<Map<string, Map<number, T[]>>>(new Map());
  const loadedMaxRef = useRef<Map<string, number>>(new Map());
  const doneRef = useRef<Map<string, StreamDone>>(new Map());
  const failedRunRef = useRef<number | null>(null);
  const bgRunRef = useRef<number | null>(null);
  const inflightRef = useRef<{ runId: number; target: number } | null>(null);
  const overlayRef = useRef<Map<string, T>>(new Map());
  const pageMetaRef = useRef<
    Map<string, Map<number, { rawCount: number; perPage: number; capped: boolean }>>
  >(new Map());
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  function enqueue(task: () => Promise<void>): Promise<void> {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  const publishMerged = useCallback(() => {
    const opts = optionsRef.current;
    const lists: T[][] = [];
    for (const stream of opts.streams) {
      const cache = cachesRef.current.get(stream);
      const loaded = loadedMaxRef.current.get(stream) ?? 0;
      const flat: T[] = [];
      if (cache) {
        for (let page = 1; page <= loaded; page += 1) {
          const pageItems = cache.get(page);
          if (pageItems) flat.push(...pageItems);
        }
      }
      lists.push(flat);
    }
    const merged =
      lists.length > 1
        ? mergeDashboardItems(lists, opts.getKey)
        : (lists[0] ?? []);
    if (overlayRef.current.size > 0) {
      for (let i = 0; i < merged.length; i += 1) {
        const patched = overlayRef.current.get(opts.getKey(merged[i]!));
        if (patched) merged[i] = patched;
      }
    }
    setItems(merged);
  }, []);

  /** 推进连续前缀：cache 中第 loadedMax+1 页就绪则计入发布并判定终止。 */
  const advanceStreams = useCallback(() => {
    const opts = optionsRef.current;
    const maxPages = Math.max(1, opts.maxServerPages);
    let published = false;
    for (const stream of opts.streams) {
      if (doneRef.current.has(stream)) continue;
      const cache = cachesRef.current.get(stream);
      if (!cache) continue;
      for (;;) {
        const loaded = loadedMaxRef.current.get(stream) ?? 0;
        const next = cache.get(loaded + 1);
        if (!next) break;
        // 页结果元信息与数据一起缓存在 meta 表中
        const meta = pageMetaRef.current.get(stream)?.get(loaded + 1);
        loadedMaxRef.current.set(stream, loaded + 1);
        if (meta) {
          if (meta.rawCount < meta.perPage) doneRef.current.set(stream, "end");
          else if (meta.capped || loaded + 1 >= maxPages) {
            doneRef.current.set(stream, "cap");
          }
        }
        published = true;
      }
    }
    if (published) {
      publishMerged();
      let all = opts.streams.length > 0;
      let anyCap = false;
      for (const stream of opts.streams) {
        const done = doneRef.current.get(stream);
        if (!done) {
          all = false;
          continue;
        }
        if (done === "cap") anyCap = true;
      }
      setExhausted(all);
      setCapped(anyCap);
    }
  }, [publishMerged]);

  const ensureContiguous = useCallback(
    async (runId: number, ac: AbortController, target: number) => {
      if (runIdRef.current !== runId || ac.signal.aborted) return;
      const opts = optionsRef.current;
      const maxPages = Math.max(1, opts.maxServerPages);
      const t = Math.min(Math.max(1, target), maxPages);
      inflightRef.current = { runId, target: t };

      const pages: number[] = [];
      for (const stream of opts.streams) {
        if (doneRef.current.has(stream)) continue;
        const loaded = loadedMaxRef.current.get(stream) ?? 0;
        for (let page = loaded + 1; page <= t; page += 1) pages.push(page);
      }

      await Promise.all(
        opts.streams.map(async (stream) => {
          const loaded = loadedMaxRef.current.get(stream) ?? 0;
          await Promise.all(
            Array.from({ length: Math.max(0, t - loaded) }, (_, i) => loaded + 1 + i).map(
              async (page) => {
                if (runIdRef.current !== runId || ac.signal.aborted) return;
                if (failedRunRef.current === runId) return;
                if (doneRef.current.has(stream)) return;
                try {
                  const result = await opts.fetchPage(stream, page, ac.signal);
                  if (runIdRef.current !== runId || ac.signal.aborted) return;
                  const cache =
                    cachesRef.current.get(stream) ?? new Map<number, T[]>();
                  cache.set(page, result.items);
                  cachesRef.current.set(stream, cache);
                  const metas =
                    pageMetaRef.current.get(stream) ?? new Map();
                  metas.set(page, {
                    rawCount: result.rawCount,
                    perPage: result.perPage,
                    capped: result.capped,
                  });
                  pageMetaRef.current.set(stream, metas);
                  advanceStreams();
                } catch (err) {
                  if (runIdRef.current !== runId || ac.signal.aborted) return;
                  failedRunRef.current = runId;
                  if (err instanceof GitCodeHttpError && err.status === 401) {
                    opts.onUnauthorized?.();
                    setError("登录已失效，请重新配置 Token");
                  } else {
                    setError(err instanceof Error ? err.message : "加载失败");
                  }
                  setInitialLoading(false);
                }
              },
            ),
          );
        }),
      );

      if (inflightRef.current?.runId === runId) inflightRef.current = null;
    },
    [advanceStreams],
  );

  const runBackground = useCallback(
    async (runId: number, ac: AbortController) => {
      if (bgRunRef.current === runId) return;
      bgRunRef.current = runId;
      for (;;) {
        if (runIdRef.current !== runId || ac.signal.aborted) return;
        if (failedRunRef.current === runId) return;
        const opts = optionsRef.current;
        const active = opts.streams.filter((s) => !doneRef.current.has(s));
        if (active.length === 0) return;
        let target = Infinity;
        for (const stream of active) {
          target = Math.min(target, (loadedMaxRef.current.get(stream) ?? 0) + 1);
        }
        setLoadingMore(true);
        await enqueue(() => ensureContiguous(runId, ac, target));
        if (runIdRef.current !== runId) return;
        setLoadingMore(false);
      }
    },
    [ensureContiguous],
  );

  useEffect(() => {
    if (boundKey == null) {
      acRef.current?.abort();
      acRef.current = null;
      return;
    }
    const runId = ++runIdRef.current;
    failedRunRef.current = null;
    bgRunRef.current = null;
    inflightRef.current = null;
    cachesRef.current = new Map();
    loadedMaxRef.current = new Map();
    doneRef.current = new Map();
    pageMetaRef.current = new Map();
    overlayRef.current = new Map();
    const ac = new AbortController();
    acRef.current = ac;
    void enqueue(async () => {
      if (runIdRef.current !== runId) return;
      await ensureContiguous(runId, ac, 1);
      if (runIdRef.current !== runId || ac.signal.aborted) return;
      setInitialLoading(false);
      if (optionsRef.current.background) void runBackground(runId, ac);
    });
    return () => {
      ac.abort();
    };
  }, [boundKey, ensureContiguous, runBackground]);

  const ensureDisplayPage = useCallback(
    (displayPage: number) => {
      const ac = acRef.current;
      if (!ac) return;
      const runId = runIdRef.current;
      const opts = optionsRef.current;
      const target = serverPageForDisplayPage(
        displayPage,
        opts.displayPageSize,
        opts.serverPerPage,
      );
      const needMore = opts.streams.some(
        (s) =>
          !doneRef.current.has(s) && (loadedMaxRef.current.get(s) ?? 0) < target,
      );
      if (!needMore) return;
      const inflight = inflightRef.current;
      if (inflight && inflight.runId === runId && inflight.target >= target) {
        return;
      }
      setLoadingMore(true);
      void enqueue(async () => {
        await ensureContiguous(runId, ac, target);
        if (runIdRef.current === runId) setLoadingMore(false);
      });
    },
    [ensureContiguous],
  );

  const ensureAll = useCallback(() => {
    const ac = acRef.current;
    if (!ac) return;
    const runId = runIdRef.current;
    const opts = optionsRef.current;
    const needMore = opts.streams.some((s) => !doneRef.current.has(s));
    if (!needMore) return;
    setLoadingMore(true);
    void enqueue(async () => {
      await ensureContiguous(runId, ac, opts.maxServerPages);
      if (runIdRef.current === runId) setLoadingMore(false);
    });
  }, [ensureContiguous]);

  const reload = useCallback(() => {
    setReloadVersion((v) => v + 1);
  }, []);

  const updateItems = useCallback((updater: (prev: T[]) => T[]) => {
    setItems((prev) => {
      const next = updater(prev);
      if (next !== prev) {
        const keyOf = optionsRef.current.getKey;
        const prevByKey = new Map(prev.map((i) => [keyOf(i), i]));
        for (const item of next) {
          const key = keyOf(item);
          if (prevByKey.get(key) !== item) overlayRef.current.set(key, item);
        }
      }
      return next;
    });
  }, []);

  return {
    items,
    exhausted,
    capped,
    initialLoading,
    loadingMore,
    error,
    updateItems,
    ensureDisplayPage,
    ensureAll,
    reload,
  };
}
