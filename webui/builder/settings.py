"""Standardværdier for karakter-indstillinger (kilder, husregler).

Selve indstillingerne gemmes pr. karakter i dens egen choices.yaml under
"settings" (ikke delt for hele byggeren - to spillere kan have forskellige
tilladte kilder eller husregler i gang samtidig). Denne fil holder kun
hvad NYE karakterer starter med, se model.empty_character().
"""
from __future__ import annotations

DEFAULT_SOURCES = ["XPHB"]

# "Alle General-feats er half-feats" er ikke en fastlagt regel her, kun en
# mulig husregel - se diskussionen i model._feat_sub_choices. Default fra.
DEFAULT_HALF_FEATS = False
