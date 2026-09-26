export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { matchContractors, DEFAULT_RADIUS_MILES } from "@/lib/intelligence-engine";
import { geocodePostcodesBulk, type GeoPoint } from "@/lib/geocode";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

function parseRadius(raw: string | undefined): number {
  const n = raw ? parseFloat(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RADIUS_MILES;
  return Math.min(n, 500);
}

// Where "within N miles" is measured from. A site without cached coordinates
// is looked up on the fly (read-only here; saving the site caches them).
async function resolveOrigin(
  siteId: string,
  postcode: string
): Promise<{ origin: GeoPoint | null; label: string; error?: string }> {
  if (siteId) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { name: true, postcode: true, latitude: true, longitude: true, company: { select: { name: true } } },
    });
    if (!site) return { origin: null, label: "", error: "That site no longer exists." };
    const label = `${site.name} (${site.company.name})`;
    if (site.latitude != null && site.longitude != null) {
      return { origin: { lat: site.latitude, lng: site.longitude }, label };
    }
    if (!site.postcode) {
      return { origin: null, label, error: `${label} has no postcode, so distance can't be measured. Add one on the site page.` };
    }
    postcode = site.postcode;
  }
  if (!postcode) return { origin: null, label: "" };
  try {
    const point = (await geocodePostcodesBulk([postcode], { timeoutMs: 5000 })).get(postcode.trim().toUpperCase());
    if (point) return { origin: point, label: postcode.toUpperCase() };
  } catch {
    // fall through to the error below
  }
  return { origin: null, label: postcode, error: `Couldn't find the postcode "${postcode}". Check it and try again.` };
}

export default async function SmartMatchingPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string; siteId?: string; postcode?: string; radius?: string; maxRate?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const role = params?.role || "";
  const siteId = params?.siteId || "";
  const postcode = (params?.postcode || "").trim();
  const radiusMiles = parseRadius(params?.radius);
  const maxRate = params?.maxRate ? parseFloat(params.maxRate) : undefined;

  // Get existing roles for suggestions, and the sites you can measure from
  const [existingRoles, sites] = await Promise.all([
    prisma.assignment.findMany({
      select: { role: true },
      distinct: ["role"],
      orderBy: { role: "asc" },
    }),
    prisma.site.findMany({
      where: { isActive: true },
      select: { id: true, name: true, postcode: true, company: { select: { name: true } } },
      orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const place = role ? await resolveOrigin(siteId, postcode) : { origin: null, label: "" };
  // An unresolvable site/postcode shows an error instead of silently
  // matching across the whole country.
  const matches =
    role && !place.error
      ? await matchContractors({ role, maxRate, origin: place.origin, radiusMiles })
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="🎯 Smart Contractor Matching"
        description="AI-powered matching scores contractors against role requirements, availability, compliance, rates, and location"
        action={
          <Link
            href="/intelligence"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Intelligence
          </Link>
        }
      />

      {/* Search Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role Required <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="role"
              name="role"
              defaultValue={role}
              required
              placeholder="e.g. Electrician, Labourer, Foreman"
              list="role-suggestions"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <datalist id="role-suggestions">
              {existingRoles.map((r) => (
                <option key={r.role} value={r.role} />
              ))}
            </datalist>
          </div>
          <div className="lg:col-span-2">
            <label htmlFor="siteId" className="block text-sm font-medium text-gray-700">Site</label>
            <select
              id="siteId"
              name="siteId"
              defaultValue={siteId}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Any location / use postcode</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company.name} – {s.name}
                  {s.postcode ? ` (${s.postcode})` : " (no postcode)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">or Postcode</label>
            <input
              type="text"
              id="postcode"
              name="postcode"
              defaultValue={postcode}
              placeholder="e.g. M1 1AA"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="radius" className="block text-sm font-medium text-gray-700">Within (miles)</label>
            <input
              type="number"
              id="radius"
              name="radius"
              defaultValue={radiusMiles}
              step={1}
              min={1}
              max={500}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="maxRate" className="block text-sm font-medium text-gray-700">Max Rate (£/h)</label>
            <input
              type="number"
              id="maxRate"
              name="maxRate"
              defaultValue={maxRate || ""}
              step={1}
              min={0}
              placeholder="e.g. 45"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-colors"
            >
              🎯 Find Best Match
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {place.error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-6 py-4">
          <p className="text-sm text-amber-800">{place.error}</p>
        </div>
      )}

      {role && !place.error && matches.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No matching contractors found for &quot;{role}&quot;
            {place.origin ? ` within ${radiusMiles} miles of ${place.label}` : ""}.
          </p>
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Top Matches for &quot;{role}&quot;
            {place.origin && (
              <span className="font-normal"> within {radiusMiles} miles of {place.label}</span>
            )}
            <span className="ml-2 text-sm font-normal text-gray-500">({matches.length} results)</span>
          </h2>
          {place.origin && (
            <p className="text-xs text-gray-500">
              Distance is straight-line from the worker&apos;s home postcode. Workers with no known
              postcode location are still listed, marked &quot;Location unknown&quot;.
            </p>
          )}

          {matches.map((match, index) => {
            const scoreColor =
              match.score >= 80
                ? "text-emerald-700 bg-emerald-100 border-emerald-300"
                : match.score >= 60
                ? "text-blue-700 bg-blue-100 border-blue-300"
                : match.score >= 40
                ? "text-amber-700 bg-amber-100 border-amber-300"
                : "text-gray-600 bg-gray-100 border-gray-300";

            return (
              <div key={match.contractorId} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400 font-medium">#{index + 1}</span>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${scoreColor}`}>
                      <span className="text-lg font-bold">{match.score}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{match.contractorName}</h3>
                      {match.ir35Status && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          match.ir35Status === "Outside" ? "bg-emerald-100 text-emerald-700" :
                          match.ir35Status === "Inside" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          IR35: {match.ir35Status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{match.jobTitle || "No job title"}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {match.chargeRate && (
                        <span>{formatCurrency(match.chargeRate)}/h</span>
                      )}
                      <span>Compliance: {match.complianceScore}%</span>
                      {place.origin && (
                        <span className={match.miles === null ? "text-gray-400" : "font-medium text-gray-700"}>
                          {match.miles === null ? "Location unknown" : `${match.miles.toFixed(1)} mi`}
                        </span>
                      )}
                      <span className={match.availableFrom === null ? "text-emerald-600 font-medium" : "text-amber-600"}>
                        {match.availableFrom === null ? "Available now" : `Busy until ${match.availableFrom ? new Date(match.availableFrom).toLocaleDateString("en-GB") : "TBD"}`}
                      </span>
                    </div>

                    {/* Factor breakdown */}
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {match.factors.map((f) => (
                        <div key={f.label} className="text-center">
                          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`absolute left-0 top-0 h-full rounded-full ${
                                f.score >= 70 ? "bg-emerald-500" : f.score >= 40 ? "bg-amber-500" : "bg-red-400"
                              }`}
                              style={{ width: `${f.score}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-gray-500">{f.label}</p>
                          <p className="text-[10px] font-bold text-gray-700">{f.score}%</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <Link
                    href={`/contractors/${match.contractorId}`}
                    className="shrink-0 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    View Profile →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
