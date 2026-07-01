#!/usr/bin/env bash
#
# Automated verification test for mcserver-installer
#

echo "=== Run Validation Tests ==="
status=0

# 0. Check unresolved merge conflicts
echo -n "Checking unresolved merge conflict markers... "
if grep -R -n -E '^(<<<<<<<|=======|>>>>>>>)' mcserver-installer README.md verify.sh >/dev/null 2>&1; then
    echo "FAIL"
    grep -R -n -E '^(<<<<<<<|=======|>>>>>>>)' mcserver-installer README.md verify.sh
    exit 1
else
    echo "PASS"
fi

# 1. Check Bash Syntax
echo -n "Checking mcserver-installer Bash syntax... "
if bash -n mcserver-installer; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

# 2. Check executable permission can be set
echo -n "Making mcserver-installer executable... "
chmod +x mcserver-installer
if [ -x mcserver-installer ]; then
    echo "PASS"
else
    echo "FAIL"
    exit 1
fi

echo -n "Checking JQ version manifest parsing... "
if command -v jq &>/dev/null && command -v curl &>/dev/null; then
    # Test curl and jq output format
    res=$(curl -fsS --connect-timeout 10 "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json" 2>/dev/null | jq -r '.latest.release // empty' 2>/dev/null)
    if [[ "$res" =~ ^[0-9]+(\.[0-9]+)*$ ]]; then
        echo "PASS ($res)"
    else
        echo "FAIL (JQ parse empty)"
        status=1
    fi
else
    echo "SKIP (curl or jq missing)"
fi

if [ "$status" -eq 0 ]; then
    echo "=== All syntax and dependencies checks completed successfully! ==="
else
    echo "=== Validation completed with failures. ==="
fi
exit "$status"
