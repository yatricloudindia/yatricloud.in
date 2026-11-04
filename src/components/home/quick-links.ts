/**
 * "Where do you want to go, Yatris?" shortcuts.
 * Shared by the Navbar "Explore" menu (desktop dropdown + mobile menu) and
 * the legacy QuickAccessSection. Same labels and routes as before.
 */
export type QuickLink = { to: string; label: string };

export const QUICK_LINKS: QuickLink[] = [
  { to: "/requestvoucher", label: "Discounted vouchers" },
  { to: "/training", label: "Live training" },
  { to: "/events", label: "Events" },
  { to: "/paths", label: "Certification paths" },
  { to: "https://draw.yatricloud.com/", label: "Yatri Draw" },
  { to: "https://school.yatricloud.com/", label: "Yatri School" },
];
