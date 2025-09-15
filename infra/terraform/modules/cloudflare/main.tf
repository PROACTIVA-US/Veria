terraform {
  required_providers {
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.0" }
  }
}
provider "cloudflare" { api_token = var.cloudflare_api_token }

data "cloudflare_zones" "zone" {
  filter { name = var.zone }
}

locals { zone_id = length(data.cloudflare_zones.zone.zones) > 0 ? data.cloudflare_zones.zone.zones[0].id : "" }

resource "cloudflare_record" "root_apex" {
  count   = var.enable_dns_examples ? 1 : 0
  zone_id = local.zone_id
  name    = "@"
  type    = "A"
  value   = "203.0.113.10"
  proxied = true
  ttl     = 300
}

resource "cloudflare_record" "app_cname_placeholder" {
  count   = var.enable_dns_examples ? 1 : 0
  zone_id = local.zone_id
  name    = "app"
  type    = "CNAME"
  value   = "app.${var.root_domain}"
  proxied = true
  ttl     = 300
}
