#!/usr/bin/env bash
set -euo pipefail
lan_test_dir=$(mktemp -d)
for artifact in nanohttpd nanohttpd-websocket; do
  curl -fsSL "https://repo.maven.apache.org/maven2/org/nanohttpd/$artifact/2.3.1/$artifact-2.3.1.jar" -o "$lan_test_dir/$artifact.jar"
done
curl -fsSL https://repo.maven.apache.org/maven2/com/google/code/gson/gson/2.11.0/gson-2.11.0.jar -o "$lan_test_dir/gson.jar"
lan_classpath="$lan_test_dir/classes:$lan_test_dir/nanohttpd.jar:$lan_test_dir/nanohttpd-websocket.jar:$lan_test_dir/gson.jar"
mkdir -p "$lan_test_dir/classes"
javac -cp "$lan_classpath" -d "$lan_test_dir/classes" apps/android-host/app/src/main/java/es/elteto/lan/LanServer.java tests/java/LanServerMain.java
printf '%s' "$lan_classpath" > .lan-java-classpath
