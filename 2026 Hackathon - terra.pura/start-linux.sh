#!/bin/bash
# terra.pura launcher for Linux: run  ./start-linux.sh  (or double-click and choose "Run in terminal").
# It uses the files in this folder (no download) and asks how you want to run terra.pura.
cd "$(dirname "$0")" || exit 1
TP_SOURCE="$(pwd)" bash ./install.sh
