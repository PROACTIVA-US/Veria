variable "cloudflare_api_token" { type = string, sensitive = true }
variable "zone" { type = string }
variable "root_domain" { type = string }
variable "enable_dns_examples" { type = bool, default = false }
