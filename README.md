# Kopf oder Zahl 🪙

Eine Münzwurf-App als PWA – mit einer kleinen, aber echten Chance, dass die Münze **kein** Ergebnis liefert.

| Ergebnis | Wahrscheinlichkeit |
| --- | --- |
| Kopf | 49 % |
| Zahl | 49 % |
| 🪙 Landet auf dem Rand | 0,8 % |
| 🐦 Möwe klaut die Münze | 0,4 % |
| 🕳️ Rollt in den Gully | 0,4 % |
| 🎈 Münze schwebt | 0,2 % |
| 💔 Zerbricht: halb Kopf, halb Zahl | 0,15 % |
| 🌌 Schwarzes Loch | 0,05 % |

Außerdem: Statistik, Serien, eine Sammlung der seltenen Ereignisse, optionale Beschriftung („Kopf = Pizza, Zahl = Burger“), Sound + Vibration, offline nutzbar.
Der Zufall kommt aus `crypto.getRandomValues`.

## Installieren

Die App wird per GitHub Actions auf GitHub Pages veröffentlicht (einmalig in den Repo-Einstellungen unter
**Settings → Pages → Source: GitHub Actions** aktivieren). Danach ist sie unter
`https://<user>.github.io/coin-app/` erreichbar.

- **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“
- **Android (Chrome):** Menü → „App installieren“ bzw. der Knopf in der App

## Lokal starten

```sh
npx http-server .
```

Die Wahrscheinlichkeiten stehen in `OUTCOMES` in `app.js`. Nach Änderungen die Cache-Version in `sw.js` hochzählen.
