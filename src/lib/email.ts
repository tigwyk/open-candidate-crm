import { ServerClient } from "postmark";

const client = process.env.POSTMARK_SERVER_TOKEN
  ? new ServerClient(process.env.POSTMARK_SERVER_TOKEN)
  : null;

// campaignName/invitedByName are free-text fields a user chose at signup —
// never trust them as safe HTML. Also strip CR/LF so they can't smuggle
// header-like content into the Subject line.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripNewlines(input: string): string {
  return input.replace(/[\r\n]+/g, " ");
}

export async function sendInviteEmail(opts: {
  to: string;
  campaignName: string;
  invitedByName: string;
  token: string;
  inviteId: string;
}): Promise<{ messageId: string } | undefined> {
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${opts.token}`;
  const invitedByName = stripNewlines(opts.invitedByName);
  const campaignName = stripNewlines(opts.campaignName);
  const subject = `${invitedByName} invited you to join ${campaignName} on CampaignGround`;

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
      <p>${escapeHtml(invitedByName)} invited you to join <strong>${escapeHtml(campaignName)}</strong> on CampaignGround.</p>
      <p><a href="${inviteUrl}">Accept the invite</a></p>
      <p>This link expires in 7 days.</p>
    `,
    TextBody: `${invitedByName} invited you to join ${campaignName} on CampaignGround.\n\nAccept the invite: ${inviteUrl}\n\nThis link expires in 7 days.`,
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
