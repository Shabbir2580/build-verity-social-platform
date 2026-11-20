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

      const { data: isSuspended, error: suspensionError } = await supabase.rpc("my_is_suspended");

      // Database policies independently block suspended accounts. Keep the
      // client guard conservative: only sign out on a confirmed true result.
      if (!active || suspensionError || isSuspended !== true) return;

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
