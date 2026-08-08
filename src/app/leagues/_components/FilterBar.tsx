"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  BUYIN_OPTIONS,
  SORT_OPTIONS,
  STATUS_LABEL,
  STATUS_ORDER,
  TIER_LABEL,
  TIER_ORDER,
} from "@/lib/leagues";

/**
 * League browse filters. Each control writes its value into the URL query, and
 * the server component re-renders the filtered grid. Works as plain navigation
 * (no client data fetching); the search box submits on enter.
 */
export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");

  function commit(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "all" || value === "any") next.delete(key);
    else next.set(key, value);
    commit(next);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (search.trim()) next.set("q", search.trim());
    else next.delete("q");
    commit(next);
  }

  const hasFilters = [...params.keys()].some((k) =>
    ["tier", "status", "buyin", "q", "sort"].includes(k),
  );

  return (
    <div className="lg-filters">
      <form className="lg-search" onSubmit={onSearch} role="search">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leagues…"
          aria-label="Search leagues"
        />
      </form>

      <label className="lg-select">
        <span>Tier</span>
        <select
          value={params.get("tier") ?? "all"}
          onChange={(e) => setParam("tier", e.target.value)}
        >
          <option value="all">All tiers</option>
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="lg-select">
        <span>Buy-in</span>
        <select
          value={params.get("buyin") ?? "any"}
          onChange={(e) => setParam("buyin", e.target.value)}
        >
          {BUYIN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="lg-select">
        <span>Status</span>
        <select
          value={params.get("status") ?? "all"}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="all">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="lg-select">
        <span>Sort</span>
        <select
          value={params.get("sort") ?? "prize"}
          onChange={(e) => setParam("sort", e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {hasFilters && (
        <button
          type="button"
          className="btn btn-ghost lg-clear"
          onClick={() => {
            setSearch("");
            router.push(pathname);
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
