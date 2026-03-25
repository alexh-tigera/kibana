# Cross-Project Search (CPS) — Two-Project Local Setup

Spins up two separate Elasticsearch Serverless clusters (origin + linked), links them for cross-project search, and prints the commands to start a Kibana instance for each.

## Prerequisites

- Docker running
- `jq` installed (`brew install jq`)
- `yarn kbn bootstrap` completed

## Usage

```bash
# First run
bash scripts/cps_two_projects.sh

# Restart (kills existing containers first)
bash scripts/cps_two_projects.sh --kill
```

### Options

| Flag | Description |
|------|-------------|
| `--kill` / `--clean` | Stop existing ES/linked containers before starting |
| `--projectType <type>` | Project type: `observability` (default), `security`, `es` |
| `--image <image>` | Use a specific Docker image |
| `--tag <tag>` | Use a specific image tag |

## What it does

1. Starts the origin ES cluster via `yarn es serverless` (3 nodes, then stops `es03` to save memory)
2. Starts a linked ES cluster (2 nodes) by cloning the origin config with a separate project ID
3. Updates the origin's operator `settings.json` to register the linked project
4. Waits for the CPS link to become active

## Ports

| Component | Port |
|-----------|------|
| Origin ES | 9200 |
| Linked ES | 9210 |
| Origin Kibana | 5601 |
| Linked Kibana | 5602 |

## Starting Kibana

After the script completes, start each Kibana in a separate terminal:

```bash
# Origin (terminal 1)
yarn start --serverless=oblt --uiam --cps.cpsEnabled=true

# Linked (terminal 2)
yarn start --serverless=oblt --uiam --cps.cpsEnabled=true \
  --server.port=5602 \
  --elasticsearch.hosts=https://localhost:9210
```

Replace `oblt` with `security` or `es` if you used a different `--projectType`.

## Verifying the link

```bash
curl -sk https://localhost:9200/_remote/info -u elastic_serverless:changeme | jq
```

You should see `"connected": true` under `linked_local_project`.

## Stopping everything

```bash
docker container stop es01 es02 es01-linked es02-linked uiam uiam-cosmosdb
```

## Credentials

- **Username:** `elastic_serverless` or `system_indices_superuser`
- **Password:** `changeme`
