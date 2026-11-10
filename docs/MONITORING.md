# Monitoring ShiftPlanner

Monitoring działa w namespace `monitoring` na istniejącym, jednowęzłowym klastrze k3s. Zastosowano osobne komponenty o ograniczonym zużyciu zasobów. Wersje obrazów i konfiguracja znajdują się w [manifestach](../monitoring/kustomization.yaml).

| Komponent | Dane i zadania |
|---|---|
| Prometheus | Zbiera metryki co 30 sekund, zapisuje szeregi czasowe i ocenia reguły alertów. |
| kube-state-metrics | Udostępnia stan węzłów, fazy podów, restarty kontenerów oraz liczbę żądanych i dostępnych replik Deployment. |
| node-exporter | Udostępnia zużycie CPU, pamięci i systemu plików EC2. Odczytuje dane hosta z montowania tylko do odczytu. |
| Kubelet i cAdvisor | Udostępniają CPU i pamięć kontenera ShiftPlanner. Prometheus używa konta usługi z prawem odczytu metryk węzła i weryfikuje certyfikat kubeleta. |
| Blackbox Exporter | Wywołuje `/api/health` przez wewnętrzną usługę Traefika. Sonda wymaga HTTP 200 i pola JSON `status` o wartości `ok`. |
| Grafana | Korzysta z wewnętrznego źródła danych Prometheus i ładuje dashboard ShiftPlanner z repozytorium. |

Sonda sprawdza trasę od Traefika do aplikacji wewnątrz klastra. Publiczny adres HTTP można sprawdzić osobnym żądaniem GET z zewnątrz. [Konfiguracja wdrożenia Kubernetes](KUBERNETES.md)

## Wdrożenie

Manifesty należy wyrenderować lokalnie poleceniem `kubectl kustomize monitoring`. Przez AWS Systems Manager Run Command należy najpierw zastosować manifest namespace, utworzyć sekret Grafany i zastosować wyrenderowane zasoby. Przykład przekazania skryptu z PowerShell do SSM znajduje się w instrukcji wdrożenia k3s. Wyrenderowany YAML można przekazać jako treść bloku heredoc dla `k3s kubectl apply -f -`. [Procedura Run Command](KUBERNETES.md#uruchomienie-klastra)

Sekret `grafana-admin` należy utworzyć jednorazowo na EC2, w powłoce uruchomionej przez SSM. Poniższy skrypt generuje hasło na instancji i nie umieszcza jego wartości w wyniku polecenia. Przy ponownym zastosowaniu manifestów należy zachować istniejący sekret.

```bash
set -eu
k3s kubectl create namespace monitoring --dry-run=client -o yaml | k3s kubectl apply -f -
if [ -z "$(k3s kubectl -n monitoring get secret grafana-admin --ignore-not-found -o name)" ]; then
  password_file=$(mktemp)
  trap 'rm -f -- "$password_file"' EXIT
  openssl rand -hex 24 | tr -d '\n' > "$password_file"
  k3s kubectl -n monitoring create secret generic grafana-admin \
    --from-file=admin-password="$password_file"
fi
```

Jeżeli pliki repozytorium są dostępne w powłoce na EC2, komplet zasobów należy zastosować poleceniem `k3s kubectl apply -k monitoring`.

## Dostęp do Grafany

Grafana i Prometheus używają usług `ClusterIP`. Grafana wymaga zalogowania. Dostęp operatorski odbywa się przez tunel AWS Systems Manager, dzięki czemu panel administracyjny nie wymaga publicznego adresu HTTP.

Wynik poniższego polecenia, wykonanego na EC2 przez SSM, podaje wewnętrzny adres usługi Grafany.

```bash
k3s kubectl -n monitoring get svc grafana -o jsonpath='{.spec.clusterIP}'
```

W lokalnym PowerShell należy użyć AWS CLI z wtyczką Session Manager i uprawnieniami do rozpoczęcia sesji na instancji ShiftPlanner. [Instalacja wtyczki w systemie Windows](https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-windows.html)

```powershell
$region = terraform '-chdir=infra' output -raw aws_region
$instanceId = terraform '-chdir=infra' output -raw ec2_instance_id
$grafanaIp = Read-Host 'ClusterIP usługi grafana'
aws ssm start-session --region $region --target $instanceId `
  --document-name AWS-StartPortForwardingSessionToRemoteHost `
  --parameters "host=$grafanaIp,portNumber=3000,localPortNumber=13000"
```

Po otwarciu tunelu panel jest dostępny pod `http://127.0.0.1:13000/d/shiftplanner/shiftplanner-7c-monitoring`. Nazwa użytkownika to `admin`. Osoba uprawniona może odczytać hasło z sekretu w prywatnej sesji operatorskiej z wyłączonym zapisem transkryptu. Hasła nie należy pobierać przez logowany Run Command ani umieszczać w plikach repozytorium. [Tunelowanie w Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html#sessions-remote-port-forwarding)

```bash
sudo k3s kubectl -n monitoring get secret grafana-admin \
  -o jsonpath='{.data.admin-password}' | base64 -d
printf '\n'
```

Źródło danych Prometheus i dashboard ShiftPlanner są ładowane automatycznie. Kontener inicjalizacyjny Grafany instaluje wtyczkę Prometheus w przypiętej wersji `13.2.5` z katalogu Grafana Labs. Dashboard pokazuje CPU i RAM węzła, stan podów, restarty kontenerów, CPU i RAM ShiftPlanner, dostępne repliki oraz wynik sondy. [Konfiguracja dashboardu](../monitoring/dashboards/shiftplanner.json), [Wtyczka Prometheus](https://grafana.com/grafana/plugins/prometheus/)

## Alerty

| Reguła | Warunek |
|---|---|
| `ShiftPlannerDown` | Nieudana lub brakująca sonda przez 2 minuty. |
| `PodRestartingFrequently` | Wzrost licznika restartów kontenera o co najmniej 3 w oknie 10 minut, utrzymujący się przez 1 minutę. |
| `HighNodeMemoryUsage` | Wykorzystanie RAM hosta powyżej 85% przez 5 minut. |

Stan reguł można odczytać w Prometheus. Reguły działają bez zewnętrznego kanału powiadomień.

## Zasoby i retencja

| Komponent | CPU request / limit | RAM request / limit |
|---|---|---|
| Prometheus | 50m / 300m | 96 MiB / 256 MiB |
| Grafana | 25m / 200m | 128 MiB / 256 MiB |
| kube-state-metrics | 15m / 100m | 32 MiB / 96 MiB |
| node-exporter | 10m / 100m | 24 MiB / 64 MiB |
| Blackbox Exporter | 10m / 80m | 24 MiB / 64 MiB |

Prometheus usuwa najstarsze bloki po osiągnięciu 2 dni retencji lub progu rozmiaru 256 MiB. Dane i pliki bieżącego zapisu mieszczą się w wolumenie `emptyDir` z limitem 512 MiB. Usunięcie poda usuwa historię Prometheusa. Lokalna baza Grafany również używa `emptyDir`. Źródło danych i dashboard zostają odtworzone z manifestów przy uruchomieniu poda. [Retencja Prometheusa](https://prometheus.io/docs/prometheus/latest/storage/)

## Diagnostyka

Polecenia wykonuje się na EC2 przez SSM.

```bash
k3s kubectl -n monitoring get pods,services,ingress
k3s kubectl -n monitoring logs deployment/prometheus --tail=50
k3s kubectl -n monitoring logs deployment/grafana --tail=50
k3s kubectl -n monitoring exec deployment/prometheus -- \
  promtool check config /etc/prometheus/prometheus.yml
k3s kubectl top nodes
k3s kubectl top pods -A
free -m
df -h /
```

Prometheus udostępnia `/targets`, `/alerts` oraz API `/api/v1/targets` z sieci klastra. W przypadku braku danych aplikacji należy sprawdzić target `kubelet-cadvisor`, a w przypadku awarii sondy odczytać `probe_success` i `probe_http_status_code` dla joba `shiftplanner-health`. [API Prometheusa](https://prometheus.io/docs/prometheus/latest/querying/api/)
