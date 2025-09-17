#!/usr/bin/env python3
import sys, json, argparse, time, hashlib, yaml, os

def load(path):
    with open(path) as f:
        return json.load(f)

def policy_hash(policy):
    return hashlib.sha256(json.dumps(policy, sort_keys=True).encode()).hexdigest()[:16]

def freeze(policy, subject):
    if "denyList" not in policy:
        policy["denyList"] = []
    if subject not in policy["denyList"]:
        policy["denyList"].append(subject)
    return policy

def simulate(policy, case):
    subj = case.get("subject")
    if subj in policy.get("denyList", []):
        return {"decision":"DENY","reason":"frozen"}
    juris = case.get("jurisdiction","US")
    if not policy["jurisdictions"].get(juris,{}).get("allow",False):
        return {"decision":"DENY","reason":"jurisdiction"}
    return {"decision":"ALLOW"}

def run_tests(policy_path, tests_path):
    """Run tests and return (success_count, failure_count)"""
    policy = load(policy_path)
    with open(tests_path) as f:
        suite = yaml.safe_load(f)

    successes = 0
    failures = 0

    for t in suite["tests"]:
        case = t.get("input",{})
        if "setup" in t and "freeze" in t["setup"]:
            freeze(policy, t["setup"]["freeze"])
        got = simulate(policy, case)
        expect = t.get("expect",{})
        ok = all(got.get(k)==v for k,v in expect.items() if k in got or k=="decision")
        print(f"[{'PASS' if ok else 'FAIL'}] {t['name']}: got={got} expect={expect}")

        if ok:
            successes += 1
        else:
            failures += 1

    return successes, failures

def watch_mode(policy_path, tests_path, interval=2):
    """Watch for changes and re-run tests"""
    print(f"👁️  Watch mode: monitoring {policy_path} and {tests_path}")
    print(f"   Re-running tests every {interval} seconds on file change")
    print("   Press Ctrl+C to exit\n")

    last_policy_mtime = 0
    last_tests_mtime = 0

    try:
        while True:
            try:
                policy_mtime = os.path.getmtime(policy_path)
                tests_mtime = os.path.getmtime(tests_path)

                # Check if either file has changed
                if policy_mtime != last_policy_mtime or tests_mtime != last_tests_mtime:
                    if last_policy_mtime != 0:  # Skip first run message
                        print(f"\n🔄 Change detected, re-running tests...")

                    print(f"\n{'='*60}")
                    print(f"Running tests at {time.strftime('%Y-%m-%d %H:%M:%S')}")
                    print(f"{'='*60}")

                    successes, failures = run_tests(policy_path, tests_path)

                    print(f"\nResults: {successes} passed, {failures} failed")

                    if failures == 0:
                        print("✅ All tests passed!")
                    else:
                        print(f"❌ {failures} test(s) failed")

                    last_policy_mtime = policy_mtime
                    last_tests_mtime = tests_mtime

            except FileNotFoundError as e:
                print(f"⚠️  File not found: {e}")
            except Exception as e:
                print(f"⚠️  Error: {e}")

            time.sleep(interval)

    except KeyboardInterrupt:
        print("\n\n👋 Watch mode stopped")
        sys.exit(0)

def main():
    ap = argparse.ArgumentParser(description="Veria Policy CLI Tool")
    ap.add_argument("cmd", choices=["hash","freeze","replay","run-tests","watch"])
    ap.add_argument("--policy", required=True, help="Path to policy JSON file")
    ap.add_argument("--subject", help="Subject to freeze/unfreeze")
    ap.add_argument("--tests", help="Path to tests YAML file")
    ap.add_argument("--interval", type=int, default=2, help="Watch interval in seconds (default: 2)")
    args = ap.parse_args()

    if args.cmd == "hash":
        policy = load(args.policy)
        print(policy_hash(policy))
        return

    if args.cmd == "freeze":
        if not args.subject:
            raise SystemExit("--subject required")
        policy = load(args.policy)
        policy = freeze(policy, args.subject)
        print(json.dumps(policy, indent=2))
        return

    if args.cmd == "run-tests":
        if not args.tests:
            raise SystemExit("--tests required")
        successes, failures = run_tests(args.policy, args.tests)
        if failures:
            sys.exit(1)
        return

    if args.cmd == "watch":
        if not args.tests:
            raise SystemExit("--tests required for watch mode")
        watch_mode(args.policy, args.tests, args.interval)
        return

    if args.cmd == "replay":
        # simple stub
        print(json.dumps({"trace":"not implemented (demo)"}))
        return

if __name__ == "__main__":
    main()