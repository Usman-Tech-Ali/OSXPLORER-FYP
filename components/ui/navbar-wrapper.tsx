"use client";
import { Navbar } from "./navbar";
import { usePathname } from "next/navigation";

function shouldShowNavbar(path: string) {
  // Hide navbar on games page and other excluded routes
  if (/^\/modules\/[^/]+\/games\/[^/]+/.test(path)) return false;
  return !(
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.match(/^\/mini-quest\/[^/]+\/quiz(?!.*\/result)/) ||
    (path.match(/^\/modules\/[^/]+\/mini-quest\/[^/]+\/quiz\//) && !path.match(/\/result\//))
  );
}

export function NavbarWrapper() {
  const pathname = usePathname();
  if (!shouldShowNavbar(pathname)) return null;
  return <Navbar />;
}
