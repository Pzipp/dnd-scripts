# D&D WebUI

En lille Flask-WebUI oven på de eksisterende D&D-generatorer.

## Funktioner

- vælg karakter
- vælg **Karakterark** eller **Kort**
- rediger YAML direkte i browseren
- vælg accentfarve
- generer eksisterende HTML-output
- se output direkte i WebUI eller åbn det i en ny fane

WebUI'en skriver **ikke** de redigerede YAML-data tilbage til \`karakterer/\`. YAML'en kopieres midlertidigt til \`webui/runtime/\`, og den eksisterende \`dnd.py\` køres som subprocess med \`--ud\` til \`webui/output/\`.

De eksisterende scripts og deres data er derfor uafhængige af WebUI'en og er ikke ændret.

## Kør lokalt

Fra repository-roden:

\`\`\`bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r webui/requirements.txt
python webui/app.py
\`\`\`

Åbn derefter:

\`\`\`
http://localhost:8080
\`\`\`

Porten kan ændres med \`PORT\`, fx:

\`\`\`bash
PORT=8081 python webui/app.py
\`\`\`
