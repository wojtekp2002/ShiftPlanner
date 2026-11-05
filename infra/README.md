# Infrastruktura AWS ShiftPlanner

Konfiguracja tworzy środowisko edukacyjne `dev` w `eu-central-1`. Obejmuje VPC z jedną publiczną podsiecią i trasą do Internet Gateway, pojedynczą instancję EC2 z Amazon Linux 2023 x86_64 oraz prywatne repozytorium ECR `shiftplanner`. Domyślna instancja `t3.small` ma publiczny IPv4, szyfrowany dysk gp3 i wymaga IMDSv2.

Security group dopuszcza publiczny ruch HTTP i HTTPS. Domyślnie SSH jest wyłączone. Rola instancji umożliwia pobieranie obrazów z repozytorium `shiftplanner`. ECR ma niezmienne tagi, skanowanie przy publikacji i politykę zachowania 15 najnowszych obrazów. Dodatkowa rola IAM udostępnia GitHub Actions możliwość publikacji obrazów przez OIDC.

## Wymagania

- Terraform 1.10 lub nowszy z linii 1.x oraz dostęp do rejestru providerów Terraform.
- Dostęp do właściwego konta AWS. Tożsamość uruchamiająca Terraform potrzebuje uprawnień do odczytu publicznego parametru SSM z AMI, zarządzania zasobami EC2, VPC, IAM i ECR oraz `iam:PassRole` dla roli instancji. Zarządzanie IAM obejmuje role, polityki i provider OIDC.
- Przy korzystaniu z nazwanego profilu AWS CLI należy ustawić zmienną `AWS_PROFILE` na nazwę profilu. Profil IAM Identity Center wymaga aktywnej sesji uzyskanej poleceniem `aws sso login --profile NAZWA_PROFILU`. [Konfiguracja profilu AWS](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)

## Konfiguracja i uruchomienie

Poniższe polecenia są przeznaczone do wykonania w PowerShell z katalogu głównego repozytorium.

```powershell
Set-Location infra
Copy-Item terraform.tfvars.example terraform.tfvars
```

Parametry środowiska należy określić w lokalnym `terraform.tfvars`. Włączenie SSH wymaga ustawienia `allowed_ssh_cidr` na zaufany publiczny adres IPv4 z maską `/32` oraz `key_name` na nazwę istniejącej pary kluczy EC2 w wybranym regionie. Poświadczenia AWS i prywatne klucze należy przechowywać poza repozytorium.

## Własność providera OIDC

Provider `https://token.actions.githubusercontent.com` jest zasobem współdzielonym w obrębie konta AWS. Domyślne `github_oidc_provider_arn = null` oznacza utworzenie providera przez ten stan Terraform. Jeżeli provider jest już zarządzany poza tym stanem, jego ARN należy podać w `github_oidc_provider_arn` przed planowaniem zmian. ARN można odczytać z konsoli IAM lub poleceniem `aws iam list-open-id-connect-providers`. Istniejący provider musi obsługiwać odbiorcę `sts.amazonaws.com`. [Provider OIDC w IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)

W przypadku providera już zarządzanego przez bieżący stan należy zachować dotychczasowy sposób zarządzania. Zmiana własności wymaga osobnego przeglądu planu i stanu. Usunięcie współdzielonego providera może przerwać działanie innych ról korzystających z tego samego mechanizmu uwierzytelniania.

## Planowanie i tworzenie zasobów

```powershell
terraform init
terraform fmt -check
terraform validate
terraform plan -out=shiftplanner.tfplan
```

Przed utworzeniem zasobów należy zweryfikować plan, konto i region. Zapisany plan może obejmować fundament AWS i konfigurację CI zależnie od istniejącego stanu. Poniższe polecenie wykona zapisany plan bez dodatkowego pytania o potwierdzenie. Terraform przechowuje stan lokalnie. Plik `terraform.tfstate` należy zachować do późniejszego usunięcia infrastruktury. Stan, plany i `terraform.tfvars` należy przechowywać poza Gitem, a `.terraform.lock.hcl` wersjonować. [Zapisywanie planu Terraform](https://developer.hashicorp.com/terraform/cli/commands/plan)

```powershell
terraform apply shiftplanner.tfplan
```

AMI jest pobierane z aktualnego publicznego parametru SSM. Gdy AWS zaktualizuje parametr, kolejny plan może zaproponować wymianę instancji EC2.

Po utworzeniu zasobów konfiguracja GitHub Actions wymaga przeniesienia odpowiednich outputs Terraform do zmiennych repozytorium. Kolejność konfiguracji i obsługa workflow zostały opisane w [dokumentacji CI](../docs/CI.md).

## Koszty i usunięcie środowiska

Koszty mogą naliczać się za czas działania EC2, wolumen EBS, publiczny IPv4, przechowywanie obrazów w ECR i transfer danych. [EC2](https://aws.amazon.com/ec2/pricing/on-demand/), [EBS](https://aws.amazon.com/ebs/pricing/), [Publiczne IPv4](https://aws.amazon.com/vpc/pricing/), [ECR](https://aws.amazon.com/ecr/pricing/)

Po zakończeniu użycia należy usunąć zasoby poleceniem `terraform destroy`, aby uniknąć dalszych kosztów środowiska edukacyjnego. Polecenie należy wykonać z tego samego katalogu i z tym samym stanem. Repozytorium ECR zawierające obrazy wymaga wcześniejszego opróżnienia. Przed potwierdzeniem należy zweryfikować listę zasobów do usunięcia i własność providera OIDC. [Terraform destroy](https://developer.hashicorp.com/terraform/cli/commands/destroy), [Usuwanie repozytorium ECR](https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_DeleteRepository.html)

```powershell
terraform plan -destroy
terraform destroy
```
