output "vpc_id" {
  description = "ID of the ShiftPlanner VPC."
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet."
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "ID of the EC2 security group."
  value       = aws_security_group.host.id
}

output "ec2_instance_id" {
  description = "ID of the ShiftPlanner EC2 instance."
  value       = aws_instance.host.id
}

output "ec2_public_ip" {
  description = "Public IPv4 address of the EC2 instance."
  value       = aws_instance.host.public_ip
}

output "ecr_repository_url" {
  description = "URL of the private ECR repository."
  value       = aws_ecr_repository.app.repository_url
}

output "aws_region" {
  description = "AWS region to configure for GitHub Actions."
  value       = var.aws_region
}

output "ecr_repository_name" {
  description = "ECR repository name to configure for GitHub Actions."
  value       = aws_ecr_repository.app.name
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions to authenticate through OIDC and publish images."
  value       = aws_iam_role.github_ci.arn
}

output "github_actions_deploy_role_arn" {
  description = "IAM role ARN for the GitHub Actions main branch to deploy through SSM."
  value       = aws_iam_role.github_deploy.arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the created or reused GitHub IAM OIDC provider."
  value       = local.github_oidc_provider_arn
}
