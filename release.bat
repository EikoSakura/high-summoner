@echo off
REM Easy launcher for release.ps1 — bypasses PowerShell execution policy.
REM Usage:  release            (patch bump)
REM         release minor      (or major, or an explicit X.Y.Z)
REM         release patch -Notes "What changed in this release."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
