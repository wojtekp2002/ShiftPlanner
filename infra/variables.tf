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
  description = "IPv4 CIDR allowed to connect to TCP 22. Leave null to disable SSH ingress."
  type        = string
  default     = null

  validation {
    condition     = var.allowed_ssh_cidr == null || try(cidrnetmask(var.allowed_ssh_cidr) != "0.0.0.0", false)
    error_message = "Use null or a valid IPv4 CIDR narrower than /0 for SSH."
  }
}

variable "instance_type" {
  description = "An x86_64 T3 or T3a EC2 size supported by this configuration."
  type        = string
  default     = "t3.small"

  validation {
    condition     = can(regex("^t3a?\\.(micro|small|medium)$", var.instance_type))
    error_message = "Choose a T3 or T3a instance of size micro, small, or medium."
  }
}

variable "key_name" {
  description = "Name of an existing EC2 key pair in the selected region, if SSH is needed."
  type        = string
  default     = null
}
