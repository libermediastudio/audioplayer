# Architektura Projektu: Audio Repozytorium 008

## 1. Stos Technologiczny

Projekt łączy nowoczesne środowisko deweloperskie z podejściem "Creative Coding" (Single File Component).

### Core & Build
- **Vite:** Narzędzie budujące (Build tool) zapewniające szybki HMR (Hot Module Replacement).
- **React 18:** Biblioteka UI (punkt wejścia aplikacji zdefiniowany w `index.tsx`).
- **TypeScript:** Język używany w warstwie aplikacji Reactowej dla bezpieczeństwa typów.

### Warstwa Wizualna i Audio (Creative Coding)
- **Vanilla JavaScript (ESM):** Logika odtwarzacza i wizualizacji jest obecnie zamknięta w `index.html` w celu zachowania przenośności i wydajności (brak narzutu frameworka w pętli renderowania).
- **Three.js (r160):** Biblioteka 3D ładowana dynamicznie przez Import Map. Używana do renderowania sceny WebGL.
- **Web Audio API:** Natywne API przeglądarki do analizy dźwięku (FFT - Fast Fourier Transform), obsługi węzłów audio i synchronizacji z grafiką.
- **GLSL (OpenGL Shading Language):** Niestandardowe shadery (Vertex & Fragment) odpowiedzialne za deformację siatki i kolorowanie fali w oparciu o dane audio.

## 2. Struktura Plików

```text
/
├── index.html          # Główny plik z logiką UI odtwarzacza, CSS i kodem Three.js
├── index.tsx           # Punkt wejścia aplikacji React (Wrapper środowiska)
├── metadata.json       # Metadane projektu i uprawnienia
└── docs/               # Dokumentacja projektu
    ├── architecture.md # Opis architektury (ten plik)
    ├── project-plan.md # Roadmapa i status
    └── style-guide.md  # Zasady wizualne
```

## 3. Potok Danych (Data Flow)

1.  **Input:** Plik audio (lokalny `Blob` lub zdalny URL) ładowany jest do elementu `<audio>`.
2.  **Analiza:** `AudioContext` tworzy `MediaElementSource`, który jest podłączony do `AnalyserNode`.
3.  **Przetwarzanie:** W każdej klatce animacji (`requestAnimationFrame`) pobierana jest tablica bajtów (`getByteFrequencyData`).
4.  **Transfer do GPU:** Dane audio są zapisywane do `THREE.DataTexture`.
5.  **Renderowanie:** 
    - **Vertex Shader:** Odczytuje teksturę i deformuje siatkę (Mesh) w osi Y.
    - **Fragment Shader:** Koloruje siatkę bazując na amplitudzie dźwięku i współrzędnych UV.

## 4. Decyzje Projektowe
- **Hybrid Approach:** Używamy Vite/React jako kontenera, ale rdzeń wizualizacji (Three.js) jest zaimplementowany imperatywnie w `script module`. Ułatwia to eksperymentowanie z shaderami bez konieczności mapowania wszystkiego na `react-three-fiber` w fazie prototypowania.
- **No Bundler for 3D:** Three.js jest importowane z CDN w `index.html` (Import Map), co pozwala na edycję "on-the-fly" bez konieczności przebudowywania całego bundle'a JS przy zmianach w logice 3D.
