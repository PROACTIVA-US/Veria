#!/usr/bin/env python3
import sys, json, argparse, time, hashlib, yaml

def load(path):
    with open(path) as f:
        return json.load(f)

def policy_hash(policy):
    return hashlib.sha256(json.dumps(policy, sort_keys=True).encode()).hexdigest()[:16]

def freeze(policy, subject):
    if subject not in policy.get("denyList", []):
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

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["hash","freeze","replay","run-tests"])
    ap.add_argument("--policy", required=True)
    ap.add_argument("--subject")
    ap.add_argument("--tests")
    args = ap.parse_args()

    policy = load(args.policy)
    if args.cmd == "hash":
        print(policy_hash(policy)); return
    if args.cmd == "freeze":
        if not args.subject: raise SystemExit("--subject required")
        policy = freeze(policy, args.subject)
        print(json.dumps(policy, indent=2)); return
    if args.cmd == "run-tests":
        with open(args.tests) as f:
            suite = yaml.safe_load(f)
        failures = 0
        for t in suite["tests"]:
            case = t.get("input",{})
            if "setup" in t and "freeze" in t["setup"]:
                freeze(policy, t["setup"]["freeze"])
            got = simulate(policy, case)
            expect = t.get("expect",{})
            ok = all(got.get(k)==v for k,v in expect.items() if k in got or k=="decision")
            print(f"[{'PASS' if ok else 'FAIL'}] {t['name']}: got={got} expect={expect}")
            if not ok: failures += 1
        if failures: sys.exit(1)
        return
    if args.cmd == "replay":
        # simple stub
        print(json.dumps({"trace":"not implemented (demo)"})); return

if __name__ == "__main__":
    main()
