# Plan Projektu: Nano Audio Voice Wave

## 1. Status Projektu (Co już zrobiliśmy)
Obecnie posiadamy funkcjonalny prototyp odtwarzacza audio "Single File Component" z zaawansowaną wizualizacją.

### Zaimplementowane funkcjonalności:
- **Odtwarzacz Audio:** Podstawowa obsługa (Play, Pause, Next, Prev, Loop).
- **Interfejs UI:** Stylistyka "Nano/Cyberpunk", przezroczysty panel sterowania.
- **Wizualizacja 3D:** Generowanie fali w czasie rzeczywistym przy użyciu shaderów WebGL (Three.js) reagujących na analizę FFT dźwięku.
- **Obsługa plików:** Możliwość ładowania lokalnych plików audio przez użytkownika.
- **Playlista:** Dynamiczna lista utworów z animacją aktywnego utworu.

## 2. Wykorzystane Technologie
Projekt został zbudowany w duchu "Creative Coding" bez zbędnych zależności budowania, aby umożliwić łatwe uruchomienie w przeglądarce.

- **Core:** HTML5, CSS3 (zmienne CSS), Vanilla JavaScript (ES Modules).
- **Rendering 3D:** Three.js (ładowane dynamicznie via Import Map/CDN).
- **Audio:** Web Audio API (AudioContext, AnalyserNode).
- **Shadery:** GLSL (Vertex & Fragment Shaders dla efektu fali).

## 3. Plany Rozwoju (Roadmapa)
Dalsze prace mają na celu rozbudowę funkcjonalności i stabilizację kodu.

- **Migracja Technologiczna:** W przypadku rozrostu projektu, rozważenie przeniesienia kodu do ekosystemu **Vite + React** dla lepszego zarządzania stanem.
- **Rozbudowa UI:** Dodanie paska postępu z podglądem "waveform" całego utworu (nie tylko realtime).
- **Efekty Audio:** Dodanie korektora graficznego (Equalizer) dostępnego dla użytkownika.
- **Wizualizacje:** Dodanie alternatywnych trybów wizualizacji (np. cząsteczki, widmo kołowe).
