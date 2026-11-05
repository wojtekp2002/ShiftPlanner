resource "aws_iam_openid_connect_provider" "github" {
  count = var.github_oidc_provider_arn == null ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  tags = { Name = "${local.name_prefix}-github-oidc" }
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.github_oidc_provider_arn == null ? 0 : 1

  arn = var.github_oidc_provider_arn

  lifecycle {
    postcondition {
      condition     = trimprefix(self.url, "https://") == "token.actions.githubusercontent.com" && contains(self.client_id_list, "sts.amazonaws.com")
      error_message = "The existing OIDC provider must use GitHub's issuer and include the sts.amazonaws.com audience."
    }
  }
}

locals {
  github_oidc_provider_arn = var.github_oidc_provider_arn == null ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

data "aws_iam_policy_document" "github_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/*"]
    }
  }
}

resource "aws_iam_role" "github_ci" {
  name               = "${local.name_prefix}-github-ci"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json

  tags = { Name = "${local.name_prefix}-github-ci" }
}

data "aws_iam_policy_document" "github_ecr_push" {
  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [aws_ecr_repository.app.arn]
  }
}

resource "aws_iam_role_policy" "github_ecr_push" {
  name   = "push-shiftplanner-images"
  role   = aws_iam_role.github_ci.name
  policy = data.aws_iam_policy_document.github_ecr_push.json
}
