# Checklista wymagań projektu

Tabela obejmuje 15 kryteriów. Powiadomienia CI i CD są dostępne w GitHub Actions. Discord stanowi dodatkowy kanał wymagający ustawienia sekretu repozytorium i osobnego potwierdzenia dostarczenia.

| Wymaganie | Implementacja | Weryfikacja |
|---|---|---|
| Publiczne repozytorium i aplikacja | Publiczne repozytorium GitHub oraz Traefik na publicznym IPv4 EC2. [Ingress](../k8s/ingress.yaml) | Otworzyć repozytorium bez logowania i sprawdzić HTTP 200 na `/`, `/auth/login` i `/api/health`. |
| Infrastructure as Code | Terraform dla sieci, EC2, ECR i IAM. [Konfiguracja](../infra/) | Wykonać `terraform fmt -check`, `terraform validate` i przejrzeć plan. |
| Idempotentna infrastruktura | Terraform, deklaratywne manifesty i zachowanie AMI istniejącej instancji przy aktualizacji publicznego parametru SSM. [Instrukcja wdrożenia](DEPLOYMENT.md) | Ponowić `terraform plan` dla tego samego stanu i sprawdzić, czy Terraform zgłasza brak zmian. |
| Automatyczne CI | Build i kontrole po pushu do dowolnej gałęzi. [Workflow](../.github/workflows/ci.yml) | Sprawdzić wynik kroków lint, kontroli typów i builda w GitHub Actions. |
| Publikacja artefaktu | Prywatne ECR, obraz OCI z niezmiennym tagiem pełnego SHA. [Publikacja obrazu](../.github/scripts/push-ecr-image.sh) | Porównać tag i digest w ECR z SHA commita i obrazem uruchomionym w klastrze. |
| Automatyczne wdrożenie z `main` | Job CD zleca aktualizację obrazu przez SSM. [CD](CD.md) | Potwierdzić sukces joba i rolloutu oraz odpowiedź `/api/health`. |
| Powiadomienie o wyniku CI i CD | Podsumowania GitHub Actions i opcjonalny webhook Discord. [Workflow](../.github/workflows/ci.yml) | Odczytać wyniki jobów w podsumowaniu. Dostarczenie na Discord można potwierdzić po skonfigurowaniu sekretu. |
| Monitoring infrastruktury | Prometheus, node-exporter, kube-state-metrics i Grafana. [Manifesty](../monitoring/) | Sprawdzić stan targetów i odczytać CPU, RAM oraz stan węzła. |
| Monitoring aplikacji | Sonda Blackbox Exporter dla `/api/health`, metryki poda oraz reguły alertów. [Prometheus](../monitoring/prometheus.yaml) | Potwierdzić wynik sondy i dostępność repliki na dashboardzie. |
| Docker | Wieloetapowy build i końcowy użytkownik bez uprawnień roota. [Dockerfile](../web/Dockerfile) | Sprawdzić krok budowy i użytkownika procesu działającego w podzie. |
| Kubernetes | Deployment, Service, Ingress oraz sondy gotowości i żywotności w k3s. [Manifesty aplikacji](../k8s/) | Sprawdzić status `Ready` węzła, Deployment i poda. |
| Centralne logowanie | Alloy zbiera pliki CRI, Loki przechowuje wpisy, Grafana udostępnia zapytania. [Manifesty](../logging/) | Odtworzyć zapytanie Loki dla namespace `shiftplanner` i sprawdzić logi po żądaniu testowym. |
| Zabezpieczenia | OIDC, osobne role IAM, SSM, IMDSv2, prywatne usługi i skan ECR. [Przegląd](SECURITY.md) | Sprawdzić ustawienia EC2 i ECR, warunki zaufania ról oraz dostęp do usług. |
| Dokumentacja | README, diagram, odtworzenie i scenariusz demonstracji. [Dokumentacja](../README.md#dokumentacja) | Przejść od diagramu do instrukcji wdrożenia, diagnostyki i demonstracji. |
| Cleanup | Procedura usunięcia zasobów klastra i infrastruktury. [Cleanup](CLEANUP.md) | Sprawdzić konto, stan i przewidywane zasoby w planie usunięcia przed wykonaniem. |
