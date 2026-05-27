// /api/admin/users/[id]
// GET — full student + aggregate counts (parcels by status, course_reviews)
// + email from auth.users + recent parcels / reviews lists.

import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/api/authed-handler";
import type { ParcelStatus } from "@/lib/types";

type Params = { id: string };

export const GET = adminHandler<undefined, Params>({
  handler: async ({ adminSupabase, params }) => {
    const { id } = params;

    const { data: student, error } = await adminSupabase
      .from("students")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!student) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let email: string | null = null;
    if (student.user_id) {
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(
        student.user_id,
      );
      email = authUser.user?.email ?? null;
    }

    const parcelsQuery = student.user_id
      ? adminSupabase
          .from("parcels")
          .select("*")
          .eq("user_id", student.user_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });

    // course_reviews may or may not be deployed; catch missing-table softly.
    const reviewsQuery = student.user_id
      ? adminSupabase
          .from("course_reviews")
          .select("*")
          .eq("user_id", student.user_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });

    const [parcelsRes, reviewsRes] = await Promise.all([
      parcelsQuery,
      reviewsQuery,
    ]);

    const parcels = parcelsRes.data ?? [];
    const parcelsByStatus = {} as Record<ParcelStatus, number>;
    for (const p of parcels as { status: ParcelStatus }[]) {
      parcelsByStatus[p.status] = (parcelsByStatus[p.status] ?? 0) + 1;
    }

    const reviews = reviewsRes.error ? null : reviewsRes.data ?? [];
    const reviewsUnavailable =
      reviewsRes.error?.message.includes("does not exist") ?? false;

    return NextResponse.json({
      student,
      email,
      parcels,
      parcelsByStatus,
      reviews,
      reviewsUnavailable,
    });
  },
});
