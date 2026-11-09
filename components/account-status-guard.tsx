"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AccountStatusGuard() {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    async function verifyAccountStatus() {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active || authError || !user) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_suspended")
        .eq("id", user.id)
        .maybeSingle();

      // Fail closed for writes at the database layer; do not sign users out
      // based on a transient profile-read failure.
      if (!active || profileError || !profile?.is_suspended) return;

      await supabase.auth.signOut({ scope: "local" });
      if (active) {
        window.location.replace("/login?error=suspended");
      }
    }

    void verifyAccountStatus();

    return () => {
      active = false;
    };
  }, [pathname]);

  return null;
}
