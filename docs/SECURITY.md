# Zabezpieczenia ShiftPlanner

## AWS i GitHub Actions

Instancja EC2 wymaga IMDSv2 i ma dołączony profil IAM do odczytu z ECR oraz rejestracji w Systems Manager. Administracja odbywa się przez SSM. Reguły ruchu przychodzącego dopuszczają publicznie TCP 80 i 443. Port 80 obsługuje aplikację, a port 443 pozostaje przewidziany w regułach infrastruktury. Instancja nie ma klucza SSH ani publicznej reguły dla portu 22. [Infrastruktura Terraform](../infra/README.md)

GitHub Actions uzyskuje tymczasowe poświadczenia przez OIDC i AWS STS. Rola CI może publikować obraz w konkretnym prywatnym ECR. Rola CD ufa tokenom z `main` i może uruchomić `AWS-RunShellScript` na jednej EC2. Odczyt wyniku Run Command jest ograniczony do regionu. Akcje wymagające zasobu `*` to `ecr:GetAuthorizationToken` i `ssm:GetCommandInvocation`. Zakres roli CD nie obejmuje publikowania obrazów. [Role i polityki IAM](../infra/github_oidc.tf), [Autoryzacja SSM](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html)

Prywatny ECR używa niezmiennych tagów i uruchamia podstawowy skan po publikacji obrazu. Tag SHA wskazuje wersję obrazu i blokuje jego nadpisanie. Prawo zapisu do gałęzi repozytorium jest granicą zaufania CI, ponieważ gałęzie publikują do wspólnego ECR. [Audyt podatności](VULNERABILITIES.md)

## Kubernetes i dostęp do obserwowalności

Obraz uruchamia Node.js jako użytkownika `node`. Deployment wymusza UID i GID 1000, `runAsNonRoot` i profil `RuntimeDefault` dla seccomp. Kontener zrzuca wszystkie Linux capabilities, blokuje eskalację uprawnień i działa bez automatycznie montowanego tokena konta usługi. Gotowość i żywotność sprawdzają sondy HTTP. CPU i RAM mają ustawione requests oraz limits. [Manifest aplikacji](../k8s/deployment.yaml), [Standardy bezpieczeństwa podów](https://kubernetes.io/docs/concepts/security/pod-security-standards/)

Prometheus, Grafana i Loki działają za usługami `ClusterIP`. Dostęp do Grafany odbywa się przez tunel SSM i wymaga zalogowania. Polityka sieciowa Loki dopuszcza połączenia z podów Grafany i Alloy w namespace `monitoring`. Alloy maskuje rozpoznane wzorce poświadczeń przed wysyłką. Traefik ogranicza rejestrowane metadane HTTP do metody, statusu, routera i czasu obsługi. [Monitoring](MONITORING.md), [Logowanie](LOGGING.md)

## Sekrety i ograniczenia środowiska

Przed publikacją należy sprawdzić pliki i historię Git skanerem sekretów. Stan Terraform, lokalne pliki środowiskowe, kubeconfig i klucze prywatne pozostają poza repozytorium. Hasło Grafany jest generowane na EC2 i zapisywane w Kubernetes Secret. Webhook Discord należy ustawiać wyłącznie jako sekret GitHub Actions. Zmienne `NEXT_PUBLIC_SUPABASE_*` są osadzane w kodzie klienta, więc mogą zawierać wyłącznie publiczny URL i klucz publishable lub anon. [Konfiguracja powiadomień](CD.md#powiadomienia-discord)

Środowisko demonstracyjne udostępnia aplikację przez HTTP i działa na jednej instancji EC2. Metryki oraz logi korzystają z lokalnych wolumenów efemerycznych. Wyniki ECR dotyczą warstwy systemowej obrazu. Niezależny audyt npm obejmuje również zależności używane podczas budowania i w narzędziach deweloperskich. [Wyniki audytu i zakres skanów](VULNERABILITIES.md)
