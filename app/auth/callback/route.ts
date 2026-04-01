import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSchoolEmail } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const linkProfile = searchParams.get("linkProfile");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Server-side school email validation
      if (user && !isSchoolEmail(user.email ?? "")) {
        await supabase.auth.admin.deleteUser(user.id);
        return NextResponse.redirect(`${origin}/?auth_error=invalid_email`);
      }

      // Link roommate profile if requested
      if (linkProfile && user) {
        await supabase
          .from("roommate_profiles")
          .update({ user_id: user.id })
          .eq("id", linkProfile)
          .is("user_id", null);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect home
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
