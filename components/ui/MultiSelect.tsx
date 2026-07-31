"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./MultiSelect.module.css";

type MultiSelectProps = {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
};

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function openPanel() {
    if (disabled) return;
    setDraft([...value]);
    setOpen(true);
  }

  function togglePanel() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    openPanel();
  }

  function toggleOption(option: string) {
    if (disabled) return;
    setDraft((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option],
    );
  }

  function confirm() {
    if (disabled) return;
    if (!sameSet(draft, value)) {
      onChange([...draft]);
    }
    setOpen(false);
  }

  function reset() {
    if (disabled) return;
    setDraft([]);
  }

  const summary =
    value.length === 0
      ? "全部"
      : value.length <= 2
        ? value.join(", ")
        : `已选 ${value.length} 项`;

  return (
    <div className={styles.root} ref={rootRef}>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={togglePanel}
      >
        <span className={styles.triggerText}>{summary}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      <div
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        hidden={!open}
      >
        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          className={styles.options}
        >
          {options.length === 0 ? (
            <div className={styles.emptyOptions}>暂无选项</div>
          ) : (
            options.map((option) => {
              const checked = draft.includes(option);
              return (
                <label key={option} className={styles.option}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleOption(option)}
                  />
                  <span>{option}</span>
                </label>
              );
            })
          )}
        </div>
        <div className={styles.footer}>
          <Button variant="secondary" disabled={disabled} onClick={reset}>
            重置
          </Button>
          <Button variant="primary" disabled={disabled} onClick={confirm}>
            确认
          </Button>
        </div>
      </div>
    </div>
  );
}
