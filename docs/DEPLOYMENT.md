# Odtworzenie środowiska ShiftPlanner

Procedura obejmuje utworzenie zasobów AWS, publikację pierwszego obrazu i uruchomienie aplikacji w jednowęzłowym klastrze k3s. Polecenia PowerShell należy wykonywać w katalogu głównym repozytorium. Polecenia Bash są przeznaczone dla EC2 i należy przesyłać je przez AWS Systems Manager.

## 1. Przygotowanie

- Należy przygotować Git, PowerShell, Terraform zgodny z `infra/versions.tf`, AWS CLI v2 oraz `kubectl` z poleceniem `kustomize`. Dostęp do Grafany wymaga wtyczki Session Manager. Node.js 22, npm i Docker są potrzebne lokalnie przy samodzielnym sprawdzaniu aplikacji. Runner GitHub przygotowuje własne środowisko CI.
- Należy mieć uprawnienia do konfiguracji repozytorium GitHub, uruchamiania GitHub Actions, zarządzania zasobami projektu w AWS oraz używania SSM Run Command. Domyślną gałęzią repozytorium powinna być `main`.
- Należy przygotować działający projekt Supabase z konfiguracją uwierzytelniania, schematem aplikacji i politykami dostępu. Supabase jest usługą zewnętrzną względem Terraform. Schemat i polityki należy zapewnić w istniejącym projekcie albo odtworzyć z kopii utrzymywanej poza tym repozytorium. Do CI potrzebny jest publiczny adres projektu i klucz `anon` przeznaczony do użycia w przeglądarce. Klucz `service_role` i klucze typu secret należy przechowywać poza konfiguracją builda. [Specyfikacja aplikacji](ShiftMate_Specyfikacja_MVP_v1.md), [Wtyczka Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

## 2. Uwierzytelnianie AWS i Terraform

Należy aktywować profil AWS przeznaczony dla środowiska. W przypadku IAM Identity Center, po skonfigurowaniu profilu, należy wykonać logowanie SSO i sprawdzić konto.

```powershell
$env:AWS_PROFILE = 'shiftplanner'
aws sso login --profile $env:AWS_PROFILE
aws sts get-caller-identity
if (-not (Test-Path -LiteralPath 'infra/terraform.tfvars')) {
    Copy-Item -LiteralPath 'infra/terraform.tfvars.example' -Destination 'infra/terraform.tfvars'
}
```

W lokalnym `terraform.tfvars` należy zweryfikować region, środowisko i identyfikator repozytorium GitHub. Jeżeli provider GitHub OIDC już istnieje poza stanem projektu, należy wskazać go przez `github_oidc_provider_arn` i sprawdzić, czy obsługuje odbiorcę `sts.amazonaws.com`. Sposób zapisu `github_repository` musi odpowiadać formatowi podmiotu OIDC stosowanemu przez repozytorium. W ustawieniach demonstracyjnych `allowed_ssh_cidr` i `key_name` pozostają ustawione na `null`. [Konfiguracja infrastruktury](../infra/README.md), [Profil SSO](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)

```powershell
terraform '-chdir=infra' init
if ($LASTEXITCODE -ne 0) { throw 'Inicjalizacja Terraform nie powiodła się.' }
terraform '-chdir=infra' fmt -check
if ($LASTEXITCODE -ne 0) { throw 'Należy poprawić format konfiguracji Terraform.' }
terraform '-chdir=infra' validate
if ($LASTEXITCODE -ne 0) { throw 'Walidacja Terraform nie powiodła się.' }
terraform '-chdir=infra' plan '-out=shiftplanner.tfplan'
if ($LASTEXITCODE -ne 0) { throw 'Plan Terraform nie został zapisany.' }
terraform '-chdir=infra' show shiftplanner.tfplan
```

Przed zastosowaniem planu należy porównać konto, region i listę zasobów z oczekiwaną konfiguracją. Po akceptacji należy zastosować zapisany plan. Stan Terraform, plany oraz `terraform.tfvars` należy przechowywać poza Gitem. Plik stanu będzie potrzebny do rozliczenia i usunięcia zasobów. [Zapisany plan Terraform](https://developer.hashicorp.com/terraform/cli/commands/plan)

```powershell
terraform '-chdir=infra' apply shiftplanner.tfplan
if ($LASTEXITCODE -ne 0) { throw 'Nie udało się zastosować planu Terraform.' }
terraform '-chdir=infra' output
$region = terraform '-chdir=infra' output -raw aws_region
$instanceId = terraform '-chdir=infra' output -raw ec2_instance_id
$publicIp = terraform '-chdir=infra' output -raw ec2_public_ip
$repository = terraform '-chdir=infra' output -raw ecr_repository_name
$ecrUri = terraform '-chdir=infra' output -raw ecr_repository_url
```

## 3. Zmienne repozytorium i GitHub OIDC

W GitHub należy otworzyć `Settings > Secrets and variables > Actions > Variables` i ustawić poniższe zmienne repozytorium.

| Zmienna | Źródło wartości |
|---|---|
| `AWS_REGION` | Output `aws_region` |
| `AWS_CI_ROLE_ARN` | Output `github_actions_role_arn` |
| `AWS_DEPLOY_ROLE_ARN` | Output `github_actions_deploy_role_arn` |
| `ECR_REPOSITORY` | Output `ecr_repository_name` |
| `EC2_INSTANCE_ID` | Output `ec2_instance_id` |
| `SHIFTPLANNER_HEALTH_URL` | `http://<ec2_public_ip>/api/health` |
| `NEXT_PUBLIC_SUPABASE_URL` | Publiczny adres projektu Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publiczny klucz `anon` Supabase |

Opcjonalny `DISCORD_WEBHOOK_URL` należy zapisać jako sekret repozytorium w zakładce `Secrets`, jeżeli kanał Discord został przygotowany do odbioru powiadomień. GitHub Actions uzyskuje tymczasowe poświadczenia z AWS STS. Rola CI służy do publikacji obrazów z gałęzi repozytorium, a rolę CD może przejąć workflow z `main`. Konfigurację zaufania można sprawdzić w [infra/github_oidc.tf](../infra/github_oidc.tf). [Dokumentacja CI](CI.md), [Dokumentacja CD](CD.md), [OIDC w AWS dla GitHub Actions](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)

## 4. Publikacja pierwszego obrazu

Workflow musi znajdować się na domyślnej gałęzi. W karcie `Actions` należy wybrać workflow `CI`, następnie `Run workflow` i gałąź `main`. Ręczne uruchomienie wykonuje CI i publikuje obraz bez uruchamiania joba wdrożeniowego, który wymaga istniejącego Deployment w k3s i zdarzenia push. Po udanym CI należy odczytać pełne SHA z widoku uruchomienia i sprawdzić odpowiadający mu tag ECR. [Ręczne uruchamianie workflow](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)

```powershell
$imageTag = Read-Host 'Pełne SHA udanego uruchomienia CI'
if ($imageTag -cnotmatch '^[0-9a-f]{40}$') { throw 'Wymagane jest pełne SHA.' }
aws ecr describe-images --region $region --repository-name $repository --image-ids "imageTag=$imageTag"
if ($LASTEXITCODE -ne 0) { throw 'Obraz nie jest dostępny w ECR.' }
$image = "${ecrUri}:${imageTag}"
```

## 5. Instalacja k3s i wdrożenie aplikacji

Należy potwierdzić status `Online` instancji i załadować funkcję `Send-ShiftPlannerSsm` z [instrukcji SSM](KUBERNETES.md#uruchomienie-klastra). Na nowej instancji wystarczy wykonać bootstrap z repozytorium. W skrypcie adres ECR określa, dla którego repozytorium wtyczka kubeleta pobiera tymczasowy token. Do SSM należy przekazać skrypt z adresem z bieżącego outputu Terraform, niezależnie od adresu zapisanego dla środowiska referencyjnego.

```powershell
aws ssm describe-instance-information --region $region --filters "Key=InstanceIds,Values=$instanceId" --query 'InstanceInformationList[0].PingStatus' --output text

$bootstrap = Get-Content -Raw -LiteralPath 'k8s/bootstrap-k3s.sh'
$bootstrap = $bootstrap -replace '[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com/shiftplanner', $ecrUri
if (-not $bootstrap.Contains($ecrUri)) { throw 'Brak adresu ECR w konfiguracji dostawcy poświadczeń.' }
$commandId = Send-ShiftPlannerSsm $bootstrap
aws ssm get-command-invocation --region $region --instance-id $instanceId --command-id $commandId --query '{Status:Status,Stdout:StandardOutputContent,Stderr:StandardErrorContent}'
```

Odczyt wyniku należy powtarzać do statusu końcowego. Po `Success` i potwierdzeniu stanu węzła `Ready` należy utworzyć namespace `shiftplanner` oraz zastosować Deployment, Service i Ingress. Adres obrazu w przesyłanej kopii Deployment należy zastąpić zweryfikowanym obrazem z pierwszego CI. Ten sam obraz zostanie użyty przez kubelet z uprawnieniami roli EC2.

```powershell
$commands = @('#!/bin/bash', 'set -euo pipefail')
foreach ($name in @('namespace.yaml', 'deployment.yaml', 'service.yaml', 'ingress.yaml')) {
    $yaml = Get-Content -Raw -LiteralPath "k8s/$name"
    if ($name -eq 'deployment.yaml') {
        $yaml = $yaml -replace '(?m)^([ \t]*image:[ \t]*)[^\r\n]+', ('${1}' + $image)
        if (-not $yaml.Contains($image)) { throw 'Brak zweryfikowanego obrazu w manifeście.' }
    }
    $commands += @("k3s kubectl apply -f - <<'MANIFEST'", $yaml, 'MANIFEST')
}
$commands += @(
    'k3s kubectl -n shiftplanner rollout status deployment/shiftplanner --timeout=180s'
    'k3s kubectl -n shiftplanner get pods,svc,ingress'
)
$commandId = Send-ShiftPlannerSsm $commands
aws ssm get-command-invocation --region $region --instance-id $instanceId --command-id $commandId --query '{Status:Status,Stdout:StandardOutputContent,Stderr:StandardErrorContent}'
```

Po gotowości Deployment należy sprawdzić publiczne ścieżki `/`, `/auth/login` i `/api/health`. Endpoint zdrowia powinien odpowiedzieć HTTP 200 i zwrócić `{"status":"ok"}`. Kolejny push na `main` uruchomi CI i CD. Jeżeli EC2 otrzyma inny publiczny IPv4, należy zaktualizować `SHIFTPLANNER_HEALTH_URL`. [Weryfikacja Kubernetes](KUBERNETES.md#zastosowanie-manifestów-i-weryfikacja)

## 6. Monitoring i centralne logowanie

1. Należy przygotować namespace `monitoring` i jednorazowo wygenerować sekret `grafana-admin` na EC2 zgodnie z [instrukcją monitoringu](MONITORING.md#wdrożenie). Przed uruchomieniem komponentów należy sprawdzić pamięć i miejsce na dysku instancji.
2. Bieżące manifesty Grafany zawierają Loki jako źródło danych. Należy wyrenderować `kubectl kustomize logging` i zastosować wynik przez SSM poleceniem `k3s kubectl apply -f -`. Należy potwierdzić gotowość Deployment `loki` i DaemonSet `alloy`.
3. Należy wyrenderować `kubectl kustomize monitoring`, przesłać wynik przez SSM do `k3s kubectl apply -f -` i sprawdzić stan Prometheusa, Grafany oraz eksporterów. Wygenerowany YAML można przekazać w bloku heredoc jak w kroku wdrażania aplikacji.
4. Należy zastosować konfigurację logów dostępu Traefika, zachowując kopię poprzedniego pliku. Po rolloucie należy sprawdzić `/api/health` i odczytać nowe wpisy dostępu w Loki. [Konfiguracja logowania](LOGGING.md#wdrożenie)
5. Należy zestawić [prywatny tunel SSM do Grafany](MONITORING.md#dostęp-do-grafany), potwierdzić działanie dashboardu metryk i otworzyć dashboard `ShiftPlanner | Logs`. Logi kontenera aplikacji można odczytać przez zapytanie `{namespace="shiftplanner",container="shiftplanner"}`.

Po zakończeniu korzystania ze środowiska należy zastosować [procedurę usunięcia zasobów](CLEANUP.md), aby zakończyć naliczanie kosztów AWS.
