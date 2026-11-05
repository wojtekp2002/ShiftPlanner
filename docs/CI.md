# CI i publikacja obrazów w ECR

Workflow `.github/workflows/ci.yml` uruchamia się po pushu do dowolnej gałęzi repozytorium oraz ręcznie przez `workflow_dispatch`. Proces obejmuje instalację zależności przez `npm ci`, lint, generowanie typów Next.js, kontrolę TypeScript, produkcyjny build aplikacji, build Dockera i publikację obrazu w ECR.

## Przygotowanie AWS i zmiennych repozytorium

Najpierw należy skonfigurować dostęp do AWS i parametry Terraform zgodnie z [instrukcją infrastruktury](../infra/README.md), w tym własność providera OIDC. Po przeglądzie planu zasoby mogą zostać utworzone poniższymi poleceniami z katalogu `infra/`.

```powershell
terraform init
terraform validate
terraform plan -out=shiftplanner.tfplan
terraform apply shiftplanner.tfplan
```

Następnie należy utworzyć zmienne repozytorium w GitHub w sekcji `Settings > Secrets and variables > Actions > Variables`.

| Zmienna | Źródło wartości |
|---|---|
| `AWS_REGION` | `terraform output -raw aws_region` |
| `AWS_CI_ROLE_ARN` | `terraform output -raw github_actions_role_arn` |
| `ECR_REPOSITORY` | `terraform output -raw ecr_repository_name` |
| `NEXT_PUBLIC_SUPABASE_URL` | Publiczny adres projektu Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publiczny klucz anon projektu Supabase |

Obie zmienne Supabase są przekazywane do produkcyjnego builda Next.js i jako argumenty builda Dockera. Ich wartości trafiają do bundla przeglądarkowego podczas kompilacji. Zmiana konfiguracji wymaga nowego builda. Poświadczenia typu `service_role`, klucze secret i prywatne dane AWS należy przechowywać poza tymi zmiennymi. [Zmienne publiczne Next.js](https://nextjs.org/docs/app/guides/environment-variables#bundling-environment-variables-for-the-browser)

## Uwierzytelnianie i uprawnienia

Workflow uzyskuje krótkotrwałe poświadczenia AWS przez OIDC. Domyślna konfiguracja roli CI wymaga odbiorcy `sts.amazonaws.com` i identyfikatora podmiotu zgodnego ze wzorcem `repo:wojtekp2002/ShiftPlanner:ref:refs/heads/*`. Jeżeli repozytorium korzysta z formatu podmiotu z niezmiennymi identyfikatorami GitHub, zmienna Terraform `github_repository` wymaga nazwy właściciela i repozytorium z odpowiednimi przyrostkami `@ID`. Uprawnienia obejmują publikację obrazów oraz odczyt metadanych w projektowym repozytorium ECR. [OIDC w AWS dla GitHub Actions](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)

## Pierwsze uruchomienie i ponowienia

Po utworzeniu zasobów AWS i zapisaniu wszystkich zmiennych repozytorium push gałęzi zawierającej workflow uruchamia CI. Wyniki i logi kroków są dostępne na karcie `Actions`. Ręczne uruchomienie przez `Run workflow` staje się dostępne po umieszczeniu pliku workflow na domyślnej gałęzi repozytorium. [Zdarzenie workflow_dispatch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)

Każde uruchomienie wykonuje kontrole aplikacji i build Dockera. Obraz otrzymuje tag równy pełnemu SHA commita. Skrypt `.github/scripts/push-ecr-image.sh` pomija publikację, jeżeli dany tag już istnieje. Błędy odczytu ECR przerywają workflow. W przypadku błędu pushu skrypt ponownie sprawdza obecność tagu, co obsługuje równoległą publikację tego samego SHA. Takie postępowanie jest zgodne z niezmiennymi tagami ECR. [Niezmienne tagi ECR](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html)

Nazwa obrazu ma postać `ECR_REPOSITORY_URL:COMMIT_SHA`. Adres repozytorium można odczytać poleceniem `terraform output -raw ecr_repository_url`. Publikacja kolejnego obrazu jest wykonywana po pushu nowego commita.
