# Style Guide: Nano Audio (Cyberpunk/Sci-Fi)

Dokument opisuje zasady wizualne obowiązujące w projekcie "Audio Repozytorium 008".

## 1. Paleta Kolorów

Używamy zmiennych CSS (`:root`) do zarządzania kolorystyką. Stylistyka jest ciemna, techniczna, z wysokim kontrastem akcentów.

| Zmienna | Wartość HEX | Opis |
| :--- | :--- | :--- |
| `--hud-primary` | `#E42737` | **Czerwień**. Główny akcent, aktywny element, "niebezpieczeństwo/nagrywanie". |
| `--hud-secondary` | `#00FFFF` | **Cyjan**. Wartości liczbowe, dane techniczne, tryb Loop One. |
| `--hud-text-mute` | `#64748b` | **Slate-500**. Tekst pasywny, etykiety, nieaktywne ikony. |
| `--hud-text-light`| `#cbd5e1` | **Slate-300**. Główny tekst, wartości. |
| `--hud-bg-block` | `rgba(18,18,18, 0.60)` | Tło bloków informacyjnych. |
| `--hud-bg-item` | `rgba(18,18,18, 0.40)` | Tło wierszy playlisty i sliderów. |
| `background` | `#050505` | Główne tło strony (bardzo głęboka czerń). |

## 2. Typografia

- **Font Family:** Monospace (`Consolas`, `Monaco`, `Courier New`).
- **Transform:** `uppercase` dla większości etykiet i nagłówków.
- **Tracking (Letter-spacing):** 
  - Nagłówki: szerokie (`0.2em`).
  - Wartości: średnie (`0.1em`).
- **Rozmiary:**
  - Nagłówki: `12px` - `14px`.
  - Wartości/Listy: `9px` - `10px`.

## 3. Komponenty UI

### Panel Główny
- **Pozycja:** Wyśrodkowany absolutnie (`top: 50%, left: 50%`).
- **Szerokość:** `320px` (Kompaktowy).
- **Tło:** Całkowicie przezroczyste (`transparent`) - brak efektu rozmycia czy tła w kontenerze głównym (zmiana z poprzednich wersji).
- **Obramowanie:** Brak głównego obramowania panelu. Struktura budowana przez wewnętrzne separatory.

### Przyciski (Controls)
- **Kształt podstawowy:** Kwadrat `40x40px` (dla przycisków Prev/Next/Loop).
- **Border Radius:** `0` (Ostre krawędzie).
- **Stan Hover:** 
  - Tło: `rgba(255, 255, 255, 0.05)`.
  - Kolor ikony: `#fff`.
  - Kształt podświetlenia: **Kwadrat** (nie koło!).
- **Przycisk Play (Main):**
  - Rozmiar: `46x46px` (Wyróżniony, ale mniejszy niż pierwotne 56px).
  - Obramowanie: `2px solid var(--hud-primary)`.
  - Kolor: `var(--hud-primary)`.

### Slidery (Range Inputs)
- **Track:** Wysokość `2px`, kolor `#333`.
- **Thumb (Uchwyt):** 
  - Kształt: **Kwadrat** `8x8px`.
  - Kolor: `#fff` (Hover: `--hud-primary`).

### Playlista
- **Wiersze:** Płaskie, `border-left` definiuje stan.
- **Stan Aktywny:** 
  - `border-left-color: var(--hud-primary)`.
  - Tło: `rgba(228, 39, 55, 0.1)`.
- **Stan Hover:** `border-left-color: var(--hud-secondary)`.
- **Animacja:** Equalizer (3 słupki) zamiast ikony dla aktywnego utworu.

## 4. Ikony i Grafika
- **Styl:** Minimalistyczne wektory SVG (`fill: currentColor`).
- **Wizualizacja:** WebGL (Three.js), estetyka wireframe/siatki, kolorystyka zgodna z `--hud-primary`.
