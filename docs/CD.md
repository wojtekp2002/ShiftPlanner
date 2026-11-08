# Ciągłe wdrażanie ShiftPlanner

Workflow `.github/workflows/ci.yml` uruchamia CI po pushu do dowolnej gałęzi oraz po ręcznym uruchomieniu przez `workflow_dispatch`. CI sprawdza aplikację, buduje obraz Dockera i publikuje go w prywatnym repozytorium ECR. Job wdrożeniowy uruchamia się po udanym CI wyłącznie dla pushu na `main`. Wdrożenia na tę instancję są wykonywane kolejno. Jeżeli przed wdrożeniem gałąź `main` wskazuje już inny commit, wdrożenie starszego obrazu jest pomijane. [Konfiguracja CI](CI.md)

Tag obrazu to pełne SHA commita. Niezmienne tagi ECR pozwalają powiązać uruchomiony obraz z konkretną wersją kodu także przy ponowieniu workflow. Job wdrożeniowy wskazuje obraz opublikowany dla tego SHA i aktualizuje pole `image` w klastrze przez `kubectl set image`. Manifest `k8s/deployment.yaml` służy do pierwszego wdrożenia. Ponowne zastosowanie go bez sprawdzenia pola `image` może przywrócić obraz bazowy.

## Konfiguracja

Po zastosowaniu zweryfikowanego planu Terraform należy dodać zmienne repozytorium w GitHub w sekcji `Settings > Secrets and variables > Actions > Variables`. Zmienne używane do budowania i publikowania obrazu opisano w dokumentacji CI. [Konfiguracja zmiennych CI](CI.md#przygotowanie-aws-i-zmiennych-repozytorium)

| Zmienna | Źródło wartości |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw github_actions_deploy_role_arn` |
| `EC2_INSTANCE_ID` | `terraform output -raw ec2_instance_id` |
| `SHIFTPLANNER_HEALTH_URL` | `http://3.127.136.198/api/health`, z publicznym adresem z `terraform output -raw ec2_public_ip` |

Polecenia `terraform output` należy wykonać w katalogu `infra/`. Po zmianie adresu publicznego lub wymianie instancji należy zaktualizować odpowiednie zmienne. Docelowa instancja musi mieć status `Online` w Systems Manager. [Konfiguracja dostępu do EC2](KUBERNETES.md#dostęp-administracyjny-i-pobieranie-obrazu)

## Uwierzytelnianie i weryfikacja

GitHub Actions uzyskuje przez OIDC i AWS STS tymczasowe poświadczenia dla osobnych ról. Rola CI publikuje obrazy do ECR. Rolę wdrożeniową może przejąć workflow repozytorium z gałęzi `main`. Rola ma uprawnienia do uruchomienia dokumentu `AWS-RunShellScript` na instancji ShiftPlanner i odczytu wyniku polecenia. Runner komunikuje się z instancją przez API Systems Manager. Plik kubeconfig jest używany wyłącznie na EC2 przez lokalne `k3s kubectl`. [OIDC w AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), [SSM Run Command](https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command.html)

1. Polecenie wykonane przez SSM odczytuje dotychczasowy obraz, aktualizuje obraz kontenera `shiftplanner` w Deployment `shiftplanner` i czeka na rollout do 180 sekund.
2. Polecenie na EC2 porównuje obraz w Deployment i gotowym podzie z adresem zawierającym SHA bieżącego commita.
3. Runner sprawdza wynik SSM pod identyfikatorem `CommandId`, pobiera stdout i stderr, a następnie sprawdza publiczny endpoint zdrowia. Warunkiem sukcesu jest HTTP 200 oraz odpowiedź JSON `{"status":"ok"}`. Liczba prób i czas oczekiwania są ograniczone.

Błąd polecenia, rozbieżność obrazu lub nieudany test HTTP kończą job błędem. Wynik CI i wdrożenia jest dostępny w podsumowaniach uruchomienia na karcie `Actions`. Powiadomienia do zewnętrznego kanału pozostają do skonfigurowania. [Podsumowania jobów GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary)

## Ręczny rollback

Kubernetes zachowuje poprzednie rewizje Deployment w ReplicaSetach. Przed rollbackiem należy upewnić się, że nie trwa wdrożenie przez GitHub Actions ani polecenie SSM aktualizujące obraz. W konsoli AWS Systems Manager należy uruchomić dokument `AWS-RunShellScript` na instancji ShiftPlanner, korzystając z uprawnień operatora. Najpierw należy sprawdzić historię rewizji.

```bash
sudo k3s kubectl -n shiftplanner rollout history deployment/shiftplanner
```

Po potwierdzeniu, że bezpośrednio poprzednia rewizja jest właściwa, należy uruchomić poniższe polecenia przez SSM.

```bash
set -eu
sudo k3s kubectl -n shiftplanner rollout undo deployment/shiftplanner
sudo k3s kubectl -n shiftplanner rollout status deployment/shiftplanner --timeout=180s
sudo k3s kubectl -n shiftplanner get deployment/shiftplanner \
  -o 'custom-columns=DEPLOYMENT:.metadata.name,IMAGE:.spec.template.spec.containers[0].image'
sudo k3s kubectl -n shiftplanner get pods -l app.kubernetes.io/name=shiftplanner
```

Po zakończonym rolloucie należy porównać odczytany obraz z wybraną rewizją, sprawdzić gotowość poda i potwierdzić, że publiczny `/api/health` zwraca HTTP 200 oraz `{"status":"ok"}`. Następny udany push na `main` ponownie wdroży obraz oznaczony SHA tego commita. [Wycofanie wdrożenia w Kubernetes](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment)
