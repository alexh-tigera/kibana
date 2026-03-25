#!/usr/bin/env bash
#
# Spin up two separate ES Serverless projects (origin + linked) with CPS,
# link them, and print Kibana start commands.
#
# Uses 2-node clusters to keep memory usage manageable.
# Both clusters share the same elasticsearch.p12 (same CA) with
# verification_mode=certificate, so mutual TLS works out of the box.
#
# Prerequisites: Docker running, jq installed, yarn kbn bootstrap done.
#
# Usage:
#   bash scripts/cps_two_projects.sh [--projectType <type>] [--kill|--clean]
#
# Ports:
#   Origin ES:  9200    Linked ES:  9210
#   Origin KBN: 5601    Linked KBN: 5602

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT_TYPE="observability"
KILL=""
ES_IMAGE_FLAG=""
ORIGIN_ES_PORT=9200
LINKED_ES_PORT=9210
ORIGIN_KBN_PORT=5601
LINKED_KBN_PORT=5602
ORIGIN_PROJECT_ID="abcdef12345678901234567890123456"
LINKED_PROJECT_ID="fedcba65432109876543210987654321"
ORGANIZATION_ID="org1234567890"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --projectType|--project-type) PROJECT_TYPE="$2"; shift 2 ;;
    --clean|--kill)                KILL="--kill"; shift ;;
    --image)                      ES_IMAGE_FLAG="--image $2"; shift 2 ;;
    --tag)                        ES_IMAGE_FLAG="--tag $2"; shift 2 ;;
    *)                            echo "Unknown flag: $1"; exit 1 ;;
  esac
done

case "$PROJECT_TYPE" in
  oblt|observability) ES_PROJECT_TYPE="observability"; KBN_PROJECT_TYPE="oblt" ;;
  security)           ES_PROJECT_TYPE="security";      KBN_PROJECT_TYPE="security" ;;
  es|elasticsearch_general_purpose)
                      ES_PROJECT_TYPE="elasticsearch_general_purpose"; KBN_PROJECT_TYPE="es" ;;
  *)                  ES_PROJECT_TYPE="$PROJECT_TYPE";  KBN_PROJECT_TYPE="$PROJECT_TYPE" ;;
esac

command -v jq &>/dev/null || { echo "Error: jq required (brew install jq)" >&2; exit 1; }

echo "============================================================"
echo " CPS Two-Project Setup ($ES_PROJECT_TYPE) — 2-node clusters"
echo " Origin ES :9200   Linked ES :9210"
echo " Origin KBN:5601   Linked KBN:5602"
echo "============================================================"

wait_for_es() {
  local port=$1 label=$2 attempt=0
  echo "Waiting for $label ES (port $port)..."
  while ! curl -sk "https://localhost:$port/_cluster/health" \
    -u elastic_serverless:changeme 2>/dev/null | grep -q '"status"'; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge 60 ]]; then
      echo "ERROR: $label ES not ready after 5 min" >&2; exit 1
    fi
    sleep 5
  done
  echo "$label ES is ready."
}

# Kill linked containers too if restarting
if [[ -n "$KILL" ]]; then
  echo "Stopping existing linked containers..."
  docker container stop es01-linked es02-linked 2>/dev/null || true
  docker container rm es01-linked es02-linked 2>/dev/null || true
fi

# ---- Step 1: Origin ES (yarn es serverless -> 3 nodes, then stop es03) -------
echo ""
echo ">>> Step 1: Starting origin ES..."
cd "$REPO_ROOT"

yarn es serverless \
  --projectType "$ES_PROJECT_TYPE" \
  --uiam \
  --background \
  --skipTeardown \
  --port "$ORIGIN_ES_PORT" \
  --kibanaUrl "http://localhost:$ORIGIN_KBN_PORT/" \
  $KILL \
  $ES_IMAGE_FLAG \
  -E serverless.cross_project.enabled=true \
  -E remote_cluster_server.enabled=true

wait_for_es "$ORIGIN_ES_PORT" "Origin"

# Drop the third node to save memory — cluster already bootstrapped
echo "Stopping es03 to save memory (2-node origin)..."
docker container stop es03 > /dev/null 2>&1 || true

# ---- Step 2: Linked ES (2 nodes, small heap) --------------------------------
echo ""
echo ">>> Step 2: Starting linked ES..."

ORIGIN_IMAGE=$(docker inspect --format='{{.Config.Image}}' es01)
LINKED_CLUSTER_NAME="stateless-linked"
LINKED_DATA_PATH="stateless-linked"
PORT_OFFSET=10

mkdir -p "$REPO_ROOT/.es/$LINKED_DATA_PATH"
chmod 777 "$REPO_ROOT/.es/$LINKED_DATA_PATH"

LINKED_OPERATOR_DIR="$REPO_ROOT/.es/operator-linked"
mkdir -p "$LINKED_OPERATOR_DIR"
ORIGIN_SECRETS=$(jq '.state.cluster_secrets // {}' "$REPO_ROOT/.es/operator/settings.json" 2>/dev/null || echo '{}')

cat > "$LINKED_OPERATOR_DIR/settings.json" <<EOF
{
  "metadata": { "version": "100", "compatibility": "" },
  "state": {
    "project": {
      "id": "$LINKED_PROJECT_ID",
      "type": "$ES_PROJECT_TYPE",
      "alias": "linked_local_project",
      "organization": "$ORGANIZATION_ID",
      "tags": {
        "_id": "$LINKED_PROJECT_ID",
        "_type": "$ES_PROJECT_TYPE",
        "_alias": "linked_local_project",
        "_organization": "$ORGANIZATION_ID",
        "env": "local"
      }
    },
    "cluster_secrets": $ORIGIN_SECRETS
  }
}
EOF

# Build env-file from origin, overriding cluster-specific values
LINKED_ENV_FILE=$(mktemp)
trap 'rm -f "$LINKED_ENV_FILE"' EXIT

while IFS= read -r envvar; do
  [[ -z "$envvar" ]] && continue
  key="${envvar%%=*}"
  case "$key" in
    cluster.initial_master_nodes) echo "cluster.initial_master_nodes=es01-linked,es02-linked" ;;
    cluster.name)                 echo "cluster.name=$LINKED_CLUSTER_NAME" ;;
    stateless.object_store.bucket) echo "stateless.object_store.bucket=$LINKED_DATA_PATH" ;;
    serverless.project_id)        echo "serverless.project_id=$LINKED_PROJECT_ID" ;;
    http.port)                    echo "http.port=$LINKED_ES_PORT" ;;
    ES_JAVA_OPTS)                 echo "ES_JAVA_OPTS=-Xms768m -Xmx768m -Des.stateless.allow.index.refresh_interval.override=true" ;;
    discovery.seed_hosts|node.roles|path.repo|stateless.enabled|stateless.object_store.type) ;;
    node.name) ;;
    xpack.searchable.snapshot.*) ;;
    *)                            echo "$envvar" ;;
  esac
done < <(docker inspect es01 --format='{{range .Config.Env}}{{.}}
{{end}}' 2>/dev/null) > "$LINKED_ENV_FILE"

# Build volume flags from origin, swapping operator dir and object store
LINKED_VOL_FLAGS=()
while IFS='|' read -r src dst mode; do
  [[ -z "$src" || -z "$dst" ]] && continue
  if [[ "$dst" == *"/config/operator" ]]; then
    entry="${LINKED_OPERATOR_DIR}:${dst}"
    [[ -n "$mode" ]] && entry+=":${mode}"
    LINKED_VOL_FLAGS+=(--volume "$entry")
  elif [[ "$dst" == "/objectstore" ]]; then
    entry="${REPO_ROOT}/.es:/objectstore"
    [[ -n "$mode" ]] && entry+=":${mode}"
    LINKED_VOL_FLAGS+=(--volume "$entry")
  else
    entry="${src}:${dst}"
    [[ -n "$mode" ]] && entry+=":${mode}"
    LINKED_VOL_FLAGS+=(--volume "$entry")
  fi
done < <(docker inspect es01 --format='{{range .Mounts}}{{.Source}}|{{.Destination}}|{{.Mode}}
{{end}}' 2>/dev/null)

start_linked_node() {
  local name=$1 idx=$2 seed_hosts="" roles="" port_flags=() extra_env=()
  case $idx in
    0) seed_hosts="es02-linked"
       roles='["master","remote_cluster_client","ingest","index"]'
       port_flags=(-p "127.0.0.1:$((9300+PORT_OFFSET)):$((9300+PORT_OFFSET))"
                   -p "127.0.0.1:${LINKED_ES_PORT}:${LINKED_ES_PORT}") ;;
    1) seed_hosts="es01-linked"
       roles='["master","remote_cluster_client","ml","transform","search"]'
       extra_env=(--env "xpack.searchable.snapshot.shared_cache.size=16MB"
                  --env "xpack.searchable.snapshot.shared_cache.region_size=256K")
       port_flags=(-p "127.0.0.1:$((9202+PORT_OFFSET)):$((9202+PORT_OFFSET))"
                   -p "127.0.0.1:$((9302+PORT_OFFSET)):$((9302+PORT_OFFSET))") ;;
  esac
  echo "  Starting $name..."
  docker run --detach --interactive --tty --net elastic \
    --env-file "$LINKED_ENV_FILE" \
    --env "path.repo=/objectstore" \
    --env "stateless.enabled=true" \
    --env "stateless.object_store.type=fs" \
    --env "discovery.seed_hosts=$seed_hosts" \
    --env "node.roles=$roles" \
    --env "node.name=$name" \
    --name "$name" \
    "${port_flags[@]}" \
    "${extra_env[@]}" \
    "${LINKED_VOL_FLAGS[@]}" \
    "$ORIGIN_IMAGE" > /dev/null
}

for n in es01-linked es02-linked; do
  docker container rm "$n" --force 2>/dev/null || true
done
for i in 0 1; do
  start_linked_node "es0$((i+1))-linked" "$i"
done

wait_for_es "$LINKED_ES_PORT" "Linked"

# ---- Step 3: Link them -------------------------------------------------------
echo ""
echo ">>> Step 3: Linking projects..."

ORIGIN_SETTINGS="$REPO_ROOT/.es/operator/settings.json"
jq --arg pid "$LINKED_PROJECT_ID" \
   --arg type "$ES_PROJECT_TYPE" \
   --arg org "$ORGANIZATION_ID" \
   '
   .metadata.version = (.metadata.version | tonumber + 1 | tostring) |
   .state.linked = {
     projects: {
       ($pid): {
         alias: "linked_local_project",
         type: $type,
         endpoint: "es01-linked:9400",
         server_name: "linked-local-project",
         tags: { _alias: "linked_local_project", _id: $pid, _organization: $org, _type: $type, env: "local" }
       }
     }
   }
   ' "$ORIGIN_SETTINGS" > "$ORIGIN_SETTINGS.tmp" && mv "$ORIGIN_SETTINGS.tmp" "$ORIGIN_SETTINGS"

echo "Linked project registered. Waiting for link..."
for i in $(seq 1 12); do
  if curl -sk "https://localhost:$ORIGIN_ES_PORT/_remote/info" \
    -u elastic_serverless:changeme 2>/dev/null | jq -e '.linked_local_project.connected == true' &>/dev/null; then
    echo "CPS link established!"
    break
  fi
  [[ $i -eq 12 ]] && echo "WARNING: link not yet active, may need more time."
  sleep 5
done

echo ""
echo "============================================================"
echo " Done! Both ES clusters running and linked."
echo ""
echo " Start origin Kibana (terminal 1):"
echo "   yarn start --serverless=$KBN_PROJECT_TYPE --uiam --cps.cpsEnabled=true"
echo ""
echo " Start linked Kibana (terminal 2):"
echo "   yarn start --serverless=$KBN_PROJECT_TYPE --uiam --cps.cpsEnabled=true \\"
echo "     --server.port=$LINKED_KBN_PORT \\"
echo "     --elasticsearch.hosts=https://localhost:$LINKED_ES_PORT"
echo ""
echo " Verify: curl -sk https://localhost:$ORIGIN_ES_PORT/_remote/info -u elastic_serverless:changeme | jq"
echo " Stop:   docker container stop es01 es02 es01-linked es02-linked uiam uiam-cosmosdb"
echo "============================================================"
