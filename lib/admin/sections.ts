// Admin dashboard section registry. The AdminShell renders nav from this
// array. Domain-specific sections (shipping, users) live here; generic
// shell/components live in components/admin/*. When extracting the shell
// into a shared module, this file stays with the project.

export interface AdminSection {
  href: string;
  label: string;
  /** Emoji / unicode character rendered alongside the label. */
  icon: string;
  /** Optional short hint shown under the label on the dashboard home. */
  hint?: string;
  /** Logical grouping for the sidebar. */
  group: "shipping" | "users" | "other";
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/shipping/routes",
    label: "Routes",
    icon: "🚢",
    hint: "Edit price, schedule, cutoff notes",
    group: "shipping",
  },
  {
    href: "/admin/shipping/contacts",
    label: "Contacts",
    icon: "💬",
    hint: "WeChat groups, email, George bot",
    group: "shipping",
  },
  {
    href: "/admin/shipping/parcels",
    label: "Parcels",
    icon: "📦",
    hint: "Status, weight, attach to shipment",
    group: "shipping",
  },
  {
    href: "/admin/shipping/shipments",
    label: "Shipments",
    icon: "✈️",
    hint: "Create batches, open pickup windows",
    group: "shipping",
  },
  {
    href: "/admin/shipping/pack-requests",
    label: "Pack Requests",
    icon: "📬",
    hint: "用户发起的拼单打包申请（常规流程）",
    group: "shipping",
  },
  {
    href: "/admin/shipping/requests",
    label: "Express Requests",
    icon: "⚡",
    hint: "专属急件申请（加急 · 1v1）",
    group: "shipping",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "👤",
    hint: "Lookup parcels + course reviews",
    group: "users",
  },
];

export const ADMIN_GROUPS: Record<AdminSection["group"], string> = {
  shipping: "SHIPPING / 集运",
  users: "USERS / 用户",
  other: "OTHER",
};
