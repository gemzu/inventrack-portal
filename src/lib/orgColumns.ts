/**
 * The organization columns a signed-in person may read.
 *
 * The invite codes are not among them: since the codes were locked away, a
 * read that asks for every column ("*") is refused outright, as a whole -
 * "permission denied for table organizations". The site's sign-in read the
 * organization that way, so on the web it never loaded: no organization name
 * in the header, the owner not recognised as the owner, and Settings showing
 * defaults instead of the organization's real settings. Every read names its
 * columns from here; an admin reads the codes through
 * ensure_org_invite_codes(). Same list as the app's ORG_COLUMNS.
 */
export const ORG_COLUMNS = [
  "id", "name", "address", "phone", "owner_id", "timezone", "sheet_id",
  "subscribed", "created_at", "updated_at",
  "low_stock_threshold", "notify_low_stock", "notify_new_orders",
  "notify_submissions", "order_approval_required", "reservation_hours",
  "allowed_country_code", "country_restriction_enabled", "country_restriction_source",
].join(", ");
