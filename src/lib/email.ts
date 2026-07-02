import { ServerClient } from "postmark";

const client = process.env.POSTMARK_SERVER_TOKEN
  ? new ServerClient(process.env.POSTMARK_SERVER_TOKEN)
  : null;

export async function sendInviteEmail(opts: {
  to: string;
  campaignName: string;
  invitedByName: string;
  token: string;
  inviteId: string;
}): Promise<{ messageId: string } | undefined> {
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${opts.token}`;
  const subject = `${opts.invitedByName} invited you to join ${opts.campaignName} on CampaignGround`;

  if (!client) {
    // Dev convenience: no POSTMARK_SERVER_TOKEN configured. Log instead of
    // failing the invite-creation request, so local development isn't
    // blocked on having a real Postmark account/sender signature. Loud on
    // purpose — this should never be silent, especially in production.
    const prefix = process.env.NODE_ENV === "production" ? "[email] ERROR" : "[email] dev";
    console.warn(`${prefix}: POSTMARK_SERVER_TOKEN not set — invite link for ${opts.to}: ${inviteUrl}`);
    return undefined;
  }

  const response = await client.sendEmail({
    From: process.env.EMAIL_FROM ?? "CampaignGround <invites@yourdomain.com>",
    To: opts.to,
    Subject: subject,
    HtmlBody: `
      <p>${opts.invitedByName} invited you to join <strong>${opts.campaignName}</strong> on CampaignGround.</p>
      <p><a href="${inviteUrl}">Accept the invite</a></p>
      <p>This link expires in 7 days.</p>
    `,
    TextBody: `${opts.invitedByName} invited you to join ${opts.campaignName} on CampaignGround.\n\nAccept the invite: ${inviteUrl}\n\nThis link expires in 7 days.`,
    MessageStream: "outbound",
    Metadata: { inviteId: opts.inviteId },
  });

  if (response.ErrorCode !== 0) {
    console.error("sendInviteEmail failed:", response.Message);
    throw new Error("Failed to send invite email");
  }

  return { messageId: response.MessageID };
}

// Un-suppresses an address Postmark deactivated after a hard bounce, so a
// resend to that address actually has a chance of delivering.
export async function reactivateBounce(bounceId: number) {
  if (!client) {
    throw new Error("POSTMARK_SERVER_TOKEN not configured");
  }
  return client.activateBounce(bounceId);
}
