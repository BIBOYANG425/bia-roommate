"use client";

// Admin user list — search by name / member_id, paginated.

import { useEffect, useState } from "react";
import Link from "next/link";
import { relativeTime } from "@/lib/utils";

interface AdminUserRow {
  id: string;
  name: string | null;
  member_id: string | null;
  user_id: string | null;
  email: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      qs.set("limit", String(pageSize));
      qs.set("offset", String(page * pageSize));
      const res = await fetch(`/api/admin/users?${qs.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (res.ok) {
        const data = (await res.json()) as {
          students: AdminUserRow[];
          total: number;
        };
        setUsers(data.students);
        setTotal(data.total);
      }
      setLoading(false);
    })();
    return () => controller.abort();
  }, [search, page]);

  return (
    <>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-5 border-b-[3px] border-[var(--black)] pb-2">
        <h1
          className="font-display text-[32px]"
          style={{ color: "var(--black)" }}
        >
          USERS
        </h1>
        <p className="text-xs" style={{ color: "var(--mid)" }}>
          {total} 个用户
        </p>
      </div>

      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="搜 姓名 / MEMBER ID"
          className="brutal-input w-full"
        />
      </div>

      {loading ? (
        <p
          className="font-display text-sm tracking-[0.2em]"
          style={{ color: "var(--mid)" }}
        >
          LOADING...
        </p>
      ) : users.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--mid)" }}>
          没有符合条件的用户
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr
                className="font-display text-[10px] tracking-wider"
                style={{ color: "var(--mid)" }}
              >
                <th className="text-left py-2 pr-3">NAME</th>
                <th className="text-left py-2 pr-3">MEMBER</th>
                <th className="text-left py-2 pr-3">EMAIL</th>
                <th className="text-left py-2 pr-3">JOINED</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t-[2px] border-[var(--beige)] hover:bg-[var(--beige)]"
                >
                  <td className="py-2 pr-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-display underline"
                      style={{ color: "var(--black)" }}
                    >
                      {u.name ?? "—"}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className="font-display text-xs tracking-wider"
                      style={{ color: "var(--black)" }}
                    >
                      {u.member_id ?? "—"}
                    </span>
                  </td>
                  <td
                    className="py-2 pr-3 text-xs max-w-[260px] truncate"
                    style={{ color: "var(--mid)" }}
                  >
                    {u.email ?? "—"}
                  </td>
                  <td
                    className="py-2 pr-3 text-xs"
                    style={{ color: "var(--mid)" }}
                  >
                    {relativeTime(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > pageSize && (
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="brutal-btn"
            style={
              page === 0
                ? { background: "var(--cream)", color: "var(--mid)" }
                : { background: "var(--cardinal)", color: "white" }
            }
          >
            ← PREV
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * pageSize >= total}
            className="brutal-btn"
            style={
              (page + 1) * pageSize >= total
                ? { background: "var(--cream)", color: "var(--mid)" }
                : { background: "var(--cardinal)", color: "white" }
            }
          >
            NEXT →
          </button>
          <span
            className="font-display text-xs tracking-wider self-center ml-2"
            style={{ color: "var(--mid)" }}
          >
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} / {total}
          </span>
        </div>
      )}
    </>
  );
}
