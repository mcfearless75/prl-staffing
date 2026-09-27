/**
 * Sends ONE test email through PRISM's real Microsoft Graph path, from a chosen
 * mailbox, to check it works before switching MAIL_SENDER. Prints only the
 * result, never credentials.
 *
 *     railway run --service prl-staffing npx tsx scripts/test-graph-send.ts <from-mailbox> <to-address>
 */
import { getGraphConfig, sendViaGraph } from "../src/lib/email-graph";

const [from, to] = process.argv.slice(2);
if (!from || !to) {
  console.error("Usage: test-graph-send.ts <from-mailbox> <to-address>");
  process.exit(2);
}

async function main() {
  const base = getGraphConfig();
  if (!base) {
    console.error("Graph credentials not found in this environment.");
    process.exit(1);
  }
  const result = await sendViaGraph(
    { ...base, sender: from },
    {
      to: [to],
      subject: "PRISM test: sending from " + from,
      html: `<p>This is a one-off test from PRISM, sent through Microsoft Graph as <strong>${from}</strong>.</p>
<p>If you can read this, PRISM can send from this mailbox and MAIL_SENDER can be switched to it.</p>`,
      from: `PRL Site Solutions <${from}>`,
    }
  );
  console.log(result.success ? `Sent: ${from} -> ${to}` : `FAILED: ${result.error}`);
  if (!result.success) process.exit(1);
}

main();
