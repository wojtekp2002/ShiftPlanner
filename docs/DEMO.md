# Demonstracja projektu ShiftPlanner

Scenariusz zajmuje około 12 minut. Przed rozpoczęciem należy sprawdzić czysty stan Git, odczytać publiczny adres aplikacji poleceniem `terraform '-chdir=infra' output -raw ec2_public_ip`, otworzyć kartę GitHub Actions i nawiązać prywatny tunel do Grafany. W osobnej karcie należy przygotować ostatnie udane uruchomienie z widocznymi krokami CI i CD. Polecenia `k3s kubectl` wykonuje się na EC2 przez SSM. [Dostęp do Grafany](MONITORING.md#dostęp-do-grafany)

| Czas | Temat | Co pokazać |
|---|---|---|
| 0:00–1:30 | Architektura | Przepływ od pushu przez OIDC i ECR do k3s, granicę AWS oraz zewnętrzny Supabase. [Diagram](ARCHITECTURE.md) |
| 1:30–2:30 | Terraform | Sieć, EC2, ECR i role IAM oraz wynik `terraform plan` dla aktualnego stanu. [Kod IaC](../infra/) |
| 2:30–3:30 | Kubernetes | Węzeł `Ready`, jedną gotową replikę ShiftPlannera oraz pody monitoringu i logowania. |
| 3:30–7:30 | CI i CD | Małą zmianę tekstu w aplikacji, commit, push i kolejne kroki workflow. Po wdrożeniu należy odświeżyć stronę główną. |
| 7:30–9:30 | Monitoring | Na dashboardzie ShiftPlanner pokazać CPU, RAM, stan poda i wynik sondy dostępności. |
| 9:30–10:30 | Logging | W Grafana Explore wybrać Loki i wykonać zapytanie dla kontenera ShiftPlanner. |
| 10:30–11:30 | Bezpieczeństwo i zakończenie | Omówić OIDC, odrębne role, dostęp przez SSM przy zamkniętym SSH, niezmienne tagi, kontener bez roota i plan sprzątania. |

## Terraform i Kubernetes

Z katalogu głównego repozytorium należy uruchomić plan tylko do odczytu. Jeżeli odświeżenie stanu trwa dłużej, można pokazać przygotowany wcześniej wynik z tego samego konta i stanu. Zastosowanie planu nie jest częścią prezentacji.

```powershell
terraform '-chdir=infra' plan -input=false
```

Na EC2 należy pokazać stan klastra i wdrożenia.

```bash
sudo k3s kubectl get nodes
sudo k3s kubectl get pods -n shiftplanner
sudo k3s kubectl get deployment -n shiftplanner
sudo k3s kubectl get pods -n monitoring
```

## Pokaz wdrożenia

Należy zmienić jedno zdanie widoczne na stronie głównej w komponencie `LandingHero`, sprawdzić diff i zapisać wyłącznie plik demonstracyjny. Push na `main` uruchomi rzeczywiste wdrożenie. [Komponent strony głównej](../web/src/components/landing/landing-hero.tsx)

```powershell
git switch main
git pull --ff-only origin main
# W pliku landing-hero.tsx należy wprowadzić zmianę tekstu.
git diff -- web/src/components/landing/landing-hero.tsx
git add -- web/src/components/landing/landing-hero.tsx
git diff --cached --name-only
git commit -m "demo: update landing page copy"
git push origin main
git rev-parse HEAD
```

W GitHub Actions należy wskazać wynik kontroli, pełny SHA obrazu opublikowanego w ECR, identyfikator polecenia SSM i potwierdzenie rolloutu. Po sukcesie należy odświeżyć publiczną stronę i wskazać zmieniony tekst. Jeżeli bieżący build nie zmieści się w przewidzianym czasie, należy przejść do Grafany i pokazać wcześniejszy udany run jako dowód działania mechanizmu. Sukces bieżącego wdrożenia można ogłosić po zakończeniu joba i sprawdzeniu strony. [Workflow CI/CD](../.github/workflows/ci.yml), [Historia uruchomień](https://github.com/wojtekp2002/ShiftPlanner/actions/workflows/ci.yml)

## Metryki i logi

W Grafanie należy wybrać dashboard **ShiftPlanner | monitoring** i odczytać stan poda oraz sondy aplikacji. Link na dashboardzie prowadzi do **ShiftPlanner | Logs**. W Explore można odtworzyć zapytanie dla logów aplikacji i wybrać przedział obejmujący ostatni start poda. Osobne zapytanie pokazuje logi dostępu Traefika. [Monitoring](MONITORING.md), [Logowanie](LOGGING.md)

```logql
{namespace="shiftplanner", container="shiftplanner"}
{namespace="kube-system", container="traefik"} | json | RouterName =~ ".*shiftplanner.*"
```

Na koniec należy wskazać planowaną procedurę usunięcia zasobów i jej wpływ na koszty. Wykonanie cleanupu następuje po zakończeniu użytkowania środowiska. [Procedura cleanupu](CLEANUP.md)
