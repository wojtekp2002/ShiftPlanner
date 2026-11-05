variable "aws_region" {
  description = "AWS region for the ShiftPlanner foundation."
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Project name used for resource names and tags."
  type        = string
  default     = "ShiftPlanner"
}

variable "environment" {
  description = "Environment name used for resource names and tags."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "IPv4 CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidr" {
  description = "IPv4 CIDR block for the public subnet, within the VPC CIDR."
  type        = string
  default     = "10.20.1.0/24"
}

variable "allowed_ssh_cidr" {
  description = "IPv4 CIDR allowed to connect to TCP 22. A null value disables SSH ingress."
  type        = string
  default     = null

  validation {
    condition     = var.allowed_ssh_cidr == null || try(cidrnetmask(var.allowed_ssh_cidr) != "0.0.0.0", false)
    error_message = "SSH requires null or a valid IPv4 CIDR narrower than /0."
  }
}

variable "instance_type" {
  description = "An x86_64 T3 or T3a EC2 size supported by this configuration."
  type        = string
  default     = "t3.small"

  validation {
    condition     = can(regex("^t3a?\\.(micro|small|medium)$", var.instance_type))
    error_message = "The instance must be T3 or T3a with size micro, small, or medium."
  }
}

variable "key_name" {
  description = "Name of an existing EC2 key pair in the selected region, if SSH is needed."
  type        = string
  default     = null
}

variable "github_repository" {
  description = "Exact GitHub owner/repository allowed to assume the CI role from branch workflows. Optional @ID suffixes select GitHub's immutable subject format."
  type        = string
  default     = "wojtekp2002/ShiftPlanner"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+(@[0-9]+)?/[A-Za-z0-9_.-]+(@[0-9]+)?$", var.github_repository))
    error_message = "An exact owner/repository is required, optionally with immutable @IDs, without wildcards or extra subject claims."
  }
}

variable "github_oidc_provider_arn" {
  description = "ARN of an existing shared GitHub IAM OIDC provider. A null value creates and manages the provider in this Terraform state."
  type        = string
  default     = null

  validation {
    condition     = var.github_oidc_provider_arn == null || can(regex("^arn:[^:]+:iam::[0-9]{12}:oidc-provider/token\\.actions\\.githubusercontent\\.com$", var.github_oidc_provider_arn))
    error_message = "The value must be null or the ARN of a GitHub IAM OIDC provider."
  }
}
