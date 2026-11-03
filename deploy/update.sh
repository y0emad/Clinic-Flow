#!/bin/sh
# Runs on the server every few minutes (cron). If Docker Hub has a newer image than the one
# running, it restarts the app container on it. CI pushes a new image on every merge to main,
# so the server pulls updates by itself and needs no inbound access from GitHub.
#
# Setup on the server (once):
#   curl -fsSL https://raw.githubusercontent.com/y0emad/Clinic-Flow/main/deploy/update.sh -o ~/clinicflow-update.sh
#   chmod +x ~/clinicflow-update.sh
#   (crontab -l 2>/dev/null; echo "*/2 * * * * $HOME/clinicflow-update.sh >> $HOME/clinicflow-deploy.log 2>&1") | crontab -
set -eu

IMAGE="${IMAGE:-yousefemad/clinicflow:latest}"
NAME="clinicflow"
NETWORK="clinicflow"
ENV_FILE="$HOME/clinicflow.env"

running=$(docker inspect -f '{{.Image}}' "$NAME" 2>/dev/null || true)
docker pull -q "$IMAGE" >/dev/null
latest=$(docker image inspect -f '{{.Id}}' "$IMAGE")

# Nothing new, and the app is running: done.
if [ "$running" = "$latest" ]; then
  exit 0
fi

echo "$(date -Is) new image $latest, restarting $NAME"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped --network "$NETWORK" --env-file "$ENV_FILE" "$IMAGE" >/dev/null

# Wait for the health check route (migrations run on start).
for _ in $(seq 1 30); do
  if docker exec "$NAME" node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "$(date -Is) deployed, healthy"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done

echo "$(date -Is) WARNING: $NAME is not healthy, check: docker logs $NAME"
exit 1
