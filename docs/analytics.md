# Analytics and privacy consent — retired

> **Historical implementation notes only.** On 2026-10-02 the product removed the
> Optional analytics banner, Privacy preferences, Privacy policy route, tracker,
> and all analytics event collection/configuration. None of the configuration or
> activation steps below is active or should be reinstated without an explicit
> new product request. The main application now sends no analytics requests.

T3 Designer uses optional, prior-consent analytics with Umami 3.4.0. The application remains usable without analytics. This integration is ready for infrastructure configuration; it does not provision Umami, publish the site, or establish legal compliance. The T3 Website ID is still pending, so the example configuration deliberately leaves analytics disabled.

## Configuration contract

Copy [the web environment example](../apps/web/.env.example) to `apps/web/.env.local` for a local build, or supply these public values in the approved build environment. Vite embeds `VITE_*` values in the browser bundle: credentials, API keys, and infrastructure secrets must never appear here. Rebuild after changing these values.

| Variable | Meaning | Proposed public configuration |
| --- | --- | --- |
| `VITE_UMAMI_SCRIPT_URL` | URL of the approved Umami 3.4.0 tracker | `/umami/script.js` |
| `VITE_UMAMI_HOST_URL` | Collector base, including any proxy prefix; the app appends `/api/send` | `/umami` |
| `VITE_UMAMI_WEBSITE_ID` | T3's own Umami Website UUID | **Pending; leave blank** |
| `VITE_UMAMI_ALLOWED_HOSTNAME` | Exact public hostname; no scheme, port, wildcard, or path | `t3-designer.orchid-labs.xyz` |

Missing or invalid configuration, a different hostname, or development mode disables analytics. A production build served on a preview hostname stays disabled unless deliberately configured for that hostname. HTTPS is required except for an explicitly configured loopback hostname in production-mode local fixtures or previews. Do not reuse another application's Website ID. The integration does not try another collector or rename endpoints when blocked.

The same-origin contract is `GET /umami/script.js` and `POST /umami/api/send`. `HOST_URL` is also supplied to the tracker as `data-host-url`. Preserve `/umami` when proxying: a root `/api/send` endpoint is a different route. The official [tracker build configuration for 3.4.0](https://github.com/umami-software/umami/blob/v3.4.0/rollup.tracker.config.js) uses `/api/send` as its default suffix. This app expects that suffix; infrastructure must coordinate any change to Umami's `COLLECT_API_ENDPOINT`.

## Consent and lifecycle

The initial state is undecided. Accept and Reject have equal button styling, are keyboard accessible, and do not prevent use of the application. Privacy information and the persistent Privacy preferences control are available from the app. Revoking consent changes the saved choice to rejected; acceptance can be selected again later.

Only `choice`, `version`, and `expiresAt` were stored under the local-storage key `t3-designer.analytics-consent`. The former six-calendar-month lifetime was configurable through the retired `analytics-policy.ts`; month-end expiry was clamped to the last valid day. This historical product choice was not a legal assurance or an analytics/log-retention period. Browser storage failure left analytics off. Do Not Track and Global Privacy Control took precedence over an accepted choice.

An empty `t3-designer.analytics-storage-check` key is briefly written and immediately removed to check that storage remains writable before accepted tracking. It contains no identifier or preference. The controller never rewrites an old accepted decision during this check: doing so could overwrite a simultaneous rejection from another tab. If the check or cleanup fails, analytics stops; an empty probe may remain if the browser also blocks removal.

No tracker element, preconnect, analytics request, or pre-consent event queue is created before valid acceptance. After acceptance, a single controller owns script loading and manual tracking. Automatic tracking is disabled. In Umami 3.4.0, `data-auto-track="false"` disables initialization, including history/click handlers and optional performance tracking; `data-auto-pageview="false"` alone does not. See [official tracker configuration](https://docs.umami.is/docs/tracker-configuration).

The app's `data-before-send` callback always returns a falsy value to cancel the upstream transport. It validates the consent and permitted payload before using its own cancellable fetch. This matters because the [3.4.0 tracker](https://github.com/umami-software/umami/blob/v3.4.0/src/tracker/index.ts) awaits that callback and does not recheck consent after it resolves. Both script requests and collector requests use `no-referrer`; collector requests omit credentials. This protects the HTTP Referer header as well as the JSON payload.

Revocation, rejection, expiry, and storage failure invalidate the controller's tracking generation, clear its memory-only cache, and abort pending collector fetches. Late tracker callbacks cannot authorize new requests. The app does not need a page reload, so the current model and workspace remain usable. A request dispatched while permission was still valid may already have reached the server; withdrawal cannot erase it or retroactively prevent it. No automatic retries or offline replay are used when the tracker fails.

## Data and event contract

Tracking is limited to a small set of app-defined view names and actions. Payloads are rebuilt from permitted values rather than spreading a browser URL, document title, DOM attributes, or a caller-supplied object. Raw query strings and hashes, dossier content, names, emails, coordinates, and personal IDs are excluded. `referrer` is always empty. No screen dimensions or browser language are added to the JSON payload. UI translations never become arbitrary analytics values.

`view` is one of `apartment`, `building`, or `documentation`. Virtual URLs are respectively `/apartment`, `/building`, and `/documentation`; they do not copy the address bar. Titles are the fixed strings `T3 Designer · Apartment`, `T3 Designer · Building`, and `T3 Designer · Documentation`.

| Record | Trigger | Custom data |
| --- | --- | --- |
| Pageview (no `name`) | Current workspace after acceptance/script readiness, then each changed workspace | None |
| `view_changed` | Workspace changes after the initial accepted pageview | `{ view }`, the destination |
| `solar_opened` | A solar study becomes visible, including an already visible study when analytics starts | `{ view }` |
| `dossier_opened` | The dossier workspace becomes visible while accepted | `{ view: 'documentation' }` |
| `glb_download` | Activation of an existing GLB download link | `{ view }`; no asset/file identifier |

The pageview and matching named action answer different questions; they are intentionally distinct records. There is no additional custom “visit” event: Umami uses its server-side visit grouping. React StrictMode, remounts, and selecting the current workspace must not duplicate a view. Closing and reopening a solar panel is a new opening. Sliders, camera motion, animation frames, room contents, and dossier text are not recorded. A download event measures activation, not a verified completed file transfer.

The app does not call `identify`, set a distinct ID, or enable replay, heatmaps, performance recording, or session recording. It uses the [manual tracking API](https://docs.umami.is/docs/tracker-functions) as `track(() => payload)`, returning only permitted fields and ignoring the supplied browser-derived defaults. The callback form preserves payload identity in 3.4.0; `track(object)` clones the object and would fail the controller's one-use identity check.

Collector bodies use `{ "type": "event", "payload": { ... } }`. A pageview has no event name; a custom event has one permitted name and permitted data. The response cache token is kept only in memory and, if present, sent as `x-umami-cache` on later accepted requests. It is never stored with the consent choice or exposed as a custom identity. The exact server contract and server-derived session/visit behavior are defined in the [3.4.0 collector](https://github.com/umami-software/umami/blob/v3.4.0/src/app/api/send/route.ts).

## Privacy boundaries and pending operator information

The complete notice is a dedicated **`/privacy`** page (also accepts `/privacy/`), with normal links, section anchors, browser history, a return link, and Spanish, English and French versions. Navigating there preserves apartment selections and solar inputs and pauses playback. This route is excluded from all analytics, including when a stored acceptance exists. Leaving it can resume the accepted workspace; the policy itself never becomes an analytics payload. The preferences dialog remains available on both surfaces and can revoke permission without a reload.

The notice distinguishes optional consent-based measurement from operational logs and describes access, correction, erasure, restriction and applicable objection/portability rights, plus withdrawal and complaints. Its structure was checked against [CNIL's transparency guidance](https://www.cnil.fr/fr/informer-les-personnes) and the [GDPR information and rights provisions](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3). This is an implementation of a notice, not a determination that all infrastructure processing complies with those requirements. In particular the operator must settle the operational-log legal basis, deletion and recipient/transfer facts alongside the deployment configuration.

The static web server must serve the app's `index.html` for `/privacy` and `/privacy/`; they are SPA routes, not separate server applications. Keep `/umami/*` proxy routes out of the SPA fallback. The Playwright production previews exercise direct page loads and reloads.

The former `privacy-settings.ts` held draft operator facts. The user confirmed that they are the controller; the repository's published attribution identified Pablo Coronel. The draft contact was `me@pablitxn.io`; no address was fabricated. The provider API verified production and observability servers in Helsinki, Finland on 2026-09-27. Loki's configured ordinary retention was 14 days; this was not a guarantee for all copies. See the [dated evidence report](privacy-infrastructure-evidence.md) for historical sources, freshness, and remaining gaps.

Umami receives network metadata such as IP address and User-Agent when an accepted request reaches it. Its server may derive browser/device information, visits, and approximate location. This is not a claim of complete anonymity. The app never requests browser geolocation permission. In 3.4.0, [location detection](https://github.com/umami-software/umami/blob/v3.4.0/src/lib/detect.ts) can produce country, region, and city from trusted proxy headers or GeoIP. If only country and region are intended, infrastructure must verify and document the actual minimization configuration.

Analytics consent does not control operational access logs. The infrastructure handoff reports Traefik logs containing IP addresses and headers, forwarded to Loki even when Umami is off. Those logs need their own documented purpose, access controls, retention, and privacy information. The browser consent lifetime is not either system's retention period.

Before public launch, the operator must complete the visible privacy notice with verified information:

- Confirm the maintained publication contact for the already identified controller.
- Analytics and operational-log purposes and applicable legal bases.
- Retention/deletion periods for T3's Umami data, access logs, and backups.
- Hosting locations, recipients/subprocessors, and any international transfers.
- A workable route for privacy requests and the applicable rights information.

None of these values is inferred from another app or invented by this implementation. The existing suspended retention job for another property does not establish T3 retention. The product chooses opt-in; neither a banner nor the absence of cookies alone establishes a regulatory exemption or compliance.

## Infrastructure checklist

These checks belong to the infrastructure/publication workflow, after the GitLab maintenance window is coordinated. Do not trigger pipelines, pushes, deploys, or infrastructure changes as part of verifying this application patch.

1. Create/verify T3's Website ID and public hostname, then supply the four public build values. The canonical repository is [GitLab](https://gitlab.orchid-labs.xyz/orchid-labs/homelab/t3-designer); GitHub remains the presentation mirror.
2. Verify public DNS/TLS and the tracker/collector from an external network. A successful private/split-DNS request does not prove public reachability. The app must be usable without SSO; the Umami dashboard remains protected.
3. Proxy the two approved routes, preserve the configured prefix, and confirm actual POST destinations. Do not serve an HTML login or SPA fallback at the script or collector routes. Do not expose Umami's admin API through the public analytics proxy.
4. Forward only trustworthy client-IP/location headers, overwriting spoofable incoming values. Check country and region end to end: in 3.4.0, a present country header causes the header result to be used even when region is absent. Coordinate any `CLIENT_IP_HEADER` or `SKIP_LOCATION_HEADERS` change so other Umami sites are unaffected. See [Umami environment variables](https://docs.umami.is/docs/environment-variables) and the [3.4.0 IP-header selection code](https://github.com/umami-software/umami/blob/v3.4.0/src/lib/ip.ts).
5. Establish T3-specific retention, access, deletion, backup, and privacy-notice facts; independently review Traefik/Loki header capture. No hosting or transfer guarantees are supplied by this patch.
6. For a same-origin proxy, the relevant CSP needs `script-src 'self'` and `connect-src 'self'` in addition to the app's existing requirements. An approved external configuration needs the exact script and collector origins in those directives and compatible CORS: allow the app origin, `POST`, and `Content-Type`, `x-umami-website-id`, `x-umami-hostname`, and `x-umami-cache` request headers. The collector must return a successful JSON response with an optional string `cache`; HTTP errors, invalid JSON, or a disabled response stop analytics for that document until a new explicit decision. Do not add broad wildcards or `unsafe-inline` for analytics. Use an appropriate `Referrer-Policy` response header as additional defense.
7. Confirm that the served tracker remains the reviewed 3.4.0 contract. A tracker upgrade requires rerunning the lifecycle/network tests and reviewing callback and collector changes. Do not add recorder scripts, pixels, server-side analytics, or proxy logging that silently expands optional tracking.

## Verification

Unit and browser tests cover undecided/rejected states, acceptance, duplicate prevention, revocation in the current document and after reload, expiry, storage failure, privacy signals, invalid configuration, and unavailable trackers. Browser tests use local intercepted tracker/collector fixtures; they must never send test visits to the real collector. The versioned fixture tests the official 3.4.0 callback contract and same-origin prefix.

Run from the repository root:

```sh
pnpm check
pnpm test:e2e
pnpm test:analytics
```

`pnpm check:all` also runs the dedicated production analytics suite; it is not silently omitted with the development-only browser run.

The dedicated analytics suite creates a production build in `/tmp` with an explicitly configured loopback hostname and a synthetic UUID used only by intercepted tests. Ordinary development mode always disables analytics, even with all four variables supplied. Browser verification includes keyboard navigation, mobile layout, SPA transitions, GLB interactions, sanitized bodies/headers, late script completion, and app usability with analytics blocked. Passing local tests does not validate DNS, proxy IP trust, geolocation, retention, or a deployed privacy notice.

The production suite has 28 scenarios, including `/privacy` direct links and reloads, three languages, keyboard/mobile reading, separate-tab links, history and preserved solar selections, and zero analytics on that page with stored consent. A successful application build with the supplied empty Website ID is deployable with analytics disabled; supplying an ID alone does not complete the infrastructure/privacy activation checklist above.
