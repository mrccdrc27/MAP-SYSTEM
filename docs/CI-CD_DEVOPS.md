## DevOps and CI/CD for MAP-SYSTEM

This technical guide expands the CI/CD practices used by MAP-SYSTEM and provides concrete, copy-pasteable examples for GitHub Actions and Jenkins. It also documents how to integrate the repository automation CLI located at `Scripts/cli/index.js` into CI pipelines.

Summary:
- CI triggers: Pull Requests (PRs), push to main/production branches, and scheduled runs for nightly integration checks.
- Core CI responsibilities: static analysis & linters, unit tests, frontend builds, multi-service Docker image builds, integration tests using `tts/Docker/docker-compose.yml`, and publishing artifacts/images.

1) Pipeline stages (expanded)
- Source: developer opens PR or pushes to a branch.
- Pre-merge checks (fast): lint, unit tests, dependency scan, license checks.
- Build: build artifacts and container images using `docker buildx` (multi-platform optional), cache layers, and produce reproducible tags.
- Integration: start the `tts` integration stack (`tts/Docker/docker-compose.yml`), wait for healthchecks, and run end-to-end tests (`Scripts/cli` or python tests).
- Publish: push built images to a registry, upload test reports/artifacts, and create GitHub Releases if required.
- Deploy: trigger deployment workflows for `main`/`production` (tag-based or branch-based), run smoke tests, and notify on success/failure.

Pipeline diagram (text):

    PR / Push
       |
       v
    GitHub Actions - Prechecks (lint, unit tests)
       |
       v
    Build & Image creation (Buildx, cache)
       |
       v
    Docker Compose Integration (start tts stack)
       |
       v
    Integration tests (Scripts/cli or pytest)
       |
       v
    Publish artifacts / Deploy

2) GitHub Actions — detailed, practical examples

Below are ready-to-adapt workflow examples. Replace secrets and registry values with your environment.

A. `build-and-test.yml` (detailed)

```yaml
name: Build and Test
on:
  pull_request:
  push:
    branches: [ main, develop ]

jobs:
  prechecks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install frontend deps
        run: |
          cd tts/frontend && npm ci
      - name: Lint frontend
        run: |
          cd tts/frontend && npm run lint || true
      - name: Run unit tests (Python services)
        uses: actions/setup-python@v4
        with: python-version: '3.11'
      - name: Install Python deps
        run: python -m pip install -r requirements.txt
      - name: Run pytest
        run: pytest -q --junitxml=reports/junit.xml
      - name: Upload test reports
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-reports
          path: reports/

  build-images:
    needs: prechecks
    runs-on: ubuntu-latest
    permissions: write-all
    steps:
      - uses: actions/checkout@v4
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v2
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      - name: Log in to registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      - name: Build and push images
        run: |
          docker buildx build --push --platform linux/amd64 -t ${{ secrets.REGISTRY_URL }}/map/tts:${{ github.sha }} -f tts/Docker/Dockerfile tts/
          # Repeat for other services as needed
      - name: Save image tags
        run: echo "IMAGE_TAG=${{ github.sha }}" >> $GITHUB_ENV

```

Notes:
- Use `actions/upload-artifact` to persist logs and reports between jobs.
- Use `docker buildx` with `--cache-from` when you have a remote registry to speed up CI.

B. `docker-compose-test.yml` (detailed)

```yaml
name: Docker Compose Integration Test
on:
  push:
    branches: [ main, develop ]

jobs:
  integration:
    runs-on: ubuntu-latest
    services: {}
    steps:
      - uses: actions/checkout@v4
      - name: Configure Docker Compose
        uses: docker/compose-action@v2
      - name: Start integration stack
        run: |
          cd tts/Docker
          docker compose up -d --build
      - name: Wait for services
        run: |
          # loop until key health endpoints respond (adjust endpoints for services)
          for i in {1..30}; do
            docker compose exec -T auth-service curl -fsS http://localhost:8000/api/health/ && break || sleep 5
          done
      - name: Run integration tests
        run: |
          node Scripts/cli/index.js run testing:integration:hdts-tts -- --verbose || true
      - name: Collect logs & artifacts
        if: always()
        run: |
          mkdir -p $GITHUB_WORKSPACE/ci-logs
          docker compose logs --no-color > $GITHUB_WORKSPACE/ci-logs/compose.log || true
      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-logs
          path: ci-logs/
      - name: Teardown
        if: always()
        run: |
          cd tts/Docker
          docker compose down -v --remove-orphans

```

3) Deploy workflow (example)

```yaml
name: Deploy
on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Log in to registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      - name: Pull and tag image
        run: |
          docker pull ${{ secrets.REGISTRY_URL }}/map/tts:${{ github.sha }}
          docker tag ${{ secrets.REGISTRY_URL }}/map/tts:${{ github.sha }} ${{ secrets.REGISTRY_URL }}/map/tts:latest
          docker push ${{ secrets.REGISTRY_URL }}/map/tts:latest
      - name: Deploy to host (example via SSH)
        uses: appleboy/ssh-action@v0.1.10
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull ${{ secrets.REGISTRY_URL }}/map/tts:latest
            docker compose -f /opt/tts/docker-compose.prod.yml up -d --no-deps --build

```

4) Jenkins (credentials-aware) — practical example

```groovy
pipeline {
  agent any
  environment {
    REGISTRY = credentials('registry-creds')
    SSH_KEY = credentials('deploy-ssh')
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Build') { steps { sh 'docker build -f tts/Docker/Dockerfile -t map/tts:ci tts/' } }
    stage('Compose Up') { steps { dir('tts/Docker') { sh 'docker compose up -d --build' } } }
    stage('Integration Tests') { steps { sh 'node Scripts/cli/index.js run testing:integration:hdts-tts' } }
  }
  post { always { dir('tts/Docker') { sh 'docker compose down -v || true' } } }
}
```

5) Secrets, credentials, and environment variables (recommendations)
- GitHub Secrets to define: `REGISTRY_URL`, `REGISTRY_USER`, `REGISTRY_PASSWORD`, `DOCKERHUB_TOKEN`, `SSH_PRIVATE_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `SENDGRID_API_KEY` (if needed by services during tests), and service-specific keys.
- Do not store secrets in repo files. Use environment-specific secrets in GitHub (or Vault) and mount them in runtime containers.

6) Image tagging, promotion and rollback
- Tag images with `sha` for immutable artifacts.
- Promote a successful `sha` to `staging`/`production` by pushing a `latest` or `prod` tag referencing the `sha`.
- Rollback: re-tag a known-good `sha` as `latest` and redeploy, or use orchestration's rollback feature (Kubernetes `kubectl rollout undo`).

7) Integrating `Scripts/cli/index.js` in CI
- The repository's CLI centralizes integration commands. CI examples above call:
  - `node Scripts/cli/index.js run testing:integration:hdts-tts` to run integration tests.
  - `node Scripts/cli/index.js run docker:tts:start` to start local compose during debug.
- When invoking the CLI in CI, pass flags and ensure required secrets are available (e.g., `SENDGRID_API_KEY` may be required by Auth service during tests). Consider overriding expensive external integrations (use mocks or test-only flags).

8) Healthcheck and wait strategies (robust patterns)
- Prefer active health endpoints and probe them in a loop with timeout instead of static sleeps. Example (bash):

```bash
for i in {1..30}; do
  if curl -fsS http://localhost:8003/api/health/; then
    echo 'auth ready' && break
  fi
  sleep 5
done
```

9) Test reporting, logs and artifacts
- Upload `pytest` junit XML and coverage reports with `actions/upload-artifact`.
- On failures, collect `docker compose logs` for key services and upload as artifacts.

10) Monitoring, alerts and notifications
- Integrate GitHub checks with Slack or Teams via webhook actions for build failures.
- For production, use metrics exporters (Prometheus) and error monitoring (Sentry). CI should emit basic metrics and notify on flaky or repeated test failures.

11) Troubleshooting tips (practical)
- If compose services fail to start: `docker compose logs` and `docker compose ps` are first checks.
- For DB migrations: ensure test DBs are created and migrations run before tests (CI step: `python manage.py migrate`).
- If RabbitMQ connectivity fails: check service health and credentials in secrets.

12) Local developer flow
- Run unit tests locally: `pytest -q` from project root.
- Run integration stack locally for debugging:

```bash
cd tts/Docker
docker compose up -d --build
node ../..../Scripts/cli/index.js run testing:integration:hdts-tts
```

13) Security and compliance notes
- Run dependency scanning (GitHub Dependabot or Snyk) and secret scanning on PRs.
- Block merging if critical vulnerabilities or failing security checks are detected.

References and repository pointers
- Primary integration compose: `tts/Docker/docker-compose.yml` (used by `docker-compose-test.yml`).
- CLI automation: `Scripts/cli/index.js` (used to run integration tests and manage PM2 frontends).
- Troubleshooting: `DEPLOYMENT_TROUBLESHOOTING_GUIDE.md` (practical commands and checks).

----
File: docs/CI-CD_DEVOPS.md
