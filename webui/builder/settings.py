"""Standardværdier for karakter-indstillinger (kilder).

Selve indstillingerne gemmes pr. karakter i dens egen choices.yaml under
"settings" (ikke delt for hele byggeren - to spillere kan have forskellige
tilladte kilder eller husregler i gang samtidig). Denne fil holder kun
hvad NYE karakterer starter med, se model.empty_character().
"""
from __future__ import annotations

DEFAULT_SOURCES = ["XPHB"]

# 2024 flyttede evnebonussen fra racen til baggrunden. Slået til, tæller ÆLDRE racers egen
# `ability` (fx PHB Dwarf +2 CON) også med - ellers ignoreres den for ikke at tælle dobbelt.
DEFAULT_RACE_ABILITY = False
