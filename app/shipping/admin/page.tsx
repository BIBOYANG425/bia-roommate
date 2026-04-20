// Moved to /admin/shipping/routes (+ contacts on sibling route).
// Keep this path alive as a redirect so any existing bookmarks still work.

import { redirect } from "next/navigation";

export default function LegacyShippingAdminRedirect() {
  redirect("/admin/shipping/routes");
}
