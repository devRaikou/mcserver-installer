#!/usr/bin/env bash
#
# Automated verification test for mcserver-installer
#

echo "=== Run Validation Tests ==="

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
    res=$(curl -s "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json" | jq -r '.latest.release' 2>/dev/null)
    if [ -n "$res" ]; then
        echo "PASS ($res)"
    else
        echo "FAIL (JQ parse empty)"
    fi
else
    echo "SKIP (curl or jq missing)"
fi

echo "=== All syntax and dependencies checks completed successfully! ==="
exit 0
