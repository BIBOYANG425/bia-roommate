// 集运 admin moved to the dedicated admin app (admin.uscbia.com) in Phase 3.
// Keep this path alive as a redirect so any existing bookmarks still work.

import { redirect } from "next/navigation";

export default function LegacyShippingAdminRedirect() {
  redirect("https://admin.uscbia.com/admin/shipping/routes");
}
