# PRO Albrechtice

Kampaňová stránka hnutí **PRO Albrechtice** pro komunální volby v říjnu 2026.

Statický web — žádný build, žádné dependency. HTML + CSS + jeden soubor JS.

Hostováno na GitHub Pages: https://kubandir.github.io/proalbrechtice/

## Struktura

```
.
├── index.html           # jediná stránka
├── css/
│   ├── tokens.css       # OKLCH design tokens, fluid type
│   ├── base.css
│   ├── nav.css
│   ├── hero.css
│   ├── ballot.css       # hlasovací lístek (signature interaction)
│   ├── sections.css
│   ├── members.css      # medailonky kandidátů
│   └── closing.css
├── js/main.js           # ballot check + members interactions
└── images/              # všechny obrázky včetně lide/*.jpg
```
