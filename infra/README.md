# Infrastruktura AWS ShiftPlanner

Konfiguracja tworzy środowisko edukacyjne `dev` w `eu-central-1`. Obejmuje VPC z jedną publiczną podsiecią i trasą do Internet Gateway, pojedynczą instancję EC2 z Amazon Linux 2023 x86_64 oraz prywatne repozytorium ECR `shiftplanner`. Domyślna instancja `t3.small` ma publiczny IPv4, szyfrowany dysk gp3 i wymaga IMDSv2.

Security group dopuszcza publiczny ruch HTTP i HTTPS. Domyślnie SSH jest wyłączone. Rola instancji umożliwia pobieranie obrazów z repozytorium `shiftplanner`. ECR ma niezmienne tagi, skanowanie przy publikacji i politykę zachowania 15 najnowszych obrazów.

## Wymagania

- Terraform 1.10 lub nowszy z linii 1.x oraz dostęp do rejestru providerów Terraform.
- Dostęp do właściwego konta AWS. Tożsamość uruchamiająca Terraform potrzebuje uprawnień do odczytu publicznego parametru SSM z AMI, zarządzania zasobami EC2, VPC, IAM i ECR oraz `iam:PassRole` dla roli instancji.
- Jeżeli używasz AWS CLI z nazwanym profilem, ustaw w PowerShell `$env:AWS_PROFILE = 'shiftplanner-dev'`, podstawiając nazwę własnego profilu. Dla profilu IAM Identity Center zaloguj się przez `aws sso login --profile shiftplanner-dev`. [Konfiguracja profilu AWS](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)

## Konfiguracja i uruchomienie

Poniższe polecenia uruchom w PowerShell z katalogu głównego repozytorium.

```powershell
Set-Location infra
Copy-Item terraform.tfvars.example terraform.tfvars
```

W razie potrzeby zmień ustawienia w lokalnym `terraform.tfvars`. Aby włączyć SSH, ustaw `allowed_ssh_cidr` na własny publiczny adres IPv4 z maską `/32` i `key_name` na nazwę istniejącej pary kluczy EC2 w wybranym regionie. Poświadczenia AWS i prywatne klucze przechowuj poza repozytorium.

```powershell
terraform init
terraform fmt -check
terraform validate
terraform plan -out=shiftplanner.tfplan
```

Sprawdź plan, konto i region przed utworzeniem zasobów. Poniższe polecenie wykona zapisany plan bez dodatkowego pytania o potwierdzenie. Terraform przechowuje stan lokalnie. Zachowaj `terraform.tfstate` do późniejszego usunięcia infrastruktury i przechowuj stan, plany oraz `terraform.tfvars` poza Gitem. Wersjonuj `.terraform.lock.hcl`. [Zapisywanie planu Terraform](https://developer.hashicorp.com/terraform/cli/commands/plan)

```powershell
terraform apply shiftplanner.tfplan
```

AMI jest pobierane z aktualnego publicznego parametru SSM. Gdy AWS zaktualizuje parametr, kolejny plan może zaproponować wymianę instancji EC2.

## Koszty i usunięcie środowiska

Koszty mogą naliczać się za czas działania EC2, wolumen EBS, publiczny IPv4, przechowywanie obrazów w ECR i transfer danych. [EC2](https://aws.amazon.com/ec2/pricing/on-demand/), [EBS](https://aws.amazon.com/ebs/pricing/), [Publiczne IPv4](https://aws.amazon.com/vpc/pricing/), [ECR](https://aws.amazon.com/ecr/pricing/)

Po zakończeniu ćwiczeń uruchom `terraform destroy` z tego samego katalogu i z tym samym stanem. To polecenie służy do usunięcia środowiska edukacyjnego. Jeżeli w ECR są obrazy, opróżnij repozytorium przed usunięciem infrastruktury. Przed potwierdzeniem sprawdź listę zasobów do usunięcia. [Terraform destroy](https://developer.hashicorp.com/terraform/cli/commands/destroy), [Usuwanie repozytorium ECR](https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_DeleteRepository.html)

```powershell
terraform plan -destroy
terraform destroy
```
