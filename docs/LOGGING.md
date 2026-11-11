# Centralne logowanie ShiftPlannera

Grafana Alloy zbiera logi kontenerów zapisane przez runtime Kubernetes w `/var/log/pods` i przesyła je do Loki. Grafana odpytuje Loki przez wewnętrzną usługę `loki.monitoring.svc.cluster.local:3100`. Loki działa jako jeden proces i przechowuje skompresowane logi oraz indeks na lokalnym wolumenie. Wdrożenie mieści się na pojedynczej instancji EC2. [Tryby wdrożenia Loki](https://grafana.com/docs/loki/latest/get-started/deployment-modes/)

Alloy działa jako DaemonSet i dobiera pliki na podstawie metadanych podów na swoim węźle. Konto usługi może odczytywać listę i obserwować pody w `shiftplanner` i `kube-system`. Konfiguracja obejmuje kontenery `shiftplanner`, `traefik` i `coredns`. Alloy montuje katalog logów tylko do odczytu, rozpakowuje format CRI i zapisuje pozycje odczytu na osobnym wolumenie. [Odczyt plików w Alloy](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/)

Etykiety przekazywane przez Alloy to `namespace`, `pod`, `container` i `app`. Wzorce rozpoznające typowe klucze AWS, JWT, nagłówki autoryzacji, hasła i klucze serwisowe maskują dopasowane wartości przed wysłaniem do Loki. Filtry obejmują znane formaty. Kod aplikacji powinien pomijać dane wrażliwe podczas zapisu logów.

Udane żądania HTTP są widoczne w logu dostępu Traefika, a komunikaty procesu Next.js w logu kontenera aplikacji. W logach dostępu JSON zapisywane są metoda, status odpowiedzi, nazwa routera i czas obsługi. Konfiguracja pomija adresy klientów, nagłówki, ścieżki i parametry zapytania. [Konfiguracja logów Traefika](https://doc.traefik.io/traefik/observe/logs-and-access-logs/)

## Wdrożenie

Katalog `logging/` zawiera zasoby Loki i Alloy. Katalog `monitoring/` zawiera konfigurację istniejącej Grafany, w tym źródła danych Prometheus i Loki. Wersje obrazów są przypięte w manifestach, a Grafana instaluje wtyczki Prometheus i Loki w wersji `13.2.5`.

Przed wdrożeniem należy sprawdzić wolną pamięć, stan węzła i miejsce na dysku. Manifesty należy wyrenderować poleceniami `kubectl kustomize logging` i `kubectl kustomize monitoring`. Wynik należy przekazać do `k3s kubectl apply -f -` na EC2 przez AWS Systems Manager Run Command. Najpierw należy zastosować zasoby z `logging/` i potwierdzić ich gotowość, a następnie zastosować konfigurację Grafany z `monitoring/`. W istniejącym namespace należy zachować sekret `grafana-admin`. [Przekazywanie poleceń przez SSM](KUBERNETES.md#uruchomienie-klastra)

Logi dostępu wymagają zastosowania pliku [logging/traefik-access-logs.yaml](../logging/traefik-access-logs.yaml) w miejsce konfiguracji `traefik-config.yaml` w katalogu `/var/lib/rancher/k3s/server/manifests/`. Przed podmianą należy porównać istniejące wartości, zachować kopię oryginału poza katalogiem obserwowanym przez k3s i potwierdzić, że port hosta 80 oraz usługa `ClusterIP` są zachowane. Podmiana konfiguracji uruchamia rollout Traefika i może krótko przerwać dostęp HTTP. Po rolloucie należy sprawdzić `/api/health`.

## Zasoby i retencja

| Komponent | CPU request / limit | RAM request / limit | Przechowywanie |
|---|---|---|---|
| Loki | 50m / 250m | 100 MiB / 224 MiB | TSDB v13 i dane na `emptyDir` z limitem 512 MiB |
| Alloy | 20m / 150m | 48 MiB / 112 MiB | Pozycje odczytu na `emptyDir` z limitem 32 MiB |

Compactor Loki stosuje retencję 24 godzin. Fizyczne usunięcie danych następuje po przetworzeniu indeksu i upływie opóźnienia kasowania. Usunięcie poda Loki usuwa jego lokalną historię. Ograniczenia przyjmowania logów i wykonywania zapytań są zdefiniowane w konfiguracji Loki. [Retencja Loki](https://grafana.com/docs/loki/latest/operations/storage/retention/)

## Grafana i LogQL

Do Grafany należy połączyć się przez prywatny tunel AWS Systems Manager. Loki jest dodatkowym źródłem danych, a Prometheus pozostaje domyślny. W Grafana Explore należy wybrać źródło Loki i zakres czasu obejmujący poszukiwane zdarzenie. Dashboard `ShiftPlanner | Logs` pozwala zawęzić widok według namespace, poda i kontenera. Grafana wyświetla poziom logu, gdy można go odczytać z treści. Dashboard metryk ShiftPlannera zawiera link do dashboardu logów. [Dostęp przez tunel](MONITORING.md#dostęp-do-grafany)

```logql
{namespace="shiftplanner"}
{namespace="shiftplanner", container="shiftplanner"}
{namespace="kube-system", container="traefik"} | json | RouterName =~ ".*shiftplanner.*" | DownstreamStatus >= 500
```

## Diagnostyka

Polecenia należy wykonać na EC2 przez SSM. W razie braku danych należy sprawdzić stan komponentów, uprawnienia konta Alloy, zakres czasu i strumień w Grafana Explore.

```bash
k3s kubectl -n monitoring get pods,services,ingress
k3s kubectl -n monitoring exec daemonset/alloy -- alloy validate /etc/alloy/config.alloy
k3s kubectl -n monitoring logs daemonset/alloy --tail=50
k3s kubectl -n monitoring logs deployment/loki --tail=50
loki_uid=$(k3s kubectl -n monitoring get pods -l app.kubernetes.io/name=loki \
  -o 'jsonpath={.items[0].metadata.uid}')
du -sh "/var/lib/kubelet/pods/$loki_uid/volumes/kubernetes.io~empty-dir/data"
k3s kubectl top pods -n monitoring --containers
free -m
df -h /
```

## Usunięcie komponentów logowania

1. Należy zastosować konfigurację Grafany sprzed Etapu 8 z rewizji `c2b2d18` lub usunąć z bieżących manifestów źródło Loki, instalację jego wtyczki, dashboard logów i link do niego. Po rolloucie należy sprawdzić domyślne źródło Prometheus i dashboard metryk.
2. Należy przywrócić poprzedni `traefik-config.yaml` w katalogu manifestów k3s i po rolloucie potwierdzić odpowiedź `/api/health`. Kopia z wdrożenia znajduje się w `/var/lib/rancher/k3s/server/shiftplanner-logging/traefik-config.before.yaml`.
3. Należy usunąć zasoby z `logging/kustomization.yaml` przez `k3s kubectl delete -k logging` lub przesłać wyrenderowany manifest do `k3s kubectl delete -f -`. Usunięcie poda Loki usuwa zebrane logi.
4. Należy sprawdzić, czy w namespace `monitoring` nadal działają Grafana, Prometheus i eksportery metryk.
