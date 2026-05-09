"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type SidebarNavLinkProps = {
  href: string;
  baseClass: string;
  activeClass: string;
  inactiveClass: string;
  /* Si true, active aussi quand pathname commence par href + "/".
     False = match exact uniquement. */
  matchPrefix?: boolean;
  children: React.ReactNode;
  ariaDisabled?: boolean;
};

/* Petit wrapper client qui ajoute l'active state au Link de la sidebar.
   Permet de garder layout.tsx en server component (pour les fetch auth/
   profile/notifications counts) tout en ayant le highlight de la route
   courante. */
export function SidebarNavLink({
  href,
  baseClass,
  activeClass,
  inactiveClass,
  matchPrefix = true,
  children,
  ariaDisabled,
}: SidebarNavLinkProps) {
  const pathname = usePathname() ?? "";
  const active =
    pathname === href ||
    (matchPrefix && href !== "/" && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href}
      aria-disabled={ariaDisabled || undefined}
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      className={cn(baseClass, active ? activeClass : inactiveClass)}
    >
      {children}
    </Link>
  );
}
