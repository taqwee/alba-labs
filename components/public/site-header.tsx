import Link from "next/link";
import { SITE_NAME } from "@/lib/env";
import { MobileNav } from "./mobile-nav";
import { createServerSupabase } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button"; // Imported the SignOut button

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  // Fetch the current user session securely on the server
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // Extract the name from Google login, fallback to email prefix, or default to "User"
  const displayName = user?.user_metadata?.full_name 
    || user?.email?.split('@')[0] 
    || "User";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between px-4 sm:px-6">
        
        {/* Logo */}
        <Link href="/" className="flex items-center h-12" aria-label={`${SITE_NAME} home`}>
          <img 
            src="/alba-logo_6.svg" 
            alt="Alba Labs" 
            className="h-10 w-auto scale-[4] origin-left" 
          />
        </Link>
        
        {/* Desktop Navigation */}
        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-muted hover:text-text">
              {n.label}
            </Link>
          ))}
        </nav>
        
        {/* Desktop Auth / CTA Buttons */}
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              {/* User Profile & Sign Out Group (No Dashboard Button) */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-text">
                  <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {displayName}
                </div>
                
                {/* Subtle visual separator */}
                <span className="text-border text-xs">|</span>
                
                {/* Sign Out text link */}
                <SignOutButton className="text-sm font-medium text-muted hover:text-text transition-colors" />
              </div>
            </>
          ) : (
            <>
              {/* Logged Out Buttons */}
              <Link href="/login" className="btn-ghost btn-sm">login</Link>
              <Link href="/contact" className="btn-primary btn-sm">Start a project</Link>
            </>
          )}
        </div>
        
        {/* Mobile Navigation Menu */}
        <MobileNav items={NAV} />
      </div>
    </header>
  );
}