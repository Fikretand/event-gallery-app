import { redirect } from "next/navigation";

export default async function AdminLocaleRedirect({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const target = path?.length ? `/admin/${path.join("/")}` : "/admin";
  redirect(target);
}
