# Historical privacy/analytics evidence

> This report records infrastructure observations made before the product removed
> privacy/analytics UI and tracking on 2026-10-02. It is not evidence that the
> current application presents a privacy route, offers analytics consent, or
> sends analytics events.

# Privacy infrastructure evidence

Audit date: **2026-09-27**. Scope: infrastructure facts supporting T3's privacy notice. This report separates a fresh provider observation, dated runtime evidence, local desired configuration, and facts still awaiting operator decisions. It is not a deployment record or a legal assessment.

Only read-only local inspection and Hetzner server-metadata queries were performed. No SSH session, deployment, pipeline, push, configuration change, analytics event, backup, deletion, or retention job was run. No credentials or visitor data were inspected. Public UI should use the supported facts below, not infrastructure paths or operational access details.

## Findings suitable for the privacy notice

| Topic | Supported wording or limit | Evidence class |
| --- | --- | --- |
| Hosting provider | Hetzner hosts the production and observability servers. | Provider API checked during this audit; Atlas corroborates provider. |
| Server location | Those two servers are in Helsinki, Finland, in the European Union. | Provider API, 2026-09-27 20:32:53-20:33:17 UTC. This does not locate all backups or all future edge processing. |
| Optional analytics | Umami 3.4.0 is the observed analytics service. T3's Website ID and public proxy activation remain pending in the infrastructure handoff. | Runtime evidence 2026-09-26; handoff 2026-09-27. No collector request was sent during this audit. |
| Approximate location | Umami's server-side IP/header processing can derive approximate country, region, and city. The app does not request browser GPS. | Handoff 2026-09-27 plus reviewed upstream 3.4.0 behavior. Final T3 proxy result remains unverified. |
| Operational logs | Infrastructure access logs can contain IP addresses, request metadata, User-Agent, and Referer. They are separate from optional analytics and remain outside the analytics consent switch. | Current handoff; corroborating local Traefik/OTel configuration. |
| Active Loki logs | Ordinary Loki retention is configured to 14 days and was preserved in the 2026-09-26 runtime recovery. | Desired configuration plus dated runtime evidence. This is not a maximum lifetime for all log copies. |
| T3 analytics retention | No T3-specific deletion schedule is established by the inspected evidence. Do not advertise a 13-month limit. | The existing purge job applies to another website and remains suspended. |
| Backups and recovery copies | No automatic backup-retention deadline is established. Recovery copies can outlive ordinary service retention. | Backup documentation and dated audits. Do not promise deletion of every copy after 14 days. |
| Access and recipients | Hetzner is an evidenced hosting provider. Dashboard login was observed. The full authorized-access and subprocessor list is not established by these sources. | Provider API; handoff. Account membership and contracts were not inspected. |

The operator has separately confirmed that they are the controller. Their publication name and contact belong in the app's maintained privacy configuration; this infrastructure audit does not infer them from administrative usernames or repository metadata.

## Fresh provider observation

The existing Hetzner CLI performed `server list` against its configured API, using the established provider context and filtering output to these two servers and four location fields. The returned observations were:

| Server role | Status | Location code | Country | City | Provider description | Observed UTC |
| --- | --- | --- | --- | --- | --- | --- |
| Production | running | `hel1` | `FI` | Helsinki | Helsinki DC Park 1 | 2026-09-27 20:32:53 |
| Observability | running | `hel1` | `FI` | Helsinki | Helsinki DC Park 1 | 2026-09-27 20:33:17 |

The observation records **Finland**, not Germany. The provider's own corporate location is not evidence of the servers' location. These queries establish server metadata at the stated times; they do not establish that T3 is deployed, public network reachability, a Website ID, the locations of recovery archives, a contractual recipient list, or the absence of international transfers.

Atlas independently lists both roles with `provider: hetzner`: [production host](</Users/pablitxn/sysadmin-workspace/atlas/ops/catalog/hosts.yaml:4>) (lines 4-16) and [observability host](</Users/pablitxn/sysadmin-workspace/atlas/ops/catalog/hosts.yaml:18>) (lines 18-30). That inventory's header says `last_reviewed: 2026-03-28`; it does not record a country. The current location statement therefore relies on the fresh API observation, not that older inventory.

## Source precedence and version drift

The [Atlas source-of-truth policy](</Users/pablitxn/sysadmin-workspace/atlas/policies/source-of-truth.md:8>) (lines 8-16, 29-33) assigns desired state to operational repositories and actual state to runtime observations. Atlas is the navigation and synthesis layer.

The local Panopticon checkout inspected here ends at `e4b5f85`, dated 2026-07-16; the local Mycelium checkout ends at `9d60356`, dated 2026-07-19. These local checkouts were not fetched, switched, or edited. In particular, [the local Umami deployment](</Users/pablitxn/repos/panopticon/applications/observability/umami/deployment.yaml:53>) (lines 53-59) still pins **3.2.0** and imports secret-backed environment configuration. It cannot establish current runtime environment values or disprove the later upgrade.

The [observability closure dated 2026-09-26](</Users/pablitxn/sysadmin-workspace/atlas/ops/wireguard/runtime/cluster-exhaustive-2026-09-26/observability-final.md:1>) reports a later deployed Panopticon revision in lines 3-9, **Umami 3.4.0** in line 25, and the still-suspended retention job in lines 35-38. Those later runtime observations take precedence over the stale local image pin for this report. Their runtime checks were not repeated today.

## Umami, T3 publication, and geolocation

The [T3 handoff dated 2026-09-27](</Users/pablitxn/sysadmin-workspace/atlas/inbox/2026-09-27-t3-designer-umami-handoff.md:13>) (lines 13-20) establishes the following bounded evidence:

- The T3 public domain was planned but public DNS was not yet established.
- Umami 3.4.0's script returned HTTP 200 using the Mac's private/split-DNS access; external access was not established.
- T3's Website ID was pending. Another site's ID must not be reused.
- The dashboard required login; no authenticated browser session was found.
- GeoLite2-City was present in the container. `CLIENT_IP_HEADER` and `SKIP_LOCATION_HEADERS` were reported unset.
- A same-origin `/umami/script.js` and `/umami/api/send` proxy was being evaluated.

In the reviewed [Umami 3.4.0 location code](https://github.com/umami-software/umami/blob/v3.4.0/src/lib/detect.ts), a provider country header returns the header-derived result before the GeoIP fallback. A country-only header can therefore omit region even when the database supports it. The same code can derive city. T3's final proxy must verify trustworthy IP forwarding and the intended location granularity; this application audit does not change the shared Umami environment.

The nearby [Clés & Déclics observability contract](</Users/pablitxn/repos/mycelium/applications/cles-et-declics/OBSERVABILITY.md:12>) (lines 12-26) describes another application's future same-origin proxy and country-only header handling. It is a reference pattern, not proof of T3's proxy, retention, or public behavior.

## Operational logs and retention boundaries

The [2026-09-27 handoff](</Users/pablitxn/sysadmin-workspace/atlas/inbox/2026-09-27-t3-designer-umami-handoff.md:20>) explicitly reports IP/header-bearing Traefik logs reaching Loki. The local [production Traefik configuration](</Users/pablitxn/repos/mycelium/applications/infrastructure/traefik/values.yaml:40>) (lines 40-49, 67-77) enables access logging and preserves named headers including User-Agent, Referer, forwarded client address, country, and edge/request metadata. The local [OTel logs pipeline](</Users/pablitxn/repos/panopticon/applications/observability/otel-collector/values.yaml:152>) (lines 152-155, with exporter at 114-115) forwards received logs to Loki. These local files corroborate the data categories; the handoff provides the more recent observation.

The local [Loki retention configuration](</Users/pablitxn/repos/panopticon/applications/observability/loki/values.yaml:23>) (lines 23-30) sets `retention_period: 14d` and enables the compactor's retention. The later [Loki recovery record dated 2026-09-26](</Users/pablitxn/sysadmin-workspace/atlas/ops/wireguard/runtime/cluster-exhaustive-2026-09-26/observability-loki-incident.md:41>) (lines 41-43, 51-55) confirms ordinary 14-day retention after recovery and preservation of separate recovery archives. This supports “ordinary retention of active Loki logs: 14 days,” not “all logs are deleted within 14 days.” No expiry of those separate archives is established here.

No general days-based deadline for host/container access-log copies was found. The [2026-07-15 maintenance record](</Users/pablitxn/sysadmin-workspace/atlas/ops/wireguard/runtime/MAINTENANCE-2026-07-15-fleet.md:39>) (lines 39-40) documents a storage-size setting for one host's journal, which is not an elapsed-time retention rule and must not be presented as one.

## T3 analytics and backup retention gaps

The [Umami retention runbook](</Users/pablitxn/repos/panopticon/docs/runbooks/umami-retention.md:3>) restricts its job to a single **other** website (lines 3-6), keeps it suspended/dry-run (lines 13-22), and defines a 13-calendar-month cutoff for that scoped job (lines 48-58). The newer [runtime closure](</Users/pablitxn/sysadmin-workspace/atlas/ops/wireguard/runtime/cluster-exhaustive-2026-09-26/observability-final.md:35>) still reports it suspended and `apply=false` (lines 35-38). Neither document supplies an active retention contract for T3.

The [backup workflow](</Users/pablitxn/sysadmin-workspace/atlas/ops/backups/README.md:81>) states that it does not automatically delete local or remote backups. The same file [includes Umami PostgreSQL dumps](</Users/pablitxn/sysadmin-workspace/atlas/ops/backups/README.md:145>) (lines 145-146) in its scope. The [2026-09-05 backup audit](</Users/pablitxn/sysadmin-workspace/atlas/ops/wireguard/runtime/maintenance-2026-09-05/backup-audit.md:13>) (lines 13-18) found local generations whose remote verification was false and a configured local-only scheduled run; it did not establish current offsite coverage.

This must not be rewritten as “offsite backups do not exist.” The [dataset catalog](</Users/pablitxn/sysadmin-workspace/atlas/catalog/datasets.yaml:183>) (lines 183-199) records a successful **dated manual offsite** restore, including Umami, on 2026-07-15, while explicitly marking retention unknown. The evidence supports a retention gap, not a claim that no backup copies exist.

## Access, recipients, and publication decisions still required

The hosting-provider fact can be completed with **Hetzner** and the server-location fact with **Helsinki, Finland (EU)**. Dashboard authentication is reported by the handoff, but this audit did not inspect account membership, access logs, provider contracts, or a complete subprocessor register. Do not assert that exactly one person can access every service or that no international processing occurs.

Cloudflare appears in the broader production architecture and other applications, but T3's final public route has not been established by the inspected sources. Its role, processing locations, and any applicable transfer information need to be aligned with the approved T3 publication path. Other applications' recipients and retention settings cannot simply be copied into T3's notice.

Remaining factual/operator decisions are therefore narrow and explicit: publication identity and contact; T3 analytics retention and deletion implementation; expiry of backups and recovery copies; final edge/proxy recipients and transfer facts; and the authorized-access description. The app can publish the verified hosting/log facts while keeping optional analytics disabled until its own prerequisites are satisfied.
