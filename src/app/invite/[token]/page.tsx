import { auth } from "~/server/auth";
import { InvitationClient } from "./invitation-client";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  return <InvitationClient token={token} signedIn={Boolean(session?.user)} />;
}
