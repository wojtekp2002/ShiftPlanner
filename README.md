# ShiftPlanner

ShiftPlanner to aplikacja do zbierania dostępności pracowników i planowania zmian w zespołach. Część DevOps automatyzuje budowanie, publikację i wdrażanie aplikacji oraz zapewnia dostęp do metryk i logów środowiska demonstracyjnego.

## Architektura

Push do GitHub uruchamia GitHub Actions. Runner pobiera tymczasowe poświadczenia przez AWS OIDC i publikuje obraz w prywatnym ECR. Po pomyślnym CI dla pushu na `main` osobny job zleca przez AWS Systems Manager aktualizację Deployment na k3s. Węzeł EC2 pobiera obraz z ECR, a Traefik udostępnia aplikację przez HTTP. Aplikacja korzysta z zewnętrznego projektu Supabase. [Diagram i opis architektury](docs/ARCHITECTURE.md)

| Obszar | Technologie |
|---|---|
| Aplikacja | Next.js, TypeScript, Supabase |
| Pakowanie i automatyzacja | Docker, GitHub Actions |
| Infrastruktura | Terraform, AWS EC2, IAM, ECR i Systems Manager |
| Uruchomienie | k3s, Kubernetes, Traefik |
| Metryki | Prometheus, Grafana, kube-state-metrics, node-exporter, Blackbox Exporter |
| Logi | Grafana Alloy, Loki, Grafana |

## CI

Workflow uruchamia się po pushu do dowolnej gałęzi oraz ręcznie przez `workflow_dispatch`. Wykonuje `npm ci`, lint, generowanie typów, kontrolę TypeScript, produkcyjny build Next.js i budowę obrazu Dockera. Obraz w ECR otrzymuje tag równy pełnemu SHA commita. [Instrukcja CI](docs/CI.md)

## CD

Po udanym CI dla aktualnego commita na `main` job wdrożeniowy aktualizuje obraz na klastrze przez SSM, czeka na rollout i sprawdza publiczny endpoint `/api/health`. GitHub Actions publikuje podsumowania CI i CD. Opcjonalne powiadomienia Discord wymagają konfiguracji sekretu repozytorium `DISCORD_WEBHOOK_URL`. [Instrukcja CD i rollbacku](docs/CD.md)

## Infrastructure as Code

Terraform opisuje sieć, instancję EC2, repozytorium ECR oraz role IAM dla instancji i GitHub Actions. Parametry środowiska i stan Terraform należy przechowywać poza Gitem. Odtworzenie obejmuje przygotowanie AWS, konfigurację GitHub Actions, bootstrap klastra oraz zastosowanie manifestów aplikacji i obserwowalności. [Konfiguracja Terraform](infra/README.md), [Odtworzenie środowiska](docs/DEPLOYMENT.md)

## Monitoring

Prometheus zbiera metryki hosta, Kubernetes i kontenera aplikacji. Blackbox Exporter sprawdza odpowiedź `/api/health` przez Traefika, a dashboard Grafany pokazuje m.in. stan poda, dostępność, CPU i RAM. Dostęp operatorski do Grafany odbywa się przez tunel SSM. [Instrukcja monitoringu](docs/MONITORING.md)

## Logging

Grafana Alloy odczytuje pliki CRI ShiftPlannera i wybranych podów systemowych, po czym przesyła logi do Loki. W Grafanie dostępne są Explore i dashboard logów z filtrowaniem według namespace, poda i kontenera. [Instrukcja logowania](docs/LOGGING.md)

## Security

CI i CD korzystają z osobnych ról IAM o ograniczonych uprawnieniach. Instancja wymaga IMDSv2, a administracja odbywa się przez SSM. Aplikacja uruchamia się jako użytkownik bez uprawnień roota. ECR ma niezmienne tagi i skanuje publikowane obrazy. Prometheus, Grafana i Loki są dostępne przez usługi wewnętrzne klastra. [Przegląd zabezpieczeń i podatności](docs/SECURITY.md)

## Dokumentacja

| Temat | Dokument |
|---|---|
| Przepływ danych i granice systemu | [Architektura](docs/ARCHITECTURE.md) |
| Instalacja od podstaw | [Wdrożenie](docs/DEPLOYMENT.md) |
| Budowa i publikacja | [CI](docs/CI.md) |
| Wdrożenie automatyczne i rollback | [CD](docs/CD.md) |
| Bootstrap klastra i aplikacja | [Kubernetes](docs/KUBERNETES.md) |
| Metryki i alerty | [Monitoring](docs/MONITORING.md) |
| Zbieranie i wyszukiwanie logów | [Logging](docs/LOGGING.md) |
| Utwardzenie i audyt zależności | [Zabezpieczenia](docs/SECURITY.md), [Podatności](docs/VULNERABILITIES.md) |
| Sieć, EC2, ECR i IAM | [Terraform](infra/README.md) |
| Przygotowanie pokazu | [Scenariusz demonstracji](docs/DEMO.md) |
| Pokrycie kryteriów projektu | [Checklista wymagań](docs/REQUIREMENTS.md) |

## Cleanup

Po zakończeniu korzystania ze środowiska należy zachować potrzebne dane, zweryfikować plan usunięcia i usunąć zasoby AWS zarządzane przez Terraform. Należy użyć właściwego konta, regionu i zachowanego stanu oraz sprawdzić zasoby po wykonaniu procedury. [Instrukcja sprzątania](docs/CLEANUP.md)
