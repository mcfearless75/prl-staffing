/**
 * Microsoft Graph transport for outbound email.
 *
 * PRL already own Microsoft 365, so sending from the real prlsitesolutions.co.uk
 * mailbox means SPF/DKIM/DMARC are already correct and outbound mail lands in that
 * mailbox's Sent Items — a human-readable record that no third-party sender gives us.
 *
 * App-only (client credentials) auth. Requires an Entra app registration with the
 * Mail.Send APPLICATION permission and admin consent. That permission is tenant-wide
 * "send as anyone" by default, so it should be scoped with an Exchange Application
 * Access Policy limiting it to the sending mailbox.
 */

export interface GraphSendResult {
  success: boolean;
  error?: string;
}

export interface GraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  sender: string;
}

/** Graph is used only when every credential is present; otherwise we stay on Resend. */
export function getGraphConfig(): GraphConfig | null {
  const tenantId = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;
  const sender = process.env.MAIL_SENDER || extractAddress(process.env.EMAIL_FROM);

  if (!tenantId || !clientId || !clientSecret || !sender) return null;
  return { tenantId, clientId, clientSecret, sender };
}

/** "PRL Site Solutions <infotech@prl.co.uk>" -> "infotech@prl.co.uk" */
export function extractAddress(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const angled = value.match(/<([^>]+)>/);
  return (angled ? angled[1] : value).trim() || undefined;
}

/** "PRL Site Solutions <infotech@prl.co.uk>" -> "PRL Site Solutions" */
function extractDisplayName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const name = value.split("<")[0].trim();
  return name || undefined;
}

// Tokens last ~1 hour. Cache across invocations so a burst of sends (e.g. the
// compliance chase agent looping contractors) doesn't re-authenticate every time.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(config: GraphConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error_description?: string; error?: string }
    | null;

  if (!res.ok || !json?.access_token) {
    const detail = json?.error_description || json?.error || `HTTP ${res.status}`;
    throw new Error(`Graph token request failed: ${detail}`);
  }

  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

/** Clears the cached token. Exposed for the connection test so it proves fresh creds. */
export function resetGraphToken() {
  cachedToken = null;
}

/**
 * Graph sendMail returns 202 Accepted with an empty body — there is no message id to
 * capture, unlike Resend. Callers should not expect a provider id from this transport.
 */
export async function sendViaGraph(
  config: GraphConfig,
  opts: {
    to: string[];
    subject: string;
    html: string;
    replyTo?: string;
    from?: string;
  }
): Promise<GraphSendResult> {
  try {
    const token = await getAccessToken(config);

    const message: Record<string, unknown> = {
      subject: opts.subject,
      body: { contentType: "HTML", content: opts.html },
      toRecipients: opts.to.map((address) => ({ emailAddress: { address } })),
    };

    const displayName = extractDisplayName(opts.from);
    if (displayName) {
      message.from = {
        emailAddress: { address: config.sender, name: displayName },
      };
    }

    if (opts.replyTo) {
      message.replyTo = [{ emailAddress: { address: opts.replyTo } }];
    }

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.sender)}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, saveToSentItems: true }),
      }
    );

    if (res.status === 202 || res.ok) return { success: true };

    const detail = await res.text().catch(() => "");
    let message_ = `Graph sendMail failed: HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(detail) as { error?: { code?: string; message?: string } };
      if (parsed.error?.message) {
        message_ = `Graph sendMail failed (${parsed.error.code ?? res.status}): ${parsed.error.message}`;
      }
    } catch {
      if (detail) message_ += ` — ${detail.slice(0, 300)}`;
    }
    return { success: false, error: message_ };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
