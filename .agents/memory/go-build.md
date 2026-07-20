---
name: Go 1.25.5 backend build
description: How to build the Go backend in this Replit environment — Go version, cached deps, toolchain flag
---

Go 1.25.5 is available at `/nix/store/60z37432vmgkg54krwr1z057bqwp7583-go-1.25.5/bin`. The default Go (1.21) cannot build the backend because pgx v5.10.0 (the only unblocked version in the module cache) requires go >= 1.25.

**Why:** The Replit CVE firewall blocks all pgx v5 zips except v5.10.0 which was pre-cached. pgx v5.10.0 requires go 1.25.

**How to apply:** Always prefix Go backend commands with `export PATH="/nix/store/60z37432vmgkg54krwr1z057bqwp7583-go-1.25.5/bin:$PATH"`. The Go Backend workflow already includes this.
