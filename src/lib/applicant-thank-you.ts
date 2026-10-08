/**
 * "Thanks, we'll be in touch" email to someone who has just applied on the
 * website (/apply). Pure: the route sends it.
 */
import { escapeHtml } from "@/lib/utils";

/** PRL's public contact details and social pages. The website footer uses the same. */
export const PRL_CONTACT = {
  phone: "0800 772 3959",
  phoneHref: "tel:08007723959",
  email: "admin@prlsitesolutions.co.uk",
  website: "https://www.prlsitesolutions.co.uk",
  linkedin: "https://www.linkedin.com/company/prl-site-solutions/",
  instagram: "https://www.instagram.com/prlsitesolutionsltd/",
} as const;

export function applicantThankYouEmail(firstName: string): {
  subject: string;
  html: string;
  text: string;
} {
  const name = firstName.trim() || "there";
  const safeName = escapeHtml(name);
  const c = PRL_CONTACT;

  const subject = "Thanks for registering with PRL Site Solutions";

  const text = [
    `Hi ${name},`,
    "",
    "Thank you for registering your interest with PRL Site Solutions. We've received your details and one of the team will be in touch.",
    "",
    "If you need us in the meantime:",
    `Phone: ${c.phone} (freephone)`,
    `Email: ${c.email}`,
    `Website: ${c.website}`,
    "",
    "Follow us for new jobs and site news:",
    `LinkedIn: ${c.linkedin}`,
    `Instagram: ${c.instagram}`,
    "",
    "Best regards,",
    "PRL Site Solutions",
  ].join("\n");

  const button = (href: string, label: string, bg: string) =>
    `<a href="${href}" style="display:inline-block;background:${bg};color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px;">${label}</a>`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1F4E79; margin: 0; font-size: 24px;">PRL Site Solutions</h1>
        <p style="color: #666; font-size: 12px; margin: 4px 0 0;">Recruitment Specialists</p>
      </div>

      <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
        <h2 style="color: #333; margin: 0 0 16px; font-size: 20px;">Thanks for registering</h2>
        <p style="color: #555; line-height: 1.6; margin: 0 0 8px;">Hi ${safeName},</p>
        <p style="color: #555; line-height: 1.6; margin: 0 0 24px;">
          Thank you for registering your interest with PRL Site Solutions. We've received your
          details and one of the team will be in touch.
        </p>

        <p style="color: #333; font-weight: 600; margin: 0 0 8px;">Need us in the meantime?</p>
        <p style="color: #555; line-height: 1.8; margin: 0 0 24px;">
          Phone: <a href="${c.phoneHref}" style="color:#2563eb;">${c.phone}</a> (freephone)<br/>
          Email: <a href="mailto:${c.email}" style="color:#2563eb;">${c.email}</a><br/>
          Website: <a href="${c.website}" style="color:#2563eb;">prlsitesolutions.co.uk</a>
        </p>

        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #eee;">
          <p style="color: #555; margin: 0 0 12px;">Follow us for new jobs and site news</p>
          ${button(c.linkedin, "LinkedIn", "#0A66C2")}
          ${button(c.instagram, "Instagram", "#C13584")}
        </div>
      </div>

      <p style="text-align: center; color: #999; font-size: 11px; margin-top: 24px;">
        PRL Site Solutions | Recruitment Specialists
      </p>
    </div>
  `;

  return { subject, html, text };
}
