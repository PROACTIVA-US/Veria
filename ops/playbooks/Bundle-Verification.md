# Bundle Verification Playbook

1. Unzip bundle into the same repo root; accept overwrites.
2. `pnpm i`
3. Start the new service(s) added in this bundle.
4. Hit `/health` or page route(s) listed in the bundle README.
5. Commit + tag: `git add -A && git commit -m "Bundle XX" && git tag bundle-xx`
