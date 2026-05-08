# PRL Site Solutions — Careers Page Integration Brief

## Context

PRL Site Solutions (prlsitesolutions.co.uk) is a UK recruitment agency specialising in Energy-from-Waste (EfW), industrial construction, and M&E. The existing site is hosted on GitHub Pages and was previously built with Claude Code assistance.

This brief adds a **live vacancies careers page** to the existing site. The page is already built as a self-contained HTML file (`careers.html` in this package). Your job is to integrate it cleanly into the existing repo and surface it from the main site navigation.

## Goals

1. Add a `/careers.html` (or `/careers/` folder-based) page to the existing PRL GitHub Pages site
2. Ensure it's linked from the main navigation on every existing page
3. Preserve existing site styling and structure — do not break anything that's already working
4. Confirm the JobPosting schema validates against Google's Rich Results Test
5. Ensure the page renders correctly on mobile (70%+ of PRL's traffic is mobile)

## What's in this package

| File | Purpose |
|------|---------|
| `careers.html` | The full, self-contained careers page. All CSS and JS inline. 10 live roles with JSON-LD JobPosting schema per role. Filter by location + EfW. |
| `CLAUDE.md` | This brief. |

## Required steps

### Step 1 — Inspect the existing repo

Before adding anything, read the existing PRL repo structure. Check:
- Where `index.html` lives (root or `/docs/`?)
- Whether there's a `_config.yml` (suggests Jekyll)
- Existing CSS file(s) and whether they use custom properties
- Existing navigation component pattern
- Existing typography and brand colours

**Do not assume the structure — open the files and check.**

### Step 2 — Harmonise the design with the existing site

The provided `careers.html` uses:
- **Fonts**: Barlow Condensed (display) + Inter (body)
- **Primary colour**: navy `#0a2540`
- **Accent**: cyan `#00b4d8`
- **Industrial aesthetic**: grid overlay, hazard orange for EfW tag, pulsing live indicator

**If the existing PRL site uses different fonts or colours, adjust the careers page CSS variables at the top of the `<style>` block to match.** The variables are all at the top in `:root`:

```css
:root {
  --prl-navy: #0a2540;        /* ← swap for existing brand navy */
  --prl-accent: #00b4d8;      /* ← swap for existing accent */
  --font-display: 'Barlow Condensed', sans-serif;  /* ← swap if needed */
  --font-body: 'Inter', ...;  /* ← swap if needed */
}
```

The structural design should hold up across any brand palette — it's the variables that need updating, not the layout.

### Step 3 — Add the navigation link

Add a "Careers" or "Vacancies" link to the main site nav. Mirror the existing nav markup pattern exactly. Don't introduce a new nav component — extend what's already there.

Typical placement: last or second-to-last item in the nav, before "Contact".

### Step 4 — Add footer link (if footer exists)

If the existing site has a footer with a links column, add "Careers" or "Live Vacancies" there too.

### Step 5 — Update sitemap + robots

If a `sitemap.xml` exists, add `/careers.html` as a new URL entry. Set `changefreq` to `daily` (the vacancy list updates often) and `priority` to `0.8`.

If `robots.txt` exists, ensure `/careers.html` is not disallowed.

### Step 6 — Validate JSON-LD schema

After deploying, run the page URL through:
- https://search.google.com/test/rich-results
- Confirm all 10 JobPosting entries are detected and valid
- Fix any warnings (most likely: missing `validThrough` or incorrect date format)

**Note on dates**: All `datePosted` and `validThrough` fields are currently set based on the CV-Library posting dates as of April 2026. When Paul updates the roles, these dates need updating too. See Step 8.

### Step 7 — Test on mobile

Open the deployed page on a real mobile device (or Chrome DevTools mobile emulation). Confirm:
- Hero stats don't overflow
- Filter buttons wrap cleanly
- Role cards stack properly
- "Apply via CV-Library" and "Call" buttons are tap-friendly (min 44px tap target)
- Phone tap-to-call works (`tel:` link on Keenan's number)

### Step 8 — Create an update workflow doc

Create a short `CAREERS-UPDATE.md` in the repo root with instructions Paul can follow (or pass to Keenan) when roles change. Template below:

```markdown
# How to update PRL careers page

## When a role closes (placement filled, advert removed)

1. Open `careers.html`
2. Find the role card (search for the job title)
3. Delete the entire `<article class="role-card">...</article>` block for that role
4. Delete the matching `<script type="application/ld+json">` block for that role (search for the Job ID, e.g. "224982410")
5. Update the stat count in the hero section (search for `id="stat-count"`)
6. Update the count at the bottom of the filter bar ("of 10 roles" → "of 9 roles")
7. Commit and push

## When a new role is posted on CV-Library

1. Copy an existing role card block as a template
2. Update: title, location (data-location + visible text), rate, contract length, summary, CV-Library Job ID (in the apply URL)
3. Add/remove `data-tags="efw"` depending on whether it's an EfW project
4. Copy and adapt the matching JSON-LD schema block at the top of the file
5. Update stat count + filter bar count
6. Commit and push

## Location filter values
- `deeside` — Deeside / Flintshire
- `ince` — Ince / Cheshire West
- `pembroke` — Pembrokeshire sites
- `other` — anywhere else

If a new location gets 2+ active roles, add a new filter button in the filter bar.
```

## Data used in the build

All 10 roles were captured from CV-Library agency code `454083` (PRL Site Solutions) on 23 April 2026:

| # | Role | Location | Rate | Job ID |
|---|------|----------|------|--------|
| 1 | Electrical QA/QC | Deeside | £37–40/hr | 224982410 |
| 2 | Bookkeeper (CIS) | Deeside | £18–20/hr | 225000937 |
| 3 | Telehandler Operator 360 | Ince | £32/hr | 224995587 |
| 4 | Piping Engineer | Deeside | £33–35/hr | (ID not captured — uses search URL) |
| 5 | Civils Foreman | Ince | £28–30/hr | 224982344 |
| 6 | Slinger Signaller | Chorley | £18–20/hr | 224969298 |
| 7 | Plater Fabricator | Bridgwater | £28.29–50.93/hr | 224967683 |
| 8 | Site Supervisor | Pembroke | £40/hr | 224936615 |
| 9 | HSE Advisor | Pembroke | £35/hr | 224936558 |
| 10 | Fire Marshal | Maiden Wells | £18–27/hr | 224927981 |

All roles: **Keenan Thomas, 07960 871442**.

## Known issues / to flag to Paul

1. **Piping Engineer has no Job ID** — the apply button currently links to a CV-Library search URL instead of a direct advert URL. Paul needs to grab the direct URL from CV-Library and replace the placeholder in two places (the apply button and the JSON-LD `url` field).

2. **Apply URL format is assumed** — `https://www.cv-library.co.uk/job/[JOB_ID]`. If CV-Library's actual URL format is different (e.g. includes a slug), the apply URLs need updating. Paul should test one link after deployment.

3. **The CV-Library iframe/hyperlink option** (agency code `454083`) is NOT used here — we built an owned, indexable, branded page instead. Deliberate choice for SEO and brand control.

4. **No backend** — this is a static HTML page. Updating roles requires editing the file. If Paul wants this automated in future, he should ask CV-Library about an RSS/XML feed of PRL's own adverts (lower bar than their gated API).

## SEO considerations

- The page is structured to compete for:
  - "EfW jobs UK" / "Energy from Waste recruitment"
  - "[location] industrial jobs" (Deeside, Pembroke, Ince, Bridgwater, Chorley)
  - "[role] jobs UK" (Electrical QA/QC, Piping Engineer, etc.)
  - "PRL Site Solutions jobs/careers"
- JobPosting schema on each role gives Google for Jobs eligibility — roles can appear in the jobs widget at the top of Google SERPs alongside CV-Library's listing, giving PRL a second shot at candidates.
- Canonical URL set to `https://prlsitesolutions.co.uk/careers.html` — update if the final URL is different.

## Commit message suggestion

```
Add live vacancies careers page with JobPosting schema

- 10 current PRL Site Solutions roles from CV-Library
- Location-based filtering (Deeside / Ince / Pembrokeshire / EfW)
- JSON-LD JobPosting schema per role for Google for Jobs eligibility
- Direct apply routes to CV-Library adverts by Job ID
- Mobile-first responsive design
- Industrial aesthetic: navy/cyan, Barlow Condensed display font
```

## Final check before Paul reviews

- [ ] Deployed and live on production domain
- [ ] Linked from main nav on all existing pages
- [ ] Passes Google Rich Results Test for all 10 roles
- [ ] Loads under 2 seconds on mobile 4G
- [ ] All CV-Library apply links tested (at least 3 at random)
- [ ] CAREERS-UPDATE.md in repo root
- [ ] Sitemap updated
