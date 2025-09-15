output "zone_id" {
  value       = length(data.cloudflare_zones.zone.zones) > 0 ? data.cloudflare_zones.zone.zones[0].id : null
}
