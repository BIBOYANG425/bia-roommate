// Single source of truth for the footer's secondary links and social handles.
// Consumed by SiteFooter, MarketingShell, and the home page's scroll-reveal
// footer so the three renderings can never drift apart.

export type SecondaryLink = { en: string; zh: string; href: string };

export const SECONDARY_LINKS: SecondaryLink[] = [
  { en: "Team", zh: "团队", href: "/team" },
  { en: "Sponsors", zh: "合作伙伴", href: "/sponsors" },
  { en: "Contact", zh: "联系我们", href: "/contact" },
  { en: "FAQ", zh: "常见问题", href: "/faq" },
  { en: "Privacy", zh: "隐私政策", href: "/privacy" },
  { en: "Terms", zh: "服务条款", href: "/terms" },
];

export type SocialLink = { label: string; href: string };

export const SOCIAL_LINKS: SocialLink[] = [
  { label: "Insta", href: "https://www.instagram.com/bia_usc/" },
  { label: "小红书", href: "https://xhslink.com/m/2t4EzpZAKAc" },
];
