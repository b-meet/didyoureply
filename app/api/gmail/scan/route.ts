import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import authOptions from "../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions as any);

  if (!session?.accessToken || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: session.accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  const threadsRes = await gmail.users.threads.list({
    userId: "me",
    q: "-from:me",
    maxResults: 20,
  });

  const threads = threadsRes.data.threads ?? [];

  let inserted = 0;

  for (const t of threads) {
    const thread = await gmail.users.threads.get({
      userId: "me",
      id: t.id!,
      format: "metadata",
      metadataHeaders: ["From", "Subject"],
    });

    const msg = thread.data.messages?.at(-1);
    if (!msg) continue;

    const headers = msg.payload?.headers ?? [];
    const subject = headers.find(h => h.name === "Subject")?.value ?? "";
    const from = headers.find(h => h.name === "From")?.value ?? "";

    const lastSenderIsUser = from.includes(session.user.email!);
    const isUnread = msg.labelIds?.includes("UNREAD") ?? false;

    await supabaseAdmin.from("email_threads").upsert(
      {
        user_id: session.user.id,
        gmail_thread_id: t.id,
        subject,
        from_email: from,
        last_message_at: new Date(
          Number(msg.internalDate)
        ).toISOString(),
        last_sender_is_user: lastSenderIsUser,
        is_unread: isUnread,
        is_replied: lastSenderIsUser,
        is_ignored: false,
        detected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,gmail_thread_id" }
    );

    inserted++;
  }

  return NextResponse.json({ scanned: threads.length, inserted });
}
