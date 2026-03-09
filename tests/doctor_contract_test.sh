#!/usr/bin/env bash
set -euo pipefail

# Scenario: make doctor passes when centralized architecture preconditions are satisfied
doctor_output="$(make doctor 2>&1)"
echo "$doctor_output" | grep -Fq "PASS"
echo "$doctor_output" | grep -Fq "commands"
echo "$doctor_output" | grep -Fq "manifest"
echo "$doctor_output" | grep -Fq "templates"

echo "PASS: doctor contract checks"
