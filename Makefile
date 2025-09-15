.PHONY: verify lint plan-dev apply-dev build-push blitzy-dryrun

verify:
	@./scripts/verify-structure.sh

lint:
ifneq ($(shell command -v tflint >/dev/null 2>&1; echo $$?),0)
	@echo "tflint not installed; skipping tflint. Install: https://github.com/terraform-linters/tflint"
endif
	@if command -v terraform >/dev/null 2>&1; then terraform fmt -check -recursive infra/terraform || true; fi
	@if command -v tflint >/dev/null 2>&1; then tflint --recursive infra/terraform || true; fi

plan-dev:
	cd infra/terraform/envs/dev && terraform init -input=false && terraform plan

apply-dev:
	cd infra/terraform/envs/dev && terraform init -input=false && terraform apply -auto-approve

# Build & push app image (set APP_PATH if app is in a different directory)
build-push:
	@test -n "$(TF_VAR_GCP_PROJECT)" || (echo "Set TF_VAR_GCP_PROJECT"; exit 1)
	$(eval APP_IMAGE=us-central1-docker.pkg.dev/$(TF_VAR_GCP_PROJECT)/veria-containers/veria-web)
	@if ! command -v gcloud >/dev/null 2>&1; then echo "Install gcloud first"; exit 1; fi
	gcloud auth configure-docker us-central1-docker.pkg.dev
	cd $(APP_PATH) && docker build -t "$(APP_IMAGE):latest" . && docker push "$(APP_IMAGE):latest"

blitzy-dryrun:
	@./scripts/blitzy-dryrun.sh

# --- Blitzy helpers ---
.PHONY: ci test build smoke tag-baseline
ci: test build
test:
	@echo "Add real tests here"; exit 0
build:
	@echo "Add real build here"; exit 0
smoke:
	@./scripts/blitzy-smoke.sh
tag-baseline:
	@git tag -a v0.1.0 -m "Baseline ready for Blitzy" || true
	@git push origin v0.1.0 || true
