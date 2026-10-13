---
title: Table layout policy
type: docs
---

## Ordinary prose

| Owner | Project | State | When | Notes |
| --- | --- | --- | --- | --- |
| Alice handles planning and coordination | Tokyo release | Ready for review | After final review and approval | A short explanation of the current delivery status. |
| Bob handles design and delivery | Osaka patch | Waiting on tests | Before the next release window | Another short explanation of the expected next step. |
{#ordinary-prose-table}

## Explicit technical width

| Variable | Required | Default | Configuration key | Description |
| --- | --- | --- | --- | --- |
| `HG_PD_GRPC_HOST` | Yes | None | `grpc.host` | Advertised gRPC hostname/IP; use container hostnames within a container network. |
| `HG_PD_INITIAL_STORE_COUNT` | No | `1` | `pd.initial-store-count` | Minimum Store count needed for cluster availability. |
| `HG_PD_ACTUATOR_EXPOSURE` | No | `health,metrics,prometheus` | `management.endpoints.web.exposure.include` | Public Actuator endpoint allowlist; `*` is forbidden. |
{#wide-technical-table .td-table--wide}

## Short ordinary table

| City | Port | Purpose |
| --- | --- | --- |
| Tokyo | 8080 | Graph API |
| Osaka | 8686 | Metadata |
{#short-ordinary-table}

## Explicit width with existing modifiers

| Component | Read | Write |
| --- | --- | --- |
| A long component identifier | Yes | No |
{#wide-matrix-table .matrix .full-width .td-table--wide caption="Existing modifiers remain independent"}
