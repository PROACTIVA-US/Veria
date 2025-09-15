output "artifact_registry_repo" { value = try(google_artifact_registry_repository.containers[0].name, null) }
output "vpc_self_link" { value = try(google_compute_network.veria_vpc[0].self_link, null) }
output "subnet_self_link" { value = try(google_compute_subnetwork.veria_subnet[0].self_link, null) }
