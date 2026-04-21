"use client";

// Admin user detail — student header + tabs for parcels and course reviews.
// Read-only for v1; actions deep-link into /admin/shipping/parcels/[id].

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ParcelStatusPill from "@/components/ParcelStatusPill";
import {
  PARCEL_STATUS_META,
  SHIPPING_METHOD_META,
  type Parcel,
  type ParcelStatus,
} from "@/lib/types";
import { relativeTime } from "@/lib/utils";

interface Student {
  id: string;
  name: string | null;
  member_id: string | null;
  user_id: string | null;
  major: string | null;
  year: string | null;
  created_at: string;
}

interface Review {
  id: string;
  dept: string;
  course_number: string;
  professor: string | null;
  term: string;
  difficulty: number;
  workload: number;
  grading: number;
  comment: string;
  created_at: string;
}

interface UserDetail {
  student: Student;
  email: string | null;
  parcels: Parcel[];
  parcelsByStatus: Record<ParcelStatus, number>;
  reviews: Review[] | null;
  reviewsUnavailable: boolean;
}

type Tab = "parcels" | "reviews";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("parcels");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${id}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(res.status === 404 ? "用户不存在" : "加载失败");
        setLoading(false);
        return;
      }
      setData((await res.json()) as UserDetail);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <p
        className="font-display text-sm tracking-[0.2em]"
        style={{ color: "var(--mid)" }}
      >
        LOADING...
      </p>
    );
  }
  if (error || !data) {
    return (
      <p className="text-sm" style={{ color: "var(--cardinal)" }}>
        {error ?? "未找到"}
      </p>
    );
  }

  const { student, email, parcels, parcelsByStatus, reviews, reviewsUnavailable } =
    data;
  const parcelsTotal = parcels.length;
  const reviewsCount = reviews?.length ?? 0;

  return (
    <>
      <Link
        href="/admin/users"
        className="font-display text-[11px] tracking-[0.2em]"
        style={{ color: "var(--mid)" }}
      >
        ← USERS
      </Link>

      {/* Header card */}
      <section
        className="brutal-container p-5 mt-2 mb-6"
        style={{ background: "var(--beige)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="font-display text-[28px] leading-tight"
              style={{ color: "var(--black)" }}
            >
              {student.name ?? "(未设置名字)"}
            </h1>
            <div
              className="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1"
              style={{ color: "var(--mid)" }}
            >
              {student.member_id && (
                <span className="font-display tracking-wider">
                  {student.member_id}
                </span>
              )}
              {email && <span>{email}</span>}
              {student.major && <span>{student.major}</span>}
              {student.year && <span>{student.year}</span>}
              <span>· 注册 {relativeTime(student.created_at)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 flex-wrap">
        <TabButton active={tab === "parcels"} onClick={() => setTab("parcels")}>
          包裹 · {parcelsTotal}
        </TabButton>
        <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
          课评 · {reviewsUnavailable ? "—" : reviewsCount}
        </TabButton>
      </div>

      {tab === "parcels" &&
        (parcelsTotal === 0 ? (
          <p className="text-sm" style={{ color: "var(--mid)" }}>
            这个用户还没有包裹
          </p>
        ) : (
          <>
            {/* Status breakdown */}
            <div
              className="brutal-container p-3 mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs"
              style={{ background: "var(--cream)" }}
            >
              {(Object.keys(parcelsByStatus) as ParcelStatus[]).map((s) =>
                parcelsByStatus[s] > 0 ? (
                  <span key={s}>
                    <span
                      className="font-display tracking-wider"
                      style={{ color: "var(--cardinal)" }}
                    >
                      {PARCEL_STATUS_META[s].label}
                    </span>
                    <span className="ml-1" style={{ color: "var(--black)" }}>
                      {parcelsByStatus[s]}
                    </span>
                  </span>
                ) : null,
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr
                    className="font-display text-[10px] tracking-wider"
                    style={{ color: "var(--mid)" }}
                  >
                    <th className="text-left py-2 pr-3">MEMBER</th>
                    <th className="text-left py-2 pr-3">DESCRIPTION</th>
                    <th className="text-left py-2 pr-3">STATUS</th>
                    <th className="text-left py-2 pr-3">方式</th>
                    <th className="text-left py-2 pr-3">CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {parcels.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t-[2px] border-[var(--beige)] hover:bg-[var(--beige)]"
                    >
                      <td className="py-2 pr-3">
                        <Link
                          href={`/admin/shipping/parcels/${p.id}`}
                          className="font-display text-xs tracking-wider underline"
                          style={{ color: "var(--black)" }}
                        >
                          {p.member_id}
                        </Link>
                      </td>
                      <td
                        className="py-2 pr-3 max-w-[260px] truncate"
                        style={{ color: "var(--black)" }}
                      >
                        {p.description}
                      </td>
                      <td className="py-2 pr-3">
                        <ParcelStatusPill status={p.status} size="sm" />
                      </td>
                      <td
                        className="py-2 pr-3 text-xs"
                        style={{ color: "var(--mid)" }}
                      >
                        {p.shipping_method
                          ? SHIPPING_METHOD_META[p.shipping_method].icon
                          : "—"}
                      </td>
                      <td
                        className="py-2 pr-3 text-xs"
                        style={{ color: "var(--mid)" }}
                      >
                        {relativeTime(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}

      {tab === "reviews" &&
        (reviewsUnavailable ? (
          <p className="text-sm" style={{ color: "var(--mid)" }}>
            course_reviews 表还未部署到这个库。运行 course_rating migration
            后此处会自动显示。
          </p>
        ) : reviewsCount === 0 ? (
          <p className="text-sm" style={{ color: "var(--mid)" }}>
            这个用户还没有发过课评
          </p>
        ) : (
          <div className="space-y-3">
            {reviews!.map((r) => (
              <div
                key={r.id}
                className="brutal-container p-4"
                style={{ background: "var(--cream)" }}
              >
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <h3
                    className="font-display text-base tracking-[0.1em]"
                    style={{ color: "var(--black)" }}
                  >
                    {r.dept} {r.course_number}
                    {r.professor && (
                      <span
                        className="text-xs ml-2"
                        style={{ color: "var(--mid)" }}
                      >
                        · {r.professor}
                      </span>
                    )}
                  </h3>
                  <span
                    className="font-display text-[10px] tracking-wider"
                    style={{ color: "var(--mid)" }}
                  >
                    {r.term} · {relativeTime(r.created_at)}
                  </span>
                </div>
                <div
                  className="flex gap-3 text-[11px] mt-1"
                  style={{ color: "var(--mid)" }}
                >
                  <span>难度 {r.difficulty}/5</span>
                  <span>工作量 {r.workload}/5</span>
                  <span>给分 {r.grading}/5</span>
                </div>
                <p
                  className="text-sm mt-2 whitespace-pre-wrap"
                  style={{ color: "var(--black)" }}
                >
                  {r.comment}
                </p>
              </div>
            ))}
          </div>
        ))}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-display text-sm tracking-wider px-5 py-2 border-[3px] border-[var(--black)] -mr-[3px] first:mr-0 transition-colors whitespace-nowrap"
      style={
        active
          ? { background: "var(--cardinal)", color: "white" }
          : { background: "var(--cream)", color: "var(--mid)" }
      }
    >
      {children}
    </button>
  );
}
