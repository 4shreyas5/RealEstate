import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Confirms the signed-in Supabase user is also a row in `admin_users`.
 * Being authenticated is not enough — only staff we've explicitly added
 * as an AdminUser may reach the admin. Anyone else is signed out.
 */
export async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const adminUser = await prisma.adminUser.findUnique({ where: { id: user.id } });

  if (!adminUser) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=" + encodeURIComponent("This account isn't an admin user."));
  }

  return adminUser;
}
