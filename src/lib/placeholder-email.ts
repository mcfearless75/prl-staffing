/**
 * The contractor import invents `first.last@prl-placeholder.co.uk` for anyone
 * imported without an email, because Contractor.email is required. The domain
 * does not exist, so every email sent there bounces back to the PRL mailbox
 * ("Recipient address rejected: Domain not found"). Campaign sends already
 * excluded it; compliance chases and every other sender did not.
 */
export const PLACEHOLDER_EMAIL_DOMAIN = "prl-placeholder.co.uk";

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.trim().toLowerCase().lastIndexOf("@");
  return at > -1 && email.trim().toLowerCase().slice(at + 1) === PLACEHOLDER_EMAIL_DOMAIN;
}
