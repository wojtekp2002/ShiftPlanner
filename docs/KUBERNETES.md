# Wdrożenie ShiftPlanner na K3s

K3s umożliwia uruchomienie komponentów sterujących i obciążeń aplikacyjnych na jednym hoście, co upraszcza konfigurację środowiska testowego. Klaster działa na istniejącej instancji EC2 `t3.small` z Amazon Linux 2023 w `eu-central-1`. Skrypt `k8s/bootstrap-k3s.sh` instaluje K3s, konfiguruje dołączony kontroler Traefik i wyłącza ServiceLB. Traefik ma usługę typu `ClusterIP` oraz udostępnia punkt wejścia `web` na porcie hosta 80. Ruch HTTP dociera bezpośrednio do publicznego adresu EC2, bez AWS Load Balancera i TLS. [Sieć i Traefik w K3s](https://docs.k3s.io/networking/networking-services)

| Zasób | Konfiguracja |
|---|---|
| Namespace | `shiftplanner` |
| Deployment | `shiftplanner`, jedna replika, port 3000 |
| Service | `shiftplanner`, `ClusterIP`, port 80 przekazywany na port 3000 kontenera |
| Ingress | Klasa `traefik`, ścieżka `/` typu `Prefix`, bez ograniczenia do nazwy hosta |

Sondy readiness i liveness sprawdzają `/api/health`. Pierwsza dopuszcza Pod do obsługi ruchu, druga pozwala kubeletowi wykryć konieczność restartu kontenera. Żądania zasobów wynoszą `100m` CPU i `128Mi` pamięci, a limity `500m` CPU i `384Mi` pamięci.

## Dostęp administracyjny i pobieranie obrazu

Administracja odbywa się przez AWS Systems Manager Run Command z dokumentem `AWS-RunShellScript`. SSH pozostaje wyłączone. Po zatwierdzeniu planu Terraform należy zastosować przypięcie polityki `AmazonSSMManagedInstanceCore` do istniejącej roli EC2. Warunkiem wykonania poleceń jest status `Online` instancji w SSM. Profil AWS używany w PowerShell musi umożliwiać odczyt stanu SSM, wysłanie polecenia na wskazaną instancję i odczyt wyniku. [Run Command](https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command.html), [Polityka IAM dla SSM](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html)

Kubelet wywołuje wtyczkę `ecr-credential-provider` podczas pobierania obrazu z prywatnego ECR. Wtyczka pobiera poświadczenia roli instancji przez IMDSv2 i uzyskuje krótkotrwały token ECR. Manifesty nie zawierają kluczy AWS ani `imagePullSecrets`. Publiczne wartości Supabase są wbudowane w obraz przez CI i nie wymagają osobnej konfiguracji w Kubernetes. [Dostawca poświadczeń ECR](https://cloud-provider-aws.sigs.k8s.io/credential_provider/), [Konfiguracja CI](CI.md)

## Uruchomienie klastra

Polecenia są przeznaczone do wykonania w PowerShell z katalogu głównego repozytorium i z aktywnym profilem AWS. Zapisany plan należy sprawdzić przed zastosowaniem. Dla istniejącego środowiska oczekiwaną zmianą jest przypięcie polityki IAM. Wymiana EC2 lub dodatkowe zasoby wymagają osobnego przeglądu planu.

```powershell
terraform '-chdir=infra' plan '-out=stage5.tfplan'
terraform '-chdir=infra' apply stage5.tfplan

$region = terraform '-chdir=infra' output -raw aws_region
$instanceId = terraform '-chdir=infra' output -raw ec2_instance_id
$publicIp = terraform '-chdir=infra' output -raw ec2_public_ip
$repository = terraform '-chdir=infra' output -raw ecr_repository_name
aws ssm describe-instance-information --region $region --filters "Key=InstanceIds,Values=$instanceId" --query 'InstanceInformationList[0].PingStatus' --output text
```

Poniższa funkcja przekazuje skrypt do SSM, normalizując końce wierszy z Windows do formatu wymaganego przez Bash. Identyfikator polecenia umożliwia odczyt wyniku bez ujawniania poświadczeń. [AWS CLI i Run Command](https://docs.aws.amazon.com/systems-manager/latest/userguide/walkthrough-cli.html)

```powershell
function Send-ShiftPlannerSsm([string[]] $commands) {
    $payloadPath = [IO.Path]::GetTempFileName()
    try {
        $payload = @{
            commands = @($commands | ForEach-Object { $_.Replace("`r`n", "`n") })
            executionTimeout = @('900')
        } | ConvertTo-Json -Compress
        [IO.File]::WriteAllText($payloadPath, $payload)
        aws ssm send-command --region $region --instance-ids $instanceId --document-name AWS-RunShellScript --parameters "file://$payloadPath" --query 'Command.CommandId' --output text
        if ($LASTEXITCODE -ne 0) { throw 'Nie udało się wysłać polecenia SSM.' }
    } finally {
        Remove-Item -LiteralPath $payloadPath
    }
}

$commandId = Send-ShiftPlannerSsm (Get-Content -Raw -LiteralPath k8s/bootstrap-k3s.sh)
aws ssm get-command-invocation --region $region --instance-id $instanceId --command-id $commandId --query '{Status:Status,Stdout:StandardOutputContent,Stderr:StandardErrorContent}'
```

Przy statusie `Pending` lub `InProgress` odczyt wyniku należy powtórzyć. Instalację uznaje się za udaną po uzyskaniu statusu `Success`. Gotowość węzła i aplikacji potwierdzają dalsze polecenia.

## Zastosowanie manifestów i weryfikacja

Manifest wdraża obraz z tagiem `691ea0bda73d04c169cf5d4e0293efc21879eed0`. Przed zastosowaniem manifestu należy potwierdzić obecność tagu w ECR. Przy wdrażaniu innej wersji wartość `image` w `k8s/deployment.yaml` powinna wskazywać pełny adres obrazu z tagiem SHA opublikowanym przez CI.

```powershell
$imageTag = '691ea0bda73d04c169cf5d4e0293efc21879eed0'
aws ecr describe-images --region $region --repository-name $repository --image-ids "imageTag=$imageTag" --query 'imageDetails[0].imageDigest' --output text
```

Namespace jest tworzony przed Deployment, Service i Ingress. Polecenia `k3s kubectl` są wykonywane na instancji za pośrednictwem SSM.

```powershell
$commands = @('#!/bin/bash', 'set -euo pipefail')
foreach ($name in @('namespace.yaml', 'deployment.yaml', 'service.yaml', 'ingress.yaml')) {
    $commands += @(
        "k3s kubectl apply -f - <<'MANIFEST'"
        (Get-Content -Raw -LiteralPath "k8s/$name")
        'MANIFEST'
    )
}
$commands += @(
    'k3s kubectl get nodes'
    'k3s kubectl -n shiftplanner rollout status deployment/shiftplanner --timeout=180s'
    'k3s kubectl -n shiftplanner get pods,svc,ingress'
    'k3s kubectl -n shiftplanner get pods -l app.kubernetes.io/name=shiftplanner -o custom-columns=IMAGE:.spec.containers[0].image,DIGEST:.status.containerStatuses[0].imageID'
    'curl -fsS --retry 10 --retry-all-errors --retry-delay 2 --max-time 5 http://127.0.0.1/api/health'
)
$commandId = Send-ShiftPlannerSsm $commands
aws ssm get-command-invocation --region $region --instance-id $instanceId --command-id $commandId --query '{Status:Status,Stdout:StandardOutputContent,Stderr:StandardErrorContent}'
```

Działanie należy potwierdzić statusem węzła `Ready`, zakończonym rolloutem, jedną gotową repliką oraz odpowiedzią HTTP 200 z zewnątrz instancji. Digest odczytany z poda należy porównać z wynikiem `aws ecr describe-images`.

```powershell
curl.exe -fsS "http://$publicIp/api/health"
curl.exe -fsS -o NUL -w '%{http_code}\n' "http://$publicIp/"
curl.exe -fsS -o NUL -w '%{http_code}\n' "http://$publicIp/auth/login"
```

Prawidłowa odpowiedź endpointu zdrowia to `{"status":"ok"}`. W przypadku błędu szczegóły można odczytać poniższymi poleceniami wykonanymi na instancji przez Run Command.

```bash
k3s kubectl -n shiftplanner describe pods
k3s kubectl -n shiftplanner logs deployment/shiftplanner --tail=50
k3s kubectl -n shiftplanner get events --sort-by=.lastTimestamp
k3s kubectl -n kube-system get pods,svc
journalctl -u k3s -n 100 --no-pager
```
