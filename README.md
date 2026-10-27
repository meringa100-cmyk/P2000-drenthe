# P2000 Drenthe

Mobiele webapp voor openbare P2000-meldingen in Emmen en Drenthe.

## Werking
- `index.html`: mobiele interface, filters en automatische verversing.
- `api/p2000.js`: serverfunctie die de openbare RSS-feed ophaalt en JSON teruggeeft.
- De browser roept `/api/p2000?area=emmen` of `/api/p2000?area=drenthe` aan. Hierdoor hoeft de browser de externe RSS-feed niet rechtstreeks te benaderen en gebruiken we geen ingebedde widget.

## Deploy
Koppel deze repository aan Vercel. De Vercel Node.js Function staat in `api/p2000.js`; de statische startpagina is `index.html`. Geen environment variables zijn vereist.

## Belangrijk
De live verbinding moet na deployment getest worden. Als de bron de RSS-feed wijzigt of de feed niet beschikbaar maakt, toont de app een foutmelding en link naar de bron. P2000 is geen officieel alarmsysteem.
