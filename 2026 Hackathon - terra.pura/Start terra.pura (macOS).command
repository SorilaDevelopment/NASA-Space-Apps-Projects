#!/bin/bash
# terra.pura launcher for macOS: double-click this file.
# (First time: right-click > Open, then Open, because it was downloaded from the internet.)
# It uses the files in this folder (no download) and asks how you want to run terra.pura.
cd "$(dirname "$0")" || exit 1
TP_SOURCE="$(pwd)" bash ./install.sh
