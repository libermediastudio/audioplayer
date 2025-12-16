import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Constants & Config ---
const FFT_SIZE = 2048;
const SMOOTHING_TIME_CONSTANT = 0.8;
const BASE_URL = '/wp-content/audio/';

const LOOP_OFF = 0;
const LOOP_ALL = 1;
const LOOP_ONE = 2;

// --- Shaders ---
const vertexShader = `
    uniform float uTime;
    uniform float uSensitivity;
    uniform sampler2D uAudioTexture;
    uniform float uOffset; 
    varying float vAudioValue;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        float centeredX = abs(uv.x - 0.5) * 2.0; 
        float mask = 1.0 - centeredX; 
        mask = pow(mask, 1.5); 
        float sampleUV = centeredX * 0.5;
        float audioValue = texture2D(uAudioTexture, vec2(sampleUV, 0.0)).r;
        float strength = audioValue * uSensitivity;
        
        float highFreqNoise = sin(uv.x * 60.0 + uTime * 15.0) * cos(uv.x * 120.0);
        float sineWave = sin(uv.x * 10.0 + uTime * 2.0 + uOffset) * 0.1;
        float displacement = strength * (2.0 + highFreqNoise * 1.5);
        
        vec3 newPosition = position;
        newPosition.y += (displacement + sineWave) * mask;
        newPosition.z += sin(uv.x * 5.0 + uTime) * 0.5;
        vAudioValue = strength;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
`;

const fragmentShader = `
    uniform vec3 uColor;
    varying float vAudioValue;
    varying vec2 vUv;
    void main() {
        float alphaY = 1.0 - abs(vUv.y - 0.5) * 2.0;
        alphaY = pow(alphaY, 3.0);
        float alphaX = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 4.0);
        float totalAlpha = alphaY * alphaX;
        float barFreq = 100.0;
        float bars = sin(vUv.x * barFreq);
        float barPattern = smoothstep(0.0, 0.2, bars);
        vec3 coreColor = uColor;
        vec3 hotColor = vec3(1.0, 1.0, 1.0); 
        vec3 finalColor = mix(coreColor, hotColor, vAudioValue * 0.8);
        float finalAlpha = totalAlpha * barPattern * (0.4 + vAudioValue);
        if (finalAlpha < 0.05) discard;
        gl_FragColor = vec4(finalColor, finalAlpha);
    }
`;

// --- Interfaces ---
interface Track {
    name: string;
    file: string;
    duration: string;
    isLocal: boolean;
}

const AudioVisualizer: React.FC = () => {
    // --- State ---
    const [playlist, setPlaylist] = useState<Track[]>([
        { name: "001.mp3", file: "001.mp3", duration: "3:45", isLocal: false },
        { name: "002.mp3", file: "002.mp3", duration: "4:12", isLocal: false },
        { name: "003.mp3", file: "003.mp3", duration: "3:30", isLocal: false },
        { name: "004.mp3", file: "004.mp3", duration: "4:05", isLocal: false },
        { name: "005.mp3", file: "005.mp3", duration: "3:55", isLocal: false },
        { name: "006.mp3", file: "006.mp3", duration: "4:20", isLocal: false },
        { name: "007.mp3", file: "007.mp3", duration: "3:15", isLocal: false },
        { name: "008.mp3", file: "008.mp3", duration: "3:50", isLocal: false },
        { name: "009.mp3", file: "009.mp3", duration: "3:33", isLocal: false }
    ]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [loopMode, setLoopMode] = useState<number>(0);
    const [currentTimeDisplay, setCurrentTimeDisplay] = useState("0:00");
    const [volumeDisplay, setVolumeDisplay] = useState("100%");
    const [sensitivityDisplay, setSensitivityDisplay] = useState("2.5");

    // --- Refs ---
    const mountRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Audio / 3D Refs to persist across renders without causing re-renders
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const audioTextureRef = useRef<THREE.DataTexture | null>(null);
    const uniformsRef = useRef<any[]>([]); // Array of uniform objects
    const waveGroupRef = useRef<THREE.Group | null>(null);
    const reqAnimIdRef = useRef<number | null>(null);

    // --- Helpers ---
    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // --- Initialization Effect ---
    useEffect(() => {
        if (!mountRef.current) return;

        // Scene Setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050505, 0.02);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 14);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.minAzimuthAngle = -Math.PI / 4;
        controls.maxAzimuthAngle = Math.PI / 4;
        controls.minPolarAngle = Math.PI / 2 - 0.5;
        controls.maxPolarAngle = Math.PI / 2 + 0.5;

        // Audio Texture Init
        const width = FFT_SIZE / 2;
        const height = 1;
        const data = new Uint8Array(width);
        const audioTexture = new THREE.DataTexture(data, width, height, THREE.RedFormat);
        audioTexture.magFilter = THREE.LinearFilter;
        audioTexture.needsUpdate = true;
        audioTextureRef.current = audioTexture;

        // Wave Creation
        const waveGroup = new THREE.Group();
        scene.add(waveGroup);
        waveGroupRef.current = waveGroup;

        const layers = 3;
        const geometry = new THREE.PlaneGeometry(25, 6, 256, 1);
        
        // Reset uniforms
        uniformsRef.current = [];

        for (let i = 0; i < layers; i++) {
            const u = {
                uTime: { value: 0 },
                uSensitivity: { value: 2.5 },
                uAudioTexture: { value: audioTexture },
                uColor: { value: new THREE.Color(0xE42737) },
                uOffset: { value: i * 2.0 } 
            };
            uniformsRef.current.push(u);

            const material = new THREE.ShaderMaterial({
                uniforms: u,
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.z = i * 0.5;
            mesh.scale.set(1.0 - i * 0.05, 1.0, 1.0);
            waveGroup.add(mesh);
        }

        // Animation Loop
        const animate = () => {
            reqAnimIdRef.current = requestAnimationFrame(animate);
            const time = performance.now() * 0.001;
            
            // Update Uniforms
            uniformsRef.current.forEach(u => u.uTime.value = time);

            if (waveGroupRef.current) {
                waveGroupRef.current.rotation.y = Math.sin(time * 0.3) * 0.15;
            }

            // Update Audio Data
            if (analyserRef.current && dataArrayRef.current && audioTextureRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                audioTextureRef.current.image.data.set(dataArrayRef.current);
                audioTextureRef.current.needsUpdate = true;
            } else if (audioTextureRef.current) {
                // decay
                const data = audioTextureRef.current.image.data;
                for(let i=0; i<data.length; i++) data[i] = Math.max(0, data[i] * 0.95 - 1);
                audioTextureRef.current.needsUpdate = true;
            }

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        // Resize Handler
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (reqAnimIdRef.current) cancelAnimationFrame(reqAnimIdRef.current);
            if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
            renderer.dispose();
            if (audioCtxRef.current) audioCtxRef.current.close();
        };
    }, []); // Run once on mount

    // --- Audio Logic ---

    const initAudioContext = () => {
        if (!audioRef.current) return;

        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = FFT_SIZE;
            analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            source.connect(ctx.destination);

            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
            dataArrayRef.current = dataArray;
            sourceNodeRef.current = source;
        } else if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const playTrack = (index: number) => {
        if (index < 0 || index >= playlist.length || !audioRef.current) return;

        initAudioContext();
        setCurrentTrackIndex(index);
        
        const track = playlist[index];
        let src = track.file;
        if (!track.isLocal && !src.startsWith('http') && !src.startsWith('//')) {
            src = BASE_URL + src;
        }

        audioRef.current.src = src;
        audioRef.current.load();
        
        // Reset Progress UI directly
        if (progressBarRef.current) progressBarRef.current.value = "0";
        setCurrentTimeDisplay("0:00");

        audioRef.current.play().then(() => {
            setIsPlaying(true);
        }).catch(err => {
            console.error("Autoplay prevented", err);
            setIsPlaying(false);
        });
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        initAudioContext();

        if (audioRef.current.paused) {
            if (currentTrackIndex === -1 && playlist.length > 0) {
                playTrack(0);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const playNext = (auto = false) => {
        if (currentTrackIndex + 1 < playlist.length) {
            playTrack(currentTrackIndex + 1);
        } else {
            if (loopMode === LOOP_ALL && auto) {
                playTrack(0);
            } else if (loopMode === LOOP_OFF && auto) {
                setIsPlaying(false);
            } else if (!auto) {
                playTrack(0);
            }
        }
    };

    const playPrev = () => {
        if (currentTrackIndex > 0) {
            playTrack(currentTrackIndex - 1);
        } else {
            playTrack(0);
        }
    };

    // --- Event Handlers ---

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const curr = audioRef.current.currentTime;
            const dur = audioRef.current.duration;
            if (!isNaN(dur) && progressBarRef.current) {
                const pct = (curr / dur) * 100;
                progressBarRef.current.value = pct.toString();
                setCurrentTimeDisplay(formatTime(curr));
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const pct = parseFloat(e.target.value);
            const dur = audioRef.current.duration;
            if (!isNaN(dur)) {
                audioRef.current.currentTime = (pct / 100) * dur;
            }
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const vol = parseFloat(e.target.value);
            audioRef.current.volume = vol;
            setVolumeDisplay(Math.round(vol * 100) + '%');
        }
    };

    const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        uniformsRef.current.forEach(u => u.uSensitivity.value = val);
        setSensitivityDisplay(val.toFixed(1));
    };

    const handleLoopToggle = () => {
        setLoopMode(prev => (prev + 1) % 3);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            const trackObj: Track = {
                name: file.name,
                file: objectUrl,
                duration: '--:--',
                isLocal: true
            };
            setPlaylist(prev => [...prev, trackObj]);
        }
    };

    const handleAudioEnded = () => {
        if (loopMode === LOOP_ONE && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        } else {
            playNext(true);
        }
    };

    // --- Render ---

    return (
        <>
            <div id="ui-panel">
                {/* Header */}
                <div className="panel-header">
                    <div className="header-title">
                        <svg className="header-icon" viewBox="0 0 24 24">
                            <path d="M2 9h2v6H2V9zm4-4h2v14H6V5zm4-2h2v18h-2V3zm4 2h2v14h-2V5zm4 4h2v6h-2V9z"/>
                        </svg>
                        AUDIO CORTEX
                    </div>
                    <div style={{ width: '4px', height: '4px', background: 'var(--hud-primary)', borderRadius: '50%' }}></div>
                </div>

                {/* Now Playing */}
                <div className="info-block">
                    <div className="info-title">
                        {currentTrackIndex >= 0 ? playlist[currentTrackIndex].name : "INITIALIZING..."}
                    </div>
                    <span className="info-subtitle">AUDIO SOURCE</span>
                </div>

                {/* Controls */}
                <div className="player-section">
                    <div className="transport-row">
                        <button 
                            className="control-btn play-btn" 
                            title="Play/Pause"
                            onClick={togglePlay}
                        >
                            {isPlaying ? (
                                <svg style={{ width: '24px', height: '24px', fill: 'currentColor' }} viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                                <svg style={{ width: '24px', height: '24px', fill: 'currentColor' }} viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                        </button>
                        
                        <button className="control-btn" title="Previous" onClick={playPrev}>
                            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                        </button>
                        
                        <button className="control-btn" title="Next" onClick={() => playNext(false)}>
                            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                        </button>

                        <button 
                            className={`control-btn ${loopMode === LOOP_ALL ? 'active' : ''} ${loopMode === LOOP_ONE ? 'active-one' : ''}`}
                            title="Loop Mode" 
                            onClick={handleLoopToggle}
                        >
                            {loopMode === LOOP_ONE ? (
                                <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', fill: 'currentColor' }}><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/><text x="12" y="15.5" fontFamily="Arial" fontWeight="bold" fontSize="8" textAnchor="middle" fill="currentColor">1</text></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', fill: 'currentColor' }}><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                            )}
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="param-row">
                        <div className="param-label">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            TIME
                        </div>
                        <div className="param-control">
                            <input 
                                ref={progressBarRef}
                                type="range" 
                                min="0" 
                                max="100" 
                                defaultValue="0" 
                                step="0.1"
                                onChange={handleSeek}
                            />
                        </div>
                        <div className="param-value">{currentTimeDisplay}</div>
                    </div>

                    {/* Volume */}
                    <div className="param-row">
                        <div className="param-label">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                            VOL
                        </div>
                        <div className="param-control">
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01" 
                                defaultValue="1"
                                onChange={handleVolumeChange}
                            />
                        </div>
                        <div className="param-value">{volumeDisplay}</div>
                    </div>
                </div>

                {/* Playlist */}
                <div className="playlist-container">
                    <div className="playlist-scroll">
                        {playlist.map((track, index) => (
                            <div 
                                key={index} 
                                className={`playlist-row ${index === currentTrackIndex ? 'active' : ''}`}
                                onClick={() => playTrack(index)}
                            >
                                <div className="row-left">
                                    {index === currentTrackIndex ? (
                                        <div className="playing-anim">
                                            <span className="bar"></span>
                                            <span className="bar"></span>
                                            <span className="bar"></span>
                                        </div>
                                    ) : (
                                        <svg className="row-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                                    )}
                                    <div className="row-title">{track.name}</div>
                                </div>
                                <div className="row-right">{track.duration}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Extras */}
                <div className="extras-group">
                    <div className="param-row" style={{ borderLeft: '2px solid var(--border-inactive)' }}>
                        <div className="param-label">SENSITIVITY</div>
                        <div className="param-control">
                            <input 
                                type="range" 
                                min="0" 
                                max="5.0" 
                                step="0.1" 
                                defaultValue="2.5"
                                onChange={handleSensitivityChange}
                            />
                        </div>
                        <div className="param-value">{sensitivityDisplay}</div>
                    </div>
                    
                    <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                        [ + LOAD EXTERNAL DATA ]
                    </button>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="audio/*" 
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                </div>

                {/* Footer */}
                <div className="footer-deco">
                    <div className="footer-bar"></div>
                </div>
            </div>

            {/* Audio & Canvas */}
            <audio 
                ref={audioRef} 
                crossOrigin="anonymous" 
                style={{ display: 'none' }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleAudioEnded}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
            ></audio>
            <div id="canvas-container" ref={mountRef}></div>
        </>
    );
};

export default AudioVisualizer;