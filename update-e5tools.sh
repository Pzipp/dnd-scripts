#!/bin/sh
# Opdaterer /e5tools (git-klonen bag 5etools) ved container-start, hvis
# UPDATE_E5TOOLS=true er sat. Fejler aldrig hårdt - en manglende opdatering
# (ingen netværk, lokale ændringer, afvigende historie) skal ikke blokere
# dnd-webui fra at starte, kun logges, så den kørende version altid bevares
# som fallback.

if [ "${UPDATE_E5TOOLS:-false}" != "true" ]; then
    echo "UPDATE_E5TOOLS er ikke sat til true - springer e5tools-opdatering over."
    exit 0
fi

cd /e5tools || exit 0

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "ADVARSEL: /e5tools har lokale/ikke-committede ændringer - springer 'git pull' over for ikke at rode med dem."
    exit 0
fi

echo "Opdaterer /e5tools (git pull --ff-only)..."
if git pull --ff-only; then
    echo "e5tools opdateret til $(git rev-parse --short HEAD)."
else
    echo "ADVARSEL: 'git pull --ff-only' kunne ikke opdatere /e5tools (netværk nede, eller lokale commits afviger fra origin) - fortsætter med den version der allerede ligger der."
fi
exit 0
