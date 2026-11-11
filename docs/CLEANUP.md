# Usunięcie środowiska ShiftPlanner

Procedurę należy wykonać po zakończeniu demonstracji, aby zakończyć naliczanie kosztów EC2, EBS, publicznego IPv4 i ECR. Usunięcie zasobów kończy dostęp do aplikacji oraz usuwa lokalną historię metryk i logów. Przed rozpoczęciem należy zachować potrzebne artefakty i potwierdzić, że środowisko nie jest już używane.

## 1. Identyfikacja zasobów i przegląd planu

Należy wstrzymać uruchamianie workflow `CI` i sprawdzić, czy żaden job CI lub CD nie wykonuje operacji. Następnie należy uruchomić AWS CLI i Terraform z tym samym profilem, katalogiem `infra/` i stanem, których użyto do wdrożenia. Należy zachować poniższe identyfikatory przed usunięciem zasobów. Polecenia PowerShell są przeznaczone do wykonania z katalogu głównego repozytorium.

```powershell
aws sts get-caller-identity
terraform '-chdir=infra' state list
$account = aws sts get-caller-identity --query Account --output text
$region = terraform '-chdir=infra' output -raw aws_region
$instanceId = terraform '-chdir=infra' output -raw ec2_instance_id
$publicIp = terraform '-chdir=infra' output -raw ec2_public_ip
$vpcId = terraform '-chdir=infra' output -raw vpc_id
$repository = terraform '-chdir=infra' output -raw ecr_repository_name
$ecrUri = terraform '-chdir=infra' output -raw ecr_repository_url
$ciRole = (terraform '-chdir=infra' output -raw github_actions_role_arn).Split('/')[-1]
$cdRole = (terraform '-chdir=infra' output -raw github_actions_deploy_role_arn).Split('/')[-1]
if ($account -cne ($ecrUri -split '\.')[0]) { throw 'Konto AWS nie odpowiada stanowi Terraform.' }

$instance = aws ec2 describe-instances --region $region --instance-ids $instanceId `
  --query 'Reservations[0].Instances[0]' --output json | ConvertFrom-Json
if ($instance.VpcId -cne $vpcId) { throw 'VPC instancji nie odpowiada stanowi Terraform.' }
$volumeIds = @($instance.BlockDeviceMappings | ForEach-Object { $_.Ebs.VolumeId })
$instanceProfileName = $instance.IamInstanceProfile.Arn.Split('/')[-1]
$hostRole = aws iam get-instance-profile --instance-profile-name $instanceProfileName `
  --query 'InstanceProfile.Roles[0].RoleName' --output text

terraform '-chdir=infra' plan -destroy
```

Przed usunięciem jakiegokolwiek zasobu należy sprawdzić konto, region, EC2, VPC, ECR i role w planie. Provider GitHub OIDC może być współdzielony w obrębie konta. Jeżeli plan przewiduje usunięcie providera, należy sprawdzić, czy pozostające role innych projektów nadal go potrzebują. W takim przypadku należy zatrzymać procedurę i uzgodnić zachowanie współdzielonego zasobu. Plan z pustego stanu nie potwierdza braku zasobów. [Własność providera OIDC](../infra/README.md#własność-providera-oidc)

## 2. Usunięcie zasobów Kubernetes

Przez SSM należy sprawdzić węzeł i zasoby namespace `shiftplanner` oraz `monitoring`. Należy usunąć zasoby logowania, monitoringu i aplikacji na tym klastrze w poniższej kolejności.

1. Należy wyrenderować `kubectl kustomize logging` i przesłać wynik do `k3s kubectl delete -f - --ignore-not-found` przez SSM. Ten manifest obejmuje również uprawnienia Alloy w `kube-system` i `shiftplanner`.
2. Należy wyrenderować `kubectl kustomize monitoring` i przesłać wynik do `k3s kubectl delete -f - --ignore-not-found`. Usunięcie namespace `monitoring` usuwa również lokalny sekret Grafany i wygenerowane ConfigMapy, a usunięcie wolumenów `emptyDir` usuwa historię. Przed usunięciem namespace należy potwierdzić, że zawiera tylko zasoby projektu.
3. Należy usunąć namespace `shiftplanner` poleceniem `k3s kubectl delete namespace shiftplanner --ignore-not-found` po potwierdzeniu jego zawartości.

Jeżeli host ma pozostać aktywny po tym kroku, należy przywrócić poprzednią konfigurację dostępu Traefika zgodnie z instrukcją logowania. Namespace `kube-system` zawiera komponenty klastra. [Wysyłanie poleceń przez SSM](KUBERNETES.md#uruchomienie-klastra), [Usunięcie komponentów logowania](LOGGING.md#usunięcie-komponentów-logowania)

## 3. Opróżnienie ECR

Konfiguracja repozytorium ma `force_delete = false`. Przed wykonaniem planu usunięcia należy sprawdzić adres repozytorium i listę obrazów. Należy zachować kopie obrazów, które będą jeszcze potrzebne. [Usuwanie repozytorium ECR](https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_DeleteRepository.html)

```powershell
$liveEcrUri = aws ecr describe-repositories --region $region --registry-id $account `
  --repository-names $repository --query 'repositories[0].repositoryUri' --output text
if ($LASTEXITCODE -ne 0 -or $liveEcrUri -cne $ecrUri) { throw 'Repozytorium ECR nie odpowiada stanowi Terraform.' }
aws ecr describe-images --region $region --registry-id $account --repository-name $repository `
  --query 'imageDetails[].{Digest:imageDigest,Tags:imageTags}' --output table
```

Każdy obraz przeznaczony do usunięcia należy wskazać zweryfikowanym digestem. Usunięcie po digescie usuwa również tagi obrazu. Jeżeli digest jest wskazywany przez indeks obrazu, należy najpierw sprawdzić i usunąć odpowiadający mu indeks. Po każdej operacji należy sprawdzić pole `failures`, a na końcu potwierdzić pustą listę obrazów. [Usuwanie obrazów ECR](https://docs.aws.amazon.com/cli/latest/reference/ecr/batch-delete-image.html)

```powershell
$digest = Read-Host 'Zweryfikowany digest obrazu do usunięcia'
if ($digest -cnotmatch '^sha256:[0-9a-f]{64}$') { throw 'Nieprawidłowy digest.' }
aws ecr batch-delete-image --region $region --registry-id $account --repository-name $repository `
  --image-ids "imageDigest=$digest"
aws ecr list-images --region $region --registry-id $account --repository-name $repository --output json
```

## 4. Zastosowanie planu destroy

Po opróżnieniu ECR należy utworzyć nowy zapisany plan usunięcia i ponownie zweryfikować wszystkie zasoby. Poniższe `terraform apply` wykonuje dokładnie zapisany plan w trybie destroy. Polecenie `terraform destroy` uruchamia ten sam tryb z nowym planem i interaktywnym potwierdzeniem. Zapisany plan może zawierać dane wrażliwe. Należy go przechowywać poza Gitem. [Tryb destroy Terraform](https://developer.hashicorp.com/terraform/cli/commands/destroy), [Zapisywanie planu](https://developer.hashicorp.com/terraform/cli/commands/plan)

```powershell
terraform '-chdir=infra' plan -destroy '-out=shiftplanner-destroy.tfplan'
if ($LASTEXITCODE -ne 0) { throw 'Plan usunięcia nie został zapisany.' }
terraform '-chdir=infra' show shiftplanner-destroy.tfplan
```

Po sprawdzeniu i zatwierdzeniu planu należy wykonać osobno polecenie usunięcia.

```powershell
terraform '-chdir=infra' apply shiftplanner-destroy.tfplan
if ($LASTEXITCODE -ne 0) { throw 'Usunięcie jest niepełne. Należy zachować stan Terraform.' }
terraform '-chdir=infra' state list
```

## 5. Weryfikacja po usunięciu

Należy potwierdzić w AWS wyniki odpowiadające zapisanym identyfikatorom.

| Zasób | Oczekiwany stan |
|---|---|
| EC2 | Instancja `terminated` albo identyfikator nie jest już dostępny. |
| EBS | Zapisane identyfikatory wolumenów nie są już widoczne. Dysk systemowy ma ustawienie `delete_on_termination = true`. |
| Publiczny IPv4 | Adres nie jest przypisany do interfejsu projektu. Projekt korzysta z adresu automatycznego, zwalnianego po zakończeniu instancji. |
| ECR | Repozytorium projektu nie istnieje. |
| IAM | Role EC2, CI i CD oraz profil instancji nie istnieją. Provider OIDC współdzielony poza stanem projektu pozostaje dostępny dla innych ról. |
| VPC | VPC projektu i jego zasoby sieciowe nie istnieją. |

```powershell
aws ec2 describe-instances --region $region --instance-ids $instanceId --query 'Reservations[].Instances[].State.Name'
aws ec2 describe-volumes --region $region --filters "Name=volume-id,Values=$($volumeIds -join ',')" --query 'Volumes[].VolumeId'
aws ec2 describe-network-interfaces --region $region --filters "Name=association.public-ip,Values=$publicIp" "Name=vpc-id,Values=$vpcId" --query 'NetworkInterfaces[].NetworkInterfaceId'
aws ecr describe-repositories --region $region --registry-id $account --repository-names $repository
foreach ($role in @($hostRole, $ciRole, $cdRole)) { aws iam get-role --role-name $role }
aws iam get-instance-profile --instance-profile-name $instanceProfileName
aws ec2 describe-vpcs --region $region --filters "Name=vpc-id,Values=$vpcId" --query 'Vpcs[].VpcId'
```

Pusta lista, właściwy błąd `NotFound` lub `NoSuchEntity` potwierdza brak wskazanego zasobu. Odmowa dostępu i błędy połączenia wymagają ponownej weryfikacji. W przypadku niepełnego usunięcia należy zachować stan, sprawdzić błąd i przed ponowieniem przejrzeć świeży plan. Usługi zewnętrzne, w tym Supabase, wymagają osobnego rozliczenia. [Publiczne adresy IPv4 EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html#concepts-public-addresses)
