import {
    List, Receipt, CreditCard, ShoppingBag, Tag, BookMarked, type LucideIcon,
} from "lucide-react";



/**
 * The admin navigation, in one place. Both the sidebar (AdminLayout) and the
 * auto generated Admin Sitemap read from this, so adding a page here shows it in
 * both without touching anything else. Descriptions are used by the sitemap.
 */

export interface AdminNavItem {
    name: string;
    path: string;
    icon: LucideIcon;
    description?: string;
}

export interface AdminNavGroup {
    id: string;
    label: string;
    icon: LucideIcon;
    items: AdminNavItem[];
}

// Note: the Dashboard / Overview landing (/admin) is rendered as a standalone
// link at the top of the sidebar, so it is intentionally NOT a group here.
// Yatri Cloud Resources: only the admin pages that exist on this site.
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
    {
        id: "catalog",
        label: "Library",
        icon: ShoppingBag,
        items: [
            { name: "Exam dumps", path: "/admin/exam-dumps", icon: List, description: "Manage exam dump listings." },
            { name: "Resources", path: "/admin/resources", icon: BookMarked, description: "Manage free and paid learning resources (exam guides, practice tests, etc.)." },
        ],
    },
    {
        id: "payments",
        label: "Payments",
        icon: CreditCard,
        items: [
            { name: "Revenue", path: "/admin/payments", icon: Receipt, description: "Every receipt and revenue in one place." },
            { name: "Coupons", path: "/admin/coupons", icon: Tag, description: "Discount codes for exam dumps and resources." },
        ],
    },
];
