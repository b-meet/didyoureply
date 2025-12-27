import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <div>Not authenticated</div>;
  }

  const { data: emails } = await supabaseAdmin
    .from("email_threads")
    .select("*")
    .eq("user_id", session.user?.email)
    .eq("is_replied", false)
    .eq("is_ignored", false)
    .order("detected_at", { ascending: false });

  return (
    <div>
      <h1>Did You Reply?</h1>

      {emails?.length === 0 && <p>No pending replies 🎉</p>}

      {emails?.map((email) => (
        <div key={email.id}>
          <strong>{email.subject}</strong>
          <div>{email.from_email}</div>
        </div>
      ))}
    </div>
  );
}
