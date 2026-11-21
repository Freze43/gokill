import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await ensureSeeded();
  const session = await getSession();
  if (session) redirect("/");
  const { next } = await searchParams;

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <LoginForm next={next} />
    </div>
  );
}
