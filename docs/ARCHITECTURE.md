# Architektura ShiftPlanner

```mermaid
flowchart LR
    DEV["Deweloper"]
    USER["Przeglądarka"]
    OPS["Operator"]
    SUPA["Supabase<br/>Uwierzytelnianie i baza danych"]

    subgraph GH["GitHub"]
        REPO["Repozytorium"]
        CI["GitHub Actions<br/>CI: każda gałąź"]
        CD["GitHub Actions<br/>CD: push na main"]
        REPO --> CI
        CI -->|udane CI dla main| CD
    end

    subgraph AWS["AWS · eu-central-1"]
        STS["AWS STS<br/>GitHub OIDC"]
        CIROLE["IAM · rola CI"]
        CDROLE["IAM · rola CD"]
        HOSTROLE["IAM · rola EC2"]
        ECR["Prywatne ECR<br/>Tag pełnego SHA"]
        SSM["AWS Systems Manager"]
        STS -.-> CIROLE
        STS -.-> CDROLE
        CIROLE -.->|publikacja| ECR
        CDROLE -.->|Run Command| SSM
        HOSTROLE -.->|pobieranie obrazu| ECR

        subgraph EC2["VPC · EC2 t3.small"]
            AGENT["Agent SSM"]
            subgraph K3S["Jednowęzłowy klaster k3s"]
                TR["Traefik"]
                SVC["Service ShiftPlanner"]
                APP["Deployment / Pod ShiftPlanner"]
                MET["Metryki węzła i podów"]
                BB["Blackbox Exporter"]
                PROM["Prometheus"]
                CRI["Pliki logów CRI"]
                ALLOY["Grafana Alloy"]
                LOKI["Loki"]
                GRAF["Grafana"]
                TR --> SVC --> APP
                BB -->|GET /api/health| TR
                MET --> PROM
                BB --> PROM
                APP --> CRI
                TR --> CRI
                CRI --> ALLOY --> LOKI
                PROM -->|metryki| GRAF
                LOKI -->|logi| GRAF
            end
            AGENT -->|kubectl set image i rollout| APP
            AGENT -->|tunel prywatny| GRAF
        end
        SSM --> AGENT
        ECR -->|obraz kontenera| APP
    end

    DEV -->|git push| REPO
    CI -.->|token OIDC| STS
    CD -.->|token OIDC| STS
    CI -->|build i push obrazu| ECR
    CD -->|zlecenie wdrożenia po publikacji| SSM
    USER -->|HTTP 80| TR
    APP -->|uwierzytelnianie i dane| SUPA
    OPS -->|sesja SSM| SSM
```

Rola CI publikuje obraz w ECR. Po jego publikacji rola CD zleca polecenie SSM na docelowej instancji. Agent wykonuje lokalnie `k3s kubectl set image` oraz sprawdza rollout. Obraz pobiera węzeł z ECR przez dostawcę poświadczeń kubeleta, korzystającego z roli EC2. Polecenie SSM przenosi identyfikator obrazu, a dane obrazu płyną bezpośrednio z ECR do węzła. [Uprawnienia OIDC](../infra/github_oidc.tf), [Pobieranie obrazu](KUBERNETES.md#dostęp-administracyjny-i-pobieranie-obrazu)

Ruch użytkowników trafia przez publiczny port 80 do Traefika i dalej do usługi aplikacji. Supabase działa poza granicą AWS projektu. Operator otwiera tunel SSM do wewnętrznej usługi Grafana. Prometheus i Loki udostępniają dane Grafanie w obrębie klastra. [Monitoring](MONITORING.md), [Centralne logowanie](LOGGING.md)

Środowisko demonstracyjne korzysta z jednej instancji `t3.small` i jednej repliki aplikacji. Restart lub wymiana węzła może przerwać dostęp. Dane Prometheusa i Loki korzystają z lokalnych wolumenów efemerycznych. Odtworzenie środowiska i usunięcie jego zasobów opisano osobno. [Odtworzenie](DEPLOYMENT.md), [Sprzątanie](CLEANUP.md)
