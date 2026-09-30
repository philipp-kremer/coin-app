# Kopf oder Zahl 🪙

Münzwurf-App als PWA. Bei 2 % der Würfe liefert die Münze **kein** Ergebnis.

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

Die App zählt deine Würfe und Serien und sammelt die seltenen Ereignisse, die du schon erlebt hast.
Du kannst Kopf und Zahl beschriften („Kopf = Pizza, Zahl = Burger“). Sie spielt Töne ab, vibriert und läuft offline.
Den Zufall liefert `crypto.getRandomValues`.

## Installieren

Ein GitHub-Actions-Workflow veröffentlicht die App auf GitHub Pages. Aktiviere dafür einmal in den Repo-Einstellungen
**Settings → Pages → Source: GitHub Actions**. Danach findest du die App unter `https://<user>.github.io/coin-app/`.

- **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“
- **Android (Chrome):** Menü → „App installieren“ oder der Knopf in der App

## Lokal starten

```sh
npx http-server .
```

Die Wahrscheinlichkeiten stehen in `OUTCOMES` in `app.js`. Wenn du etwas änderst, zähl die Cache-Version in `sw.js` hoch.
