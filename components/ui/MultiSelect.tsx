"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./MultiSelect.module.css";

type MultiSelectProps = {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
};

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
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

  function toggleOption(option: string) {
    if (disabled) return;
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
      return;
    }
    onChange([...value, option]);
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
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.triggerText}>{summary}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      <div
        id={listId}
        role="listbox"
        aria-multiselectable
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
      >
        {options.map((option) => {
          const checked = value.includes(option);
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
        })}
      </div>
    </div>
  );
}
