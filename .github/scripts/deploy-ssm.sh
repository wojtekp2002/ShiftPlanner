#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${EC2_INSTANCE_ID:?EC2_INSTANCE_ID is required}"
: "${IMAGE_URI:?IMAGE_URI is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
: "${HEALTH_URL:?HEALTH_URL is required}"

if [[ ! "$AWS_REGION" =~ ^[a-z]{2}(-[a-z]+)+-[0-9]+$ ||
      ! "$EC2_INSTANCE_ID" =~ ^i-([0-9a-f]{8}|[0-9a-f]{17})$ ||
      ! "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Invalid AWS region, EC2 instance ID, or commit SHA.' >&2
  exit 1
fi

if [[ ! "$IMAGE_URI" =~ ^[0-9]{12}\.dkr\.ecr\.${AWS_REGION}\.amazonaws\.com/shiftplanner:${GITHUB_SHA}$ ]]; then
  echo 'The image must be the ShiftPlanner ECR image for the current commit.' >&2
  exit 1
fi

if [[ ! "$HEALTH_URL" =~ ^http://([0-9]{1,3}\.){3}[0-9]{1,3}/api/health$ ]]; then
  echo 'HEALTH_URL must point to /api/health on the public EC2 IPv4 address.' >&2
  exit 1
fi

remote_script=$(cat <<'REMOTE_SCRIPT'
set -eu

kube() {
  k3s kubectl --namespace shiftplanner "$@"
}

container_image='{.spec.template.spec.containers[?(@.name=="shiftplanner")].image}'
previous_image=$(kube get deployment shiftplanner -o "jsonpath=$container_image")
if [ -z "$previous_image" ]; then
  echo 'The shiftplanner container was not found in the Deployment.' >&2
  exit 1
fi
printf 'Previous image: %s\n' "$previous_image"

kube set image deployment/shiftplanner "shiftplanner=$image"
kube rollout status deployment/shiftplanner --timeout=180s
kube get deployment shiftplanner
kube get pods -l app.kubernetes.io/name=shiftplanner

deployed_image=$(kube get deployment shiftplanner -o "jsonpath=$container_image")
pod=$(kube get pods -l app.kubernetes.io/name=shiftplanner --field-selector=status.phase=Running \
  -o 'go-template={{range .items}}{{if not .metadata.deletionTimestamp}}{{.metadata.name}}{{"\n"}}{{end}}{{end}}')
case "$pod" in
  ''|*[!a-z0-9-]*)
    echo 'Expected exactly one running ShiftPlanner pod.' >&2
    exit 1
    ;;
esac
pod_image=$(kube get pod "$pod" -o 'jsonpath={.spec.containers[?(@.name=="shiftplanner")].image}')
pod_ready=$(kube get pod "$pod" -o 'jsonpath={.status.containerStatuses[?(@.name=="shiftplanner")].ready}')
pod_image_id=$(kube get pod "$pod" -o 'jsonpath={.status.containerStatuses[?(@.name=="shiftplanner")].imageID}')
printf 'Deployment image: %s\nPod %s image: %s\nPod image ID: %s\n' \
  "$deployed_image" "$pod" "$pod_image" "$pod_image_id"

if [ "$deployed_image" != "$image" ] || [ "$pod_image" != "$image" ] ||
   [ "$pod_ready" != true ] || [ -z "$pod_image_id" ]; then
  echo 'The Deployment and its ready pod must use the requested image.' >&2
  exit 1
fi
REMOTE_SCRIPT
)
parameters=$(jq -cn --arg image "$IMAGE_URI" --arg script "$remote_script" \
  '{commands: [("#!/bin/sh\nimage=" + ($image | @sh) + "\n" + $script)], executionTimeout: ["240"]}')

aws_ssm=(aws ssm --region "$AWS_REGION" --no-cli-pager --cli-connect-timeout 5 --cli-read-timeout 10)
command_id=$(AWS_MAX_ATTEMPTS=1 "${aws_ssm[@]}" send-command \
  --document-name AWS-RunShellScript \
  --instance-ids "$EC2_INSTANCE_ID" \
  --timeout-seconds 60 \
  --comment "ShiftPlanner deploy $GITHUB_SHA" \
  --parameters "$parameters" \
  --query 'Command.CommandId' --output text)
if [[ ! "$command_id" =~ ^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$ ]]; then
  echo 'SSM did not return a valid command ID.' >&2
  exit 1
fi
printf 'SSM command ID: %s\n' "$command_id"

deadline=$((SECONDS + 360))
last_status=''
while (( SECONDS < deadline )); do
  if invocation=$("${aws_ssm[@]}" get-command-invocation \
    --command-id "$command_id" --instance-id "$EC2_INSTANCE_ID" --output json 2>&1); then
    status=$(jq -er '.Status' <<< "$invocation")
    if [[ "$status" != "$last_status" ]]; then
      jq -r '"SSM invocation: \(.StatusDetails // .Status)"' <<< "$invocation"
      last_status=$status
    fi
    case "$status" in
      Pending|InProgress|Delayed|Cancelling) ;;
      *)
        jq -r '"SSM exit code: \(.ResponseCode)\n--- stdout ---\n\(.StandardOutputContent // "")"' <<< "$invocation"
        jq -r '"--- stderr ---\n\(.StandardErrorContent // "")"' <<< "$invocation" >&2
        jq -e '.Status == "Success" and .ResponseCode == 0' <<< "$invocation" >/dev/null
        break
        ;;
    esac
  elif [[ "$invocation" != *'(InvocationDoesNotExist)'* ]]; then
    printf '%s\n' "$invocation" >&2
    exit 1
  fi
  sleep 5
done
if [[ "$last_status" != Success ]]; then
  echo 'Timed out while waiting for the SSM invocation to complete.' >&2
  exit 1
fi

health_body=$(mktemp)
trap 'rm -f -- "$health_body"' EXIT
for attempt in {1..10}; do
  if http_status=$(curl --silent --show-error --noproxy '*' --connect-timeout 3 --max-time 8 \
      --output "$health_body" --write-out '%{http_code}' "$HEALTH_URL") &&
     [[ "$http_status" == 200 ]] && jq -se '. == [{"status":"ok"}]' "$health_body" >/dev/null; then
    printf 'Public health check: HTTP %s, %s\n' "$http_status" "$(cat "$health_body")"
    exit 0
  fi
  printf 'Public health check attempt %s/10 failed (HTTP %s).\n' "$attempt" "${http_status:-unavailable}" >&2
  if (( attempt < 10 )); then
    sleep 3
  fi
done
exit 1
