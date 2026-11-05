#!/usr/bin/env bash
set -euo pipefail

: "${ECR_REGISTRY:?ECR_REGISTRY is required}"
: "${ECR_REPOSITORY:?ECR_REPOSITORY is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"

image="$ECR_REGISTRY/$ECR_REPOSITORY:$GITHUB_SHA"

image_exists() {
  local response
  if response=$(aws ecr describe-images \
    --repository-name "$ECR_REPOSITORY" \
    --image-ids "imageTag=$GITHUB_SHA" \
    --query 'imageDetails[0].imageDigest' \
    --output text 2>&1); then
    return 0
  fi
  if [[ "$response" == *"(ImageNotFoundException)"* ]]; then
    return 1
  fi
  printf '%s\n' "$response" >&2
  return 2
}

if image_exists; then
  echo "Image $image already exists. Push skipped."
  exit 0
else
  lookup_status=$?
  if [[ "$lookup_status" -ne 1 ]]; then
    exit "$lookup_status"
  fi
fi

if docker push "$image"; then
  echo "Published $image."
  exit 0
fi

# Another publisher may have created the immutable tag after the lookup.
if image_exists; then
  echo "Image $image was published concurrently. Existing tag retained."
  exit 0
fi

echo "Failed to publish $image." >&2
exit 1
