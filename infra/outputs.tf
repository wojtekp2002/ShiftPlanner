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
