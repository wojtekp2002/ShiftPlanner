#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

readonly k3s_version='v1.37.2+k3s1'
readonly provider_version='v1.37.1'
readonly provider_sha256='f05b9d72cfd73782e75943d746172cbad5bc89a0e42b0cd98b784565f1bfe33e'
readonly installer_sha256='ed01f89fd977bf20ac1516bbebf8370bf3ddbaa55dac8aba610956a4c78cc00b'
readonly config_dir='/etc/rancher/k3s'
readonly provider_dir='/opt/shiftplanner/credential-providers'
readonly manifests_dir='/var/lib/rancher/k3s/server/manifests'

source /etc/os-release
if [[ $EUID -ne 0 || $ID != amzn || $VERSION_ID != 2023 || $(uname -m) != x86_64 ]]; then
  echo 'Bootstrap requires root on Amazon Linux 2023 x86_64.' >&2
  exit 1
fi

if command -v k3s >/dev/null; then
  installed_version=$(k3s --version | awk 'NR == 1 { print $3 }')
  if [[ $installed_version != "$k3s_version" || ! -f $config_dir/config.yaml ]]; then
    echo 'An existing k3s installation needs a separate review.' >&2
    exit 1
  fi
fi

stage_dir=$(mktemp -d)
trap 'rm -rf -- "$stage_dir"' EXIT

cat > "$stage_dir/config.yaml" <<'YAML'
disable:
  - servicelb
write-kubeconfig-mode: "0600"
image-credential-provider-bin-dir: /opt/shiftplanner/credential-providers
image-credential-provider-config: /etc/rancher/k3s/ecr-credential-provider.yaml
YAML

cat > "$stage_dir/ecr-credential-provider.yaml" <<'YAML'
apiVersion: kubelet.config.k8s.io/v1
kind: CredentialProviderConfig
providers:
  - name: ecr-credential-provider
    matchImages:
      - 660140202510.dkr.ecr.eu-central-1.amazonaws.com/shiftplanner
    defaultCacheDuration: 1h
    apiVersion: credentialprovider.kubelet.k8s.io/v1
YAML

cat > "$stage_dir/traefik-config.yaml" <<'YAML'
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |-
    service:
      spec:
        type: ClusterIP
    ports:
      web:
        hostPort: 80
    updateStrategy:
      type: Recreate
YAML

check_config() {
  local source_file=$1 target_file=$2
  if [[ -e $target_file ]] && ! cmp -s "$source_file" "$target_file"; then
    printf 'Existing configuration differs: %s\n' "$target_file" >&2
    exit 1
  fi
}

check_config "$stage_dir/config.yaml" "$config_dir/config.yaml"
check_config "$stage_dir/ecr-credential-provider.yaml" "$config_dir/ecr-credential-provider.yaml"
check_config "$stage_dir/traefik-config.yaml" "$manifests_dir/traefik-config.yaml"

curl --fail --location --silent --show-error --retry 3 --max-time 120 \
  "https://artifacts.k8s.io/binaries/cloud-provider-aws/$provider_version/linux/amd64/ecr-credential-provider-linux-amd64" \
  --output "$stage_dir/ecr-credential-provider"
curl --fail --location --silent --show-error --retry 3 --max-time 120 \
  "https://raw.githubusercontent.com/k3s-io/k3s/$k3s_version/install.sh" \
  --output "$stage_dir/install.sh"
printf '%s  %s\n' "$provider_sha256" "$stage_dir/ecr-credential-provider" \
  "$installer_sha256" "$stage_dir/install.sh" | sha256sum --check

install -d -m 0755 "$config_dir" "$provider_dir" "$manifests_dir"
install -m 0755 "$stage_dir/ecr-credential-provider" "$provider_dir/ecr-credential-provider"
install -m 0600 "$stage_dir/config.yaml" "$config_dir/config.yaml"
install -m 0600 "$stage_dir/ecr-credential-provider.yaml" "$config_dir/ecr-credential-provider.yaml"
install -m 0644 "$stage_dir/traefik-config.yaml" "$manifests_dir/traefik-config.yaml"

INSTALL_K3S_VERSION="$k3s_version" INSTALL_K3S_EXEC=server sh "$stage_dir/install.sh"
k3s --version
systemctl status k3s --no-pager --lines=0
node="node/$(hostname)"
k3s kubectl wait --for=create "$node" --timeout=240s
k3s kubectl wait --for=condition=Ready "$node" --timeout=240s
k3s kubectl get nodes
