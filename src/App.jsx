import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from './i18n/LanguageContext.jsx';
import AstrometricsMap3D from './components/map3d/AstrometricsMap3D.jsx';
import SystemInspector from './components/hud/SystemInspector.jsx';
import RouteComputerPanel from './components/hud/RouteComputerPanel.jsx';
import TimelineAndMinkowskiStudio from './components/timeline/TimelineAndMinkowskiStudio.jsx';
import DataSourcesModal from './components/hud/DataSourcesModal.jsx';
import SciFiVoyagesModal from './components/hud/SciFiVoyagesModal.jsx';
import RadioBubblePanel from './components/hud/RadioBubblePanel.jsx';
import RelativisticBridgeView from './components/hud/RelativisticBridgeView.jsx';
import Footer from './components/hud/Footer.jsx';
import { planMultiStopVoyage } from './engine/voyagePlanner.js';
import { computeFlightProfile } from './engine/relativity.js';
import { distanceBetweenSystems } from './engine/stellarMotion.js';
import { loadSciFiDataset } from './services/scifiService.js';
import { formatNum, SPECTRAL_COLORS } from './utils/format.js';
import {
  Compass,
  Search,
  Filter,
  Clock,
  Database,
  Globe,
  RotateCcw,
  Orbit,
  Tag,
  Palette,
  SlidersHorizontal,
  PanelLeft,
  PanelRight,
  ChevronDown,
  BookMarked,
  MoveUpRight,
  Radio,
  Eye,
  X,
} from 'lucide-react';

const SHIP_COLORS = [
  '#00f0ff', '#00ff88', '#f59e0b', '#c084fc', '#fb7185', '#38bdf8',
  '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee', '#f97316',
];
const SPECTRAL_CLASS_LIST = ['O', 'B', 'A', 'F', 'G', 'K', 'M', 'L', 'T', 'Y', 'D'];

const DEFAULT_SHIPS = [
  {
    id: 'ship-1',
    name: 'ISV Venturer (1g Torch)',
    color: '#00f0ff',
    departureYear: 2150.0,
    crewStartAge: 32.0,
    driveConfig: {
      mode: 'flip',
      accelG: 1.0,
      cruiseC: 0.95,
      driveType: 'non-reactive',
      exhaustVelC: 0.33,
    },
    waypoints: [
      { systemId: 'sol', stayYears: 0 },
      { systemId: 'hip-71683', stayYears: 1.5 }, // Alpha Centauri / Proxima
      { systemId: 'hip-8102', stayYears: 2.0 },  // Tau Ceti
      { systemId: 'hip-16537', stayYears: 0 },   // Epsilon Eridani
    ],
  },
  {
    id: 'ship-2',
    name: 'CSV Envoy (0.3g / 0.5c Cruise)',
    color: '#00ff88',
    departureYear: 2152.0,
    crewStartAge: 28.0,
    driveConfig: {
      mode: 'accel-cruise',
      accelG: 0.3,
      cruiseC: 0.5,
      driveType: 'reaction',
      exhaustVelC: 0.33,
    },
    waypoints: [
      { systemId: 'sol', stayYears: 0 },
      { systemId: 'hip-57548', stayYears: 1.0 }, // Ross 128
      { systemId: 'nea-teegarden-s-star', stayYears: 0 }, // Teegarden's Star
    ],
  },
];

const DEFAULT_STORY_EVENTS = [
  {
    id: 'ev-1',
    title: 'Earth Beacon Telemetry Broadcast #1',
    systemId: 'sol',
    year: 2153.5,
  },
  {
    id: 'ev-2',
    title: 'Proxima b First Landing Report',
    systemId: 'hip-71683',
    year: 2156.2,
  },
];

export default function App() {
  const { lang, setLang, t } = useLanguage();
  const [catalog, setCatalog] = useState(null);
  const [scifiData, setScifiData] = useState({ meta: {}, bySystemId: {} });
  const [voyagesLibrary, setVoyagesLibrary] = useState([]);
  const [activeVoyagePreset, setActiveVoyagePreset] = useState(null);
  const [mergedVoyagePresetIds, setMergedVoyagePresetIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & 3D Map Viewport state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterMode, setFilterMode] = useState('core'); // 'core' | 'deep' | 'visible' | 'exoplanets' | 'hz' | 'conservative-hz' | 'jwst' | 'brown-dwarfs' | 'scifi' | 'solar-analogs'
  const [selectedSpectralClasses, setSelectedSpectralClasses] = useState([]);
  const [selectedConstellation, setSelectedConstellation] = useState('');
  const [maxCrewReachYears, setMaxCrewReachYears] = useState(0); // 0 = No limit
  const [scifiOnly, setScifiOnly] = useState(false);
  const [selectedSciFiUniverse, setSelectedSciFiUniverse] = useState('');
  const [multiStarOnly, setMultiStarOnly] = useState(false);
  const [terrestrialHzOnly, setTerrestrialHzOnly] = useState(false);
  const [jwstOnly, setJwstOnly] = useState(false);
  const [highEsiOnly, setHighEsiOnly] = useState(false);
  const [flareStarOnly, setFlareStarOnly] = useState(false);
  const [debrisDiskOnly, setDebrisDiskOnly] = useState(false);
  const [radiusLy, setRadiusLy] = useState(105);
  const [epochOffsetYears, setEpochOffsetYears] = useState(0); // -100,000 to +100,000 yr
  const [labelMode, setLabelMode] = useState('auto'); // 'auto' | 'all' | 'hz' | 'none'
  const [colorMode, setColorMode] = useState('spectral'); // 'spectral' | 'exoplanet'
  const [velocityVectorMode, setVelocityVectorMode] = useState('off'); // 'off' | 'full3d' | 'all'
  const [velocityHorizonKyr, setVelocityHorizonKyr] = useState(20); // 10 | 20 | 50 kyr projection
  const [radioBubbleEnabled, setRadioBubbleEnabled] = useState(false);
  const [radioSelectedYear, setRadioSelectedYear] = useState(1976);
  const [radioShowMetiBeams, setRadioShowMetiBeams] = useState(true);
  const [isBridgeViewOpen, setIsBridgeViewOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filtersRef = useRef(null);

  // Optional sidebars & bottom studio (uncluttered default: Explore 3D + Inspector; Route & Timeline toggleable)
  const [isLeftDockOpen, setIsLeftDockOpen] = useState(false);
  const [isRightDockOpen, setIsRightDockOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);
  const [isVoyagesModalOpen, setIsVoyagesModalOpen] = useState(false);

  const [selectedSystemId, setSelectedSystemId] = useState('sol');
  const [focusRequest, setFocusRequest] = useState(null);

  // Ships, Routes & Timeline Studio state
  const [ships, setShips] = useState(DEFAULT_SHIPS);
  const [activeShipId, setActiveShipId] = useState('ship-1');
  const [storyEvents, setStoryEvents] = useState(DEFAULT_STORY_EVENTS);
  const [masterClockYear, setMasterClockYear] = useState(2154.0);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [lightConeConfig, setLightConeConfig] = useState({
    enabled: false,
    originPos: [0, 0, 0],
    emitYear: 2153.5,
    radiusLy: 4.5,
    color: '#00f0ff',
  });

  // Close Filters popover when clicking outside
  useEffect(() => {
    if (!isFiltersOpen) return;
    const onDocDown = (e) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) {
        setIsFiltersOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [isFiltersOpen]);

  // Load 3D stellar/exoplanet catalogue, Sci-Fi literature index, and Sci-Fi voyages library in parallel
  useEffect(() => {
    const base = import.meta.env.BASE_URL || './';
    const prefix = base.replace(/\/$/, '');
    Promise.all([
      fetch(`${prefix}/data/astrometrics_catalog.json`).then((res) => res.json()),
      loadSciFiDataset(),
      fetch(`${prefix}/data/scifi_voyages.json`)
        .then((res) => (res.ok ? res.json() : { voyages: [] }))
        .catch(() => ({ voyages: [] })),
    ])
      .then(([catData, sfData, voyData]) => {
        setCatalog(catData);
        if (catData?.meta?.maxRadiusLy) {
          setRadiusLy(catData.meta.maxRadiusLy);
        }
        setScifiData(sfData || { meta: {}, bySystemId: {} });
        setVoyagesLibrary(voyData?.voyages || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load datasets:', err);
        setLoading(false);
      });
  }, []);

  const systemsById = useMemo(() => {
    const map = new Map();
    if (catalog?.systems) {
      for (const s of catalog.systems) map.set(s.id, s);
    }
    return map;
  }, [catalog]);

  // Sorted list of constellations in the catalogue for the constellation filter dropdown
  const availableConstellations = useMemo(() => {
    if (!catalog?.systems) return [];
    const set = new Set();
    for (const s of catalog.systems) {
      if (s.constellation) set.add(s.constellation);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [catalog]);

  // Compute voyages for all ships
  const shipsWithVoyages = useMemo(() => {
    if (systemsById.size === 0) return [];
    return ships.map((sh) => ({
      ...sh,
      isActive: sh.id === activeShipId,
      voyage: planMultiStopVoyage({
        waypoints: sh.waypoints,
        systemsById,
        departureYear: sh.departureYear,
        epochOffsetYears,
        crewStartAge: sh.crewStartAge,
        driveConfig: sh.driveConfig,
      }),
    }));
  }, [ships, activeShipId, systemsById, epochOffsetYears]);

  const activeShipWithVoyage = useMemo(
    () => shipsWithVoyages.find((s) => s.id === activeShipId) || shipsWithVoyages[0],
    [shipsWithVoyages, activeShipId]
  );

  const radioBubbleConfig = useMemo(
    () => ({
      enabled: radioBubbleEnabled,
      selectedYear: radioSelectedYear,
      showMetiBeams: radioShowMetiBeams,
    }),
    [radioBubbleEnabled, radioSelectedYear, radioShowMetiBeams]
  );

  const catalogDefaultRadius = catalog?.meta?.maxRadiusLy || 105;
  const catalogMaxSliderRadius = Math.max(
    catalog?.meta?.extendedHzRadiusLy || 135,
    catalogDefaultRadius
  );

  // Compute max distance (ly) reachable from Sol within `maxCrewReachYears` using active ship's drive
  const maxReachDistanceLy = useMemo(() => {
    if (!maxCrewReachYears || maxCrewReachYears <= 0 || !activeShipWithVoyage) return Infinity;
    const dc = activeShipWithVoyage.driveConfig;
    // Monotonic binary search on distance d so properTime(d) <= maxCrewReachYears
    let lo = 0;
    let hi = Math.max(200, catalogMaxSliderRadius * 1.5);
    for (let i = 0; i < 32; i++) {
      const mid = 0.5 * (lo + hi);
      const prof = computeFlightProfile({
        distance: mid,
        mode: dc.mode,
        accelG: dc.accelG,
        cruiseC: dc.cruiseC,
      });
      if (prof.properTime <= maxCrewReachYears) lo = mid;
      else hi = mid;
    }
    return lo;
  }, [maxCrewReachYears, activeShipWithVoyage, catalogMaxSliderRadius]);

  const scifiBySystemId = scifiData?.bySystemId || {};

  // Available Sci-Fi universes/franchises sorted by star count (from scifi_literature.json meta)
  const availableSciFiUniverses = useMemo(() => {
    if (Array.isArray(scifiData?.meta?.universes) && scifiData.meta.universes.length > 0) {
      return scifiData.meta.universes;
    }
    const counts = new Map();
    for (const e of Object.values(scifiBySystemId)) {
      for (const u of e.universes || []) {
        counts.set(u, (counts.get(u) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [scifiData, scifiBySystemId]);

  // Filter systems for 3D display (always keep Sol, selected system, and active route waypoints visible)
  const routeSystemIds = useMemo(() => {
    const set = new Set(['sol', selectedSystemId]);
    for (const sh of ships) {
      for (const wp of sh.waypoints) set.add(wp.systemId);
    }
    return set;
  }, [ships, selectedSystemId]);

  const solSystem = systemsById.get('sol');

  const filteredSystems = useMemo(() => {
    if (!catalog?.systems) return [];
    const hasSpectralFilter = selectedSpectralClasses.length > 0;
    const specSet = new Set(selectedSpectralClasses);
    const isFullSweepFilter =
      filterMode === 'scifi' ||
      filterMode === 'brown-dwarfs' ||
      filterMode === 'jwst' ||
      scifiOnly ||
      Boolean(selectedSciFiUniverse) ||
      jwstOnly ||
      highEsiOnly ||
      flareStarOnly ||
      debrisDiskOnly ||
      selectedSpectralClasses.some((c) => c === 'L' || c === 'T' || c === 'Y');

    return catalog.systems.filter((s) => {
      if (routeSystemIds.has(s.id)) return true;
      const distAtEpoch = solSystem ? distanceBetweenSystems(solSystem, s, epochOffsetYears) : s.distLy;
      if (distAtEpoch > radiusLy) return false;
      if (distAtEpoch > maxReachDistanceLy) return false;
      // When filtering specifically for Sci-Fi, Brown Dwarfs, JWST, Flare, Debris, or High-ESI, sweep ALL systems
      if (filterMode === 'core' && !isFullSweepFilter && s.tier !== 1) return false;
      if (filterMode === 'visible' && !s.isVisibleFromEarth) return false;
      if (filterMode === 'exoplanets' && !s.hasPlanets) return false;
      if (filterMode === 'hz' && !s.hasOptimisticHZ) return false;
      if (filterMode === 'conservative-hz' && !s.hasConservativeHZ) return false;
      if (filterMode === 'jwst' && !s.hasJwstSpectra) return false;
      if (filterMode === 'brown-dwarfs' && !s.isBrownDwarf) return false;
      const sfEntry = scifiBySystemId[s.id];
      if (filterMode === 'scifi' && !sfEntry) return false;
      if (
        filterMode === 'solar-analogs' &&
        !s.stars.some((st) => (st.cls === 'G' || st.cls === 'K') && st.lumClass === 'V')
      ) {
        return false;
      }
      if (hasSpectralFilter && !s.stars.some((st) => specSet.has(st.cls))) return false;
      if (selectedConstellation && s.constellation !== selectedConstellation) return false;
      if (scifiOnly && !sfEntry) return false;
      if (selectedSciFiUniverse && !sfEntry?.universes?.includes(selectedSciFiUniverse)) return false;
      if (multiStarOnly && s.stars.length < 2) return false;
      if (terrestrialHzOnly && !s.hasTerrestrialHZ) return false;
      if (jwstOnly && !s.hasJwstSpectra) return false;
      if (highEsiOnly && !(s.maxEsi !== null && s.maxEsi >= 0.75)) return false;
      if (flareStarOnly && !s.isFlareStar) return false;
      if (debrisDiskOnly && !s.hasDebrisDisk) return false;
      return true;
    });
  }, [
    catalog,
    solSystem,
    epochOffsetYears,
    radiusLy,
    maxReachDistanceLy,
    filterMode,
    selectedSpectralClasses,
    selectedConstellation,
    scifiOnly,
    selectedSciFiUniverse,
    multiStarOnly,
    terrestrialHzOnly,
    jwstOnly,
    highEsiOnly,
    flareStarOnly,
    debrisDiskOnly,
    routeSystemIds,
    scifiBySystemId,
  ]);

  const activeFilterCount =
    (filterMode !== 'core' ? 1 : 0) +
    (selectedSpectralClasses.length > 0 ? 1 : 0) +
    (selectedConstellation ? 1 : 0) +
    (maxCrewReachYears > 0 ? 1 : 0) +
    (radiusLy !== catalogDefaultRadius ? 1 : 0) +
    (epochOffsetYears !== 0 ? 1 : 0) +
    (scifiOnly ? 1 : 0) +
    (selectedSciFiUniverse ? 1 : 0) +
    (multiStarOnly ? 1 : 0) +
    (terrestrialHzOnly ? 1 : 0) +
    (jwstOnly ? 1 : 0) +
    (highEsiOnly ? 1 : 0) +
    (flareStarOnly ? 1 : 0) +
    (debrisDiskOnly ? 1 : 0);

  const toggleSpectralClass = (cls) => {
    setSelectedSpectralClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const resetAllFilters = () => {
    setFilterMode('core');
    setSelectedSpectralClasses([]);
    setSelectedConstellation('');
    setMaxCrewReachYears(0);
    setScifiOnly(false);
    setSelectedSciFiUniverse('');
    setMultiStarOnly(false);
    setTerrestrialHzOnly(false);
    setJwstOnly(false);
    setHighEsiOnly(false);
    setFlareStarOnly(false);
    setDebrisDiskOnly(false);
    setRadiusLy(catalogDefaultRadius);
    setEpochOffsetYears(0);
  };

  // Workspace Mode Presets (1-click decluttered layouts)
  const activeWorkspacePreset =
    !isLeftDockOpen && !isTimelineOpen && isRightDockOpen
      ? 'explore'
      : isLeftDockOpen && !isTimelineOpen
        ? 'route'
        : isTimelineOpen
          ? 'studio'
          : 'custom';

  const applyWorkspacePreset = (preset) => {
    if (preset === 'explore') {
      setIsLeftDockOpen(false);
      setIsRightDockOpen(true);
      setIsTimelineOpen(false);
    } else if (preset === 'route') {
      setIsLeftDockOpen(true);
      setIsRightDockOpen(true);
      setIsTimelineOpen(false);
    } else if (preset === 'studio') {
      setIsLeftDockOpen(true);
      setIsRightDockOpen(false);
      setIsTimelineOpen(true);
    }
  };

  // Search autocomplete results (matches star name, aliases, catalogue ID, planet name, Sci-Fi universe, author, title, or world!)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !catalog?.systems) return [];
    const q = searchQuery.trim().toLowerCase();
    return catalog.systems
      .filter((s) => {
        if (s.name.toLowerCase().includes(q)) return true;
        if (s.ids?.neaHost && s.ids.neaHost.toLowerCase().includes(q)) return true;
        if (s.ids?.hip && `hip ${s.ids.hip}`.includes(q)) return true;
        if (s.ids?.hd && `hd ${s.ids.hd}`.includes(q)) return true;
        if (s.ids?.gl && s.ids.gl.toLowerCase().includes(q)) return true;
        if (s.planets?.some((pl) => pl.name.toLowerCase().includes(q))) return true;
        const sf = scifiBySystemId[s.id];
        if (sf?.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
        if (sf?.universes?.some((u) => u.toLowerCase().includes(q))) return true;
        if (
          sf?.notableWorks?.some(
            (w) =>
              w.title.toLowerCase().includes(q) ||
              (w.author && w.author.toLowerCase().includes(q)) ||
              (w.world && w.world.toLowerCase().includes(q))
          )
        ) {
          return true;
        }
        return false;
      })
      .slice(0, 16);
  }, [searchQuery, catalog, scifiBySystemId]);

  // Timeline playback animation loop across all active ships' global window
  useEffect(() => {
    if (!isPlayingTimeline) return;
    let rafId = 0;
    let last = performance.now();
    const minY =
      shipsWithVoyages.length > 0
        ? Math.min(...shipsWithVoyages.map((s) => s.voyage.departureYear))
        : 2150;
    const maxY =
      shipsWithVoyages.length > 0
        ? Math.max(...shipsWithVoyages.map((s) => s.voyage.arrivalYear + 2))
        : 2175;

    // Adaptive playback rate: completes any voyage span smoothly in ~18 seconds
    const span = Math.max(10, maxY - minY);
    const yearsPerSec = Math.max(1.2, span / 18);

    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setMasterClockYear((prev) => {
        const next = prev + dt * yearsPerSec;
        return next > maxY ? minY : next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlayingTimeline, shipsWithVoyages]);

  const handleSelectSystem = useCallback((sysId, focusCamera = false) => {
    if (!sysId) return;
    setSelectedSystemId(sysId);
    setIsRightDockOpen(true);
    if (focusCamera) {
      setFocusRequest({ systemId: sysId, ts: Date.now() });
    }
  }, []);

  const handleUpdateActiveShip = useCallback(
    (patch) => {
      setShips((prev) => prev.map((sh) => (sh.id === activeShipId ? { ...sh, ...patch } : sh)));
    },
    [activeShipId]
  );

  const handleAppendWaypoint = useCallback(
    (sysId) => {
      if (!sysId) return;
      setSelectedSystemId(sysId);
      setIsLeftDockOpen(true);
      setShips((prev) => {
        if (prev.length === 0) {
          const newId = `ship-${Date.now()}`;
          const fresh = {
            id: newId,
            name: 'ISV Vessel 1',
            color: SHIP_COLORS[0],
            departureYear: 2150.0,
            crewStartAge: 30.0,
            driveConfig: {
              mode: 'flip',
              accelG: 1.0,
              cruiseC: 0.85,
              driveType: 'non-reactive',
              exhaustVelC: 0.33,
            },
            waypoints:
              sysId === 'sol'
                ? [{ systemId: 'sol', stayYears: 0 }]
                : [
                    { systemId: 'sol', stayYears: 0 },
                    { systemId: sysId, stayYears: 0 },
                  ],
          };
          setActiveShipId(newId);
          return [fresh];
        }
        return prev.map((sh) => {
          if (sh.id !== activeShipId) return sh;
          const last = sh.waypoints[sh.waypoints.length - 1];
          if (last && last.systemId === sysId) return sh;
          return {
            ...sh,
            waypoints: [...sh.waypoints, { systemId: sysId, stayYears: 0 }],
          };
        });
      });
    },
    [activeShipId]
  );

  const handleSetAsOrigin = useCallback(
    (sysId) => {
      if (!sysId) return;
      setIsLeftDockOpen(true);
      setShips((prev) => {
        if (prev.length === 0) {
          const newId = `ship-${Date.now()}`;
          const fresh = {
            id: newId,
            name: 'ISV Vessel 1',
            color: SHIP_COLORS[0],
            departureYear: 2150.0,
            crewStartAge: 30.0,
            driveConfig: {
              mode: 'flip',
              accelG: 1.0,
              cruiseC: 0.85,
              driveType: 'non-reactive',
              exhaustVelC: 0.33,
            },
            waypoints: [{ systemId: sysId, stayYears: 0 }],
          };
          setActiveShipId(newId);
          return [fresh];
        }
        return prev.map((sh) => {
          if (sh.id !== activeShipId) return sh;
          const rest = sh.waypoints.slice(1);
          return {
            ...sh,
            waypoints: [{ systemId: sysId, stayYears: 0 }, ...rest],
          };
        });
      });
    },
    [activeShipId]
  );

  const handleAddShip = () => {
    const idx = ships.length + 1;
    const newId = `ship-${Date.now()}`;
    const newShip = {
      id: newId,
      name: `ISV Vessel ${idx}`,
      color: SHIP_COLORS[(idx - 1) % SHIP_COLORS.length],
      departureYear: 2150.0,
      crewStartAge: 30.0,
      driveConfig: {
        mode: 'flip',
        accelG: 1.0,
        cruiseC: 0.8,
        driveType: 'non-reactive',
        exhaustVelC: 0.33,
      },
      waypoints: [
        { systemId: 'sol', stayYears: 0 },
        { systemId: selectedSystemId !== 'sol' ? selectedSystemId : 'hip-71683', stayYears: 0 },
      ],
    };
    setShips((prev) => [...prev, newShip]);
    setActiveShipId(newId);
  };

  const handleDuplicateShip = () => {
    const cur = ships.find((s) => s.id === activeShipId);
    if (!cur) return;
    const newId = `ship-${Date.now()}`;
    const copy = {
      ...cur,
      id: newId,
      name: `${cur.name} (II)`,
      color: SHIP_COLORS[ships.length % SHIP_COLORS.length],
      waypoints: cur.waypoints.map((w) => ({ ...w })),
      driveConfig: { ...cur.driveConfig },
    };
    setShips((prev) => [...prev, copy]);
    setActiveShipId(newId);
  };

  const handleLoadVoyagePreset = useCallback(
    (preset, autoPlay = true) => {
      if (!preset || !Array.isArray(preset.ships) || preset.ships.length === 0) return;
      const clonedShips = preset.ships.map((sh) => ({
        ...sh,
        name: lang === 'cs' && sh.nameCs ? sh.nameCs : sh.name,
        nameEn: sh.name,
        nameCs: sh.nameCs || sh.name,
        driveConfig: { ...sh.driveConfig },
        waypoints: sh.waypoints.map((w) => ({ ...w })),
      }));
      const clonedEvents = (preset.storyEvents || []).map((ev) => ({ ...ev }));
      setShips(clonedShips);
      setActiveShipId(clonedShips[0].id);
      setStoryEvents(clonedEvents);
      setActiveVoyagePreset(preset);
      setMergedVoyagePresetIds([preset.id]);
      setEpochOffsetYears(0);

      const startClock =
        Number.isFinite(preset.recommendedClockStart)
          ? preset.recommendedClockStart
          : Math.min(...clonedShips.map((s) => s.departureYear));
      setMasterClockYear(startClock);
      setIsLeftDockOpen(true);
      setIsTimelineOpen(true);
      setIsPlayingTimeline(Boolean(autoPlay));

      const focusId = preset.focusSystemId || clonedShips[0].waypoints[0]?.systemId || 'sol';
      setSelectedSystemId(focusId);
      setFocusRequest({ systemId: focusId, ts: Date.now() });
    },
    [lang]
  );

  // Merge one or more voyage presets together (deduplicating ship IDs and story events)
  const handleMergeVoyagePresets = useCallback(
    (presetsToMerge, { replaceExisting = false, autoPlay = false } = {}) => {
      const validPresets = (presetsToMerge || []).filter(
        (p) => p && Array.isArray(p.ships) && p.ships.length > 0
      );
      if (validPresets.length === 0) return;

      const baseShips = replaceExisting ? [] : ships;
      const baseEvents = replaceExisting ? [] : storyEvents;
      const basePresetIds = replaceExisting ? [] : mergedVoyagePresetIds;

      const shipMap = new Map(baseShips.map((s) => [s.id, s]));
      const nextShips = [...baseShips];
      for (const vp of validPresets) {
        for (const sh of vp.ships) {
          if (shipMap.has(sh.id)) continue;
          const cloned = {
            ...sh,
            name: lang === 'cs' && sh.nameCs ? sh.nameCs : sh.name,
            nameEn: sh.name,
            nameCs: sh.nameCs || sh.name,
            color: sh.color || SHIP_COLORS[nextShips.length % SHIP_COLORS.length],
            driveConfig: { ...sh.driveConfig },
            waypoints: sh.waypoints.map((w) => ({ ...w })),
          };
          shipMap.set(cloned.id, cloned);
          nextShips.push(cloned);
        }
      }

      const eventKeys = new Set(
        baseEvents.map((ev) => ev.id || `${ev.systemId}|${ev.year}|${ev.title}`)
      );
      const nextEvents = [...baseEvents];
      for (const vp of validPresets) {
        for (const ev of vp.storyEvents || []) {
          const k = ev.id || `${ev.systemId}|${ev.year}|${ev.title}`;
          if (eventKeys.has(k)) continue;
          eventKeys.add(k);
          nextEvents.push({ ...ev });
        }
      }
      nextEvents.sort((a, b) => (a.year || 0) - (b.year || 0));

      const nextPresetIds = [...new Set([...basePresetIds, ...validPresets.map((p) => p.id)])];
      const mergedPresets = nextPresetIds
        .map((id) => voyagesLibrary.find((v) => v.id === id) || validPresets.find((v) => v.id === id))
        .filter(Boolean);

      const universesEn = [...new Set(mergedPresets.map((p) => p.universe).filter(Boolean))];
      const universesCs = [...new Set(mergedPresets.map((p) => p.universeCs || p.universe).filter(Boolean))];
      const summaryPreset =
        mergedPresets.length === 1
          ? mergedPresets[0]
          : {
              id: `merged-${nextPresetIds.join('+')}`,
              universe: universesEn.join(' + '),
              universeCs: universesCs.join(' + '),
              title: {
                en: `${mergedPresets.length} merged presets · ${nextShips.length} ships`,
                cs: `${mergedPresets.length} sloučených scénářů · ${nextShips.length} lodí`,
              },
              ships: nextShips,
              storyEvents: nextEvents,
            };

      setShips(nextShips);
      if (replaceExisting && nextShips.length > 0) {
        setActiveShipId(nextShips[0].id);
      }
      setStoryEvents(nextEvents);
      setMergedVoyagePresetIds(nextPresetIds);
      setActiveVoyagePreset(summaryPreset);
      setEpochOffsetYears(0);

      const minDep = Math.min(...nextShips.map((s) => s.departureYear));
      if (replaceExisting || baseShips.length === 0 || !Number.isFinite(masterClockYear)) {
        setMasterClockYear(minDep);
      }
      if ((replaceExisting || baseShips.length === 0) && nextShips.length > 0) {
        setActiveShipId(nextShips[0].id);
      }
      setIsLeftDockOpen(true);
      setIsTimelineOpen(true);
      setIsPlayingTimeline(Boolean(autoPlay));

      const focusId =
        validPresets[0].focusSystemId || nextShips[0]?.waypoints?.[0]?.systemId || 'sol';
      setSelectedSystemId(focusId);
      setFocusRequest({ systemId: focusId, ts: Date.now() });
    },
    [lang, ships, storyEvents, mergedVoyagePresetIds, voyagesLibrary, masterClockYear]
  );

  // Keep loaded preset ship labels synchronized if the user switches EN <-> CS
  useEffect(() => {
    setShips((prev) =>
      prev.map((sh) => {
        if (!sh.nameEn || !sh.nameCs) return sh;
        const nextName = lang === 'cs' ? sh.nameCs : sh.nameEn;
        return sh.name === nextName ? sh : { ...sh, name: nextName };
      })
    );
  }, [lang]);

  const handleDeleteShip = () => {
    if (ships.length === 0) return;
    const next = ships.filter((s) => s.id !== activeShipId);
    setShips(next);
    setActiveShipId(next[0]?.id || null);
    if (next.length === 0) {
      setActiveVoyagePreset(null);
      setMergedVoyagePresetIds([]);
      setIsPlayingTimeline(false);
      setLightConeConfig((prev) => ({ ...prev, enabled: false }));
    }
  };

  const handleClearAllVoyages = useCallback(() => {
    setShips([]);
    setActiveShipId(null);
    setStoryEvents([]);
    setActiveVoyagePreset(null);
    setMergedVoyagePresetIds([]);
    setIsPlayingTimeline(false);
    setLightConeConfig((prev) => ({ ...prev, enabled: false }));
  }, []);

  const handleExportJson = () => {
    const payload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      epochOffsetYears,
      masterClockYear,
      ships,
      storyEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astrometrics-novel-timeline.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        if (Array.isArray(parsed.ships) && parsed.ships.length > 0) {
          setShips(parsed.ships);
          setActiveShipId(parsed.ships[0].id);
        }
        if (Array.isArray(parsed.storyEvents)) setStoryEvents(parsed.storyEvents);
        if (Number.isFinite(parsed.epochOffsetYears)) setEpochOffsetYears(parsed.epochOffsetYears);
        if (Number.isFinite(parsed.masterClockYear)) setMasterClockYear(parsed.masterClockYear);
      } catch (err) {
        console.error('Invalid JSON file:', err);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const selectedSystem = systemsById.get(selectedSystemId) || systemsById.get('sol');
  const lastWaypointId =
    activeShipWithVoyage?.waypoints?.[activeShipWithVoyage.waypoints.length - 1]?.systemId;
  const lastWaypointSystem = lastWaypointId ? systemsById.get(lastWaypointId) : solSystem;

  // Quick stats of currently displayed systems
  const visibleStats = useMemo(() => {
    let exo = 0;
    let hz = 0;
    let planets = 0;
    let scifi = 0;
    for (const s of filteredSystems) {
      if (s.hasPlanets) exo++;
      if (s.hasOptimisticHZ) hz++;
      if (scifiBySystemId[s.id]) scifi++;
      planets += s.planetCount || 0;
    }
    return { total: filteredSystems.length, exo, hz, planets, scifi };
  }, [filteredSystems, scifiBySystemId]);

  return (
    <div className="astrometrics-app-shell">
      {/* Compact, Clean, Responsive Single-Row Top Command Header */}
      <header className="astrometrics-top-header">
        {/* Left: Compact Brand + Search */}
        <div className="header-left-group">
          <div
            className="brand-reticle-box"
            onClick={() => handleSelectSystem('sol', true)}
            title={t('btnFocusSol')}
          >
            <Orbit size={18} className="brand-spin-icon" />
          </div>
          <div className="brand-text-col">
            <div className="brand-title">{t('appTitle')}</div>
            <div className="brand-subtitle">{t('appSubtitle')}</div>
          </div>

          <div className="search-dropdown-wrap">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              className="hud-input search-input"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchFocused && searchResults.length > 0 && (
              <div className="search-results-menu">
                {searchResults.map((s) => {
                  const sf = scifiBySystemId[s.id];
                  const aliasHint = sf?.aliases?.[0];
                  const uniHint = sf?.universes?.slice(0, 2).join(', ');
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="search-result-item"
                      onMouseDown={() => {
                        handleSelectSystem(s.id, true);
                        setSearchQuery('');
                      }}
                    >
                      <span className="sr-name">
                        {s.name}
                        {aliasHint ? <small className="sr-alias"> ({aliasHint})</small> : null}{' '}
                        {s.hasOptimisticHZ ? '◈' : s.hasPlanets ? '◎' : ''}
                        {sf ? ' ★' : ''}
                      </span>
                      <span className="sr-meta">
                        {formatNum(s.distLy, 2, lang)} ly · {s.stars[0]?.spect}
                        {s.hasPlanets ? ` · ${s.planetCount} pl` : ''}
                        {uniHint ? ` · ${uniHint}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center: High-Contrast Filter Combobox + Advanced Filters Popover */}
        <div className="header-center-group">
          <div className="filter-select-wrap">
            <Filter size={13} className="select-prefix-icon" />
            <select
              className="hud-select filter-main-select"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              aria-label={t('filtersBtnLabel')}
            >
              <option value="core">{t('filterAllCore')}</option>
              <option value="visible">{t('filterVisible')}</option>
              <option value="exoplanets">{t('filterExoplanets')}</option>
              <option value="hz">{t('filterHabitable')}</option>
              <option value="conservative-hz">{t('filterConservativeHZ')}</option>
              <option value="jwst">{t('filterJwstSpectra')}</option>
              <option value="brown-dwarfs">{t('filterBrownDwarfs')}</option>
              <option value="solar-analogs">{t('filterSolarAnalogs')}</option>
              <option value="scifi">{t('filterSciFi')}</option>
              <option value="deep">{t('filterAllDeep')}</option>
            </select>
            <ChevronDown size={13} className="select-chevron-icon" />
          </div>

          <div className="filters-popover-anchor" ref={filtersRef}>
            <button
              type="button"
              className={`hud-btn compact-btn ${isFiltersOpen || activeFilterCount > 0 ? 'primary-btn' : 'secondary-btn'}`}
              onClick={() => setIsFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal size={13} />
              <span>{t('filtersBtnLabel')}</span>
              {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
            </button>

            {isFiltersOpen && (
              <div className="filters-popover-panel">
                <div className="popover-header">
                  <span>{t('filtersPopoverTitle')}</span>
                  <button type="button" className="icon-btn" onClick={() => setIsFiltersOpen(false)}>
                    <X size={13} />
                  </button>
                </div>

                {/* Spectral Class Multi-Select Chips */}
                <div className="popover-section">
                  <div className="popover-label-row">
                    <span>{t('spectralFilterLabel')}</span>
                    <button
                      type="button"
                      className="text-link-btn"
                      onClick={() => setSelectedSpectralClasses([])}
                    >
                      {t('spectralAll')}
                    </button>
                  </div>
                  <div className="spectral-chips-grid">
                    {SPECTRAL_CLASS_LIST.map((cls) => {
                      const active = selectedSpectralClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          className={`spectral-chip-btn ${active ? 'active' : ''}`}
                          style={{
                            borderColor: active ? SPECTRAL_COLORS[cls] : undefined,
                          }}
                          onClick={() => toggleSpectralClass(cls)}
                        >
                          <span
                            className="spec-chip-dot"
                            style={{ backgroundColor: SPECTRAL_COLORS[cls] }}
                          />
                          <span>{cls}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Constellation Selector */}
                <div className="popover-section">
                  <div className="popover-label-row">
                    <span>{t('constellationFilterLabel')}</span>
                  </div>
                  <select
                    className="hud-select full-width"
                    value={selectedConstellation}
                    onChange={(e) => setSelectedConstellation(e.target.value)}
                  >
                    <option value="">{t('constellationAll')}</option>
                    {availableConstellations.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Radius Slider */}
                <div className="popover-section">
                  <div className="popover-label-row">
                    <span>{t('radiusLabel')}</span>
                    <strong className="highlight-cyan">{radiusLy} ly</strong>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max={catalogMaxSliderRadius}
                    step="5"
                    className="hud-range full-width"
                    value={radiusLy}
                    onChange={(e) => setRadiusLy(Number(e.target.value))}
                  />
                </div>

                {/* Within Ship Reach (Crew Proper Time τ) Slider */}
                <div className="popover-section">
                  <div className="popover-label-row">
                    <span>{t('withinReachLabel')}</span>
                    <strong className="highlight-amber">
                      {maxCrewReachYears === 0
                        ? t('withinReachOff')
                        : `≤ ${maxCrewReachYears} yr (${formatNum(maxReachDistanceLy, 1, lang)} ly)`}
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    className="hud-range full-width"
                    value={maxCrewReachYears}
                    onChange={(e) => setMaxCrewReachYears(Number(e.target.value))}
                  />
                </div>

                {/* 3D Stellar Motion Epoch Scrubber */}
                <div className="popover-section">
                  <div className="popover-label-row">
                    <span>{t('epochLabel')}</span>
                    <div className="epoch-val-group">
                      <strong className="highlight-emerald">
                        {epochOffsetYears === 0
                          ? 'J2000'
                          : `${epochOffsetYears > 0 ? '+' : ''}${epochOffsetYears / 1000} kyr`}
                      </strong>
                      {epochOffsetYears !== 0 && (
                        <button
                          type="button"
                          className="mini-reset-btn"
                          onClick={() => setEpochOffsetYears(0)}
                          title={t('epochReset')}
                        >
                          <RotateCcw size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-100000"
                    max="100000"
                    step="1000"
                    className="hud-range full-width"
                    value={epochOffsetYears}
                    onChange={(e) => setEpochOffsetYears(Number(e.target.value))}
                  />
                </div>

                {/* 3D Stellar Velocity Vectors Control */}
                <div className="popover-section">
                  <div className="popover-label-row">
                    <span>{t('vectorsTitle')}</span>
                    {velocityVectorMode !== 'off' && (
                      <strong className="highlight-cyan">+{velocityHorizonKyr} kyr</strong>
                    )}
                  </div>
                  <div className="vector-filter-row">
                    <select
                      className="hud-select"
                      value={velocityVectorMode}
                      onChange={(e) => setVelocityVectorMode(e.target.value)}
                    >
                      <option value="off">{t('vectorsModeOff')}</option>
                      <option value="full3d">{t('vectorsModeFull3d')}</option>
                      <option value="all">{t('vectorsModeAll')}</option>
                    </select>
                    <select
                      className="hud-select"
                      value={velocityHorizonKyr}
                      disabled={velocityVectorMode === 'off'}
                      onChange={(e) => setVelocityHorizonKyr(Number(e.target.value))}
                      title={t('vectorsHorizonLabel')}
                    >
                      <option value={10}>+10 kyr</option>
                      <option value={20}>+20 kyr</option>
                      <option value={50}>+50 kyr</option>
                    </select>
                  </div>
                </div>

                {/* Quick Boolean Filters */}
                <div className="popover-section checkbox-stack">
                  <label className="hud-check-row">
                    <input
                      type="checkbox"
                      checked={scifiOnly}
                      onChange={(e) => setScifiOnly(e.target.checked)}
                    />
                    <span>★ {t('scifiOnlyLabel')}</span>
                  </label>
                  <label className="hud-check-row">
                    <input
                      type="checkbox"
                      checked={terrestrialHzOnly}
                      onChange={(e) => setTerrestrialHzOnly(e.target.checked)}
                    />
                    <span>{t('terrestrialHzOnlyLabel')}</span>
                  </label>
                  <label className="hud-check-row">
                    <input
                      type="checkbox"
                      checked={multiStarOnly}
                      onChange={(e) => setMultiStarOnly(e.target.checked)}
                    />
                    <span>{t('multiStarOnlyLabel')}</span>
                  </label>
                  <label className="hud-check-row">
                    <input
                      type="checkbox"
                      checked={jwstOnly}
                      onChange={(e) => setJwstOnly(e.target.checked)}
                    />
                    <span>🔭 {t('jwstOnlyLabel')}</span>
                  </label>
                  <label className="hud-check-row">
                    <input
                      type="checkbox"
                      checked={highEsiOnly}
                      onChange={(e) => setHighEsiOnly(e.target.checked)}
                    />
                    <span>◈ {t('highEsiOnlyLabel')}</span>
                  </label>
                  <label className="hud-check-row">
                    <input
                      type="checkbox"
                      checked={flareStarOnly}
                      onChange={(e) => setFlareStarOnly(e.target.checked)}
                    />
                    <span>⚡ {t('flareStarOnlyLabel')}</span>
                  </label>
                  <label className="hud-check-row">
                    <input
                      type="checkbox"
                      checked={debrisDiskOnly}
                      onChange={(e) => setDebrisDiskOnly(e.target.checked)}
                    />
                    <span>◎ {t('debrisDiskOnlyLabel')}</span>
                  </label>
                </div>

                {/* Sci-Fi Universe / Franchise Filter */}
                {availableSciFiUniverses.length > 0 && (
                  <div className="popover-section">
                    <div className="popover-label-row">
                      <span>★ {t('scifiUniverseFilterLabel')}</span>
                    </div>
                    <select
                      className="hud-select full-width"
                      value={selectedSciFiUniverse}
                      onChange={(e) => setSelectedSciFiUniverse(e.target.value)}
                    >
                      <option value="">{t('scifiUniverseAll')}</option>
                      {availableSciFiUniverses.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name} ({u.count})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="hud-btn secondary-btn full-width"
                    onClick={resetAllFilters}
                  >
                    <RotateCcw size={12} />
                    <span>{t('resetFiltersLabel')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Panel Dock Toggles (Left / Bottom / Right) + Sources + EN/CS */}
        <div className="header-right-actions">
          <div className="panel-toggle-group">
            <button
              type="button"
              className={`hud-btn compact-btn ${isLeftDockOpen ? 'primary-btn' : 'secondary-btn'}`}
              onClick={() => setIsLeftDockOpen((v) => !v)}
              title={t('toggleRoutePanel')}
            >
              <PanelLeft size={14} />
              <span className="btn-label-md">{t('toggleRoutePanel')}</span>
            </button>

            <button
              type="button"
              className={`hud-btn compact-btn ${isTimelineOpen ? 'primary-btn' : 'secondary-btn'}`}
              onClick={() => setIsTimelineOpen((v) => !v)}
              title={t('btnTimelineDrawer')}
            >
              <Clock size={14} />
              <span className="btn-label-md">{t('toggleTimelinePanel')}</span>
            </button>

            <button
              type="button"
              className={`hud-btn compact-btn ${isRightDockOpen ? 'primary-btn' : 'secondary-btn'}`}
              onClick={() => setIsRightDockOpen((v) => !v)}
              title={t('toggleInspectorPanel')}
            >
              <PanelRight size={14} />
              <span className="btn-label-md">{t('toggleInspectorPanel')}</span>
            </button>
          </div>

          <button
            type="button"
            className="hud-btn compact-btn voyage-lib-btn"
            onClick={() => setIsVoyagesModalOpen(true)}
            title={t('btnVoyageLibraryFull')}
          >
            <BookMarked size={14} />
            <span className="btn-label-md">{t('btnVoyageLibrary')}</span>
          </button>

          <button
            type="button"
            className="hud-btn compact-btn secondary-btn"
            onClick={() => setIsDataSourcesOpen(true)}
            title={t('btnDataSources')}
          >
            <Database size={14} />
          </button>

          <button
            type="button"
            className="hud-btn compact-btn lang-switch-btn"
            onClick={() => setLang(lang === 'en' ? 'cs' : 'en')}
            title="EN / CS"
          >
            <Globe size={13} />
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (Optional Left Dock + Center 3D Map + Optional Right Dock) */}
      <div className="astrometrics-main-workspace">
        {isLeftDockOpen && (
          <RouteComputerPanel
            ships={ships}
            shipsWithVoyages={shipsWithVoyages}
            activeShipId={activeShipId}
            onSelectShip={setActiveShipId}
            onAddShip={handleAddShip}
            onDuplicateShip={handleDuplicateShip}
            onDeleteShip={handleDeleteShip}
            onClearAllVoyages={handleClearAllVoyages}
            onUpdateActiveShip={handleUpdateActiveShip}
            activeVoyage={activeShipWithVoyage?.voyage}
            selectedSystem={selectedSystem}
            systemsById={systemsById}
            epochOffsetYears={epochOffsetYears}
            masterClockYear={masterClockYear}
            lightConeConfig={lightConeConfig}
            onUpdateLightConeConfig={setLightConeConfig}
            onSelectSystem={(id) => handleSelectSystem(id, true)}
            activeVoyagePreset={activeVoyagePreset}
            onOpenVoyageLibrary={() => setIsVoyagesModalOpen(true)}
            isBridgeViewOpen={isBridgeViewOpen}
            onToggleBridgeView={() => setIsBridgeViewOpen((v) => !v)}
            onClose={() => setIsLeftDockOpen(false)}
          />
        )}

        {/* Center 3D Star Map Viewport */}
        <main className="map3d-center-stage">
          {loading ? (
            <div className="loading-overlay">Loading 3D Astrometrics Catalogue...</div>
          ) : (
            <AstrometricsMap3D
              systems={filteredSystems}
              selectedSystemId={selectedSystemId}
              onSelectSystem={(id) => handleSelectSystem(id, false)}
              onAppendWaypoint={handleAppendWaypoint}
              epochOffsetYears={epochOffsetYears}
              labelMode={labelMode}
              colorMode={colorMode}
              activeVoyage={activeShipWithVoyage?.voyage}
              allShipsWithVoyages={shipsWithVoyages}
              masterClockYear={masterClockYear}
              lightConeConfig={lightConeConfig}
              focusRequest={focusRequest}
              galacticCenterText={t('galacticCenterDir')}
              scifiBySystemId={scifiBySystemId}
              velocityVectorMode={velocityVectorMode}
              velocityHorizonKyr={velocityHorizonKyr}
              maxRadiusLy={catalogMaxSliderRadius}
              radioBubbleConfig={radioBubbleConfig}
              systemsById={systemsById}
              lang={lang}
            />
          )}

          {/* Optional Floating Earth Radio & METI Shell Explorer */}
          <RadioBubblePanel
            isOpen={radioBubbleEnabled}
            onClose={() => setRadioBubbleEnabled(false)}
            selectedYear={radioSelectedYear}
            onSelectYear={setRadioSelectedYear}
            showMetiBeams={radioShowMetiBeams}
            onToggleMetiBeams={setRadioShowMetiBeams}
            allSystems={catalog?.systems || []}
            systemsById={systemsById}
            onSelectSystem={handleSelectSystem}
          />

          {/* Optional Floating Relativistic Cockpit Viewport ("Bridge View") */}
          <RelativisticBridgeView
            isOpen={isBridgeViewOpen}
            onClose={() => setIsBridgeViewOpen(false)}
            allSystems={catalog?.systems || []}
            activeShip={activeShipWithVoyage}
            activeVoyage={activeShipWithVoyage?.voyage}
            masterClockYear={masterClockYear}
            epochOffsetYears={epochOffsetYears}
          />

          {/* Floating Map Telemetry & 1-Click Workspace Mode Presets (shared flex row -> zero overlap!) */}
          <div className="map3d-top-overlay-row">
            <div className="map3d-top-hud-bar">
              <div className="map-stat-chip">
                <span>{t('telemetrySystemsShown')}:</span>
                <strong>{visibleStats.total}</strong>
              </div>
              <div className="map-stat-chip cyan">
                <span>◎ {t('telemetryExoHosts')}:</span>
                <strong>{visibleStats.exo}</strong>
              </div>
              <div className="map-stat-chip emerald">
                <span>◈ {t('telemetryHzHosts')}:</span>
                <strong>{visibleStats.hz}</strong>
              </div>
              <div className="map-stat-chip violet">
                <span>★ {t('telemetrySciFiStars')}:</span>
                <strong>{visibleStats.scifi}</strong>
              </div>
            </div>

            <div className="map3d-top-right-presets">
              <button
                type="button"
                className={`preset-mode-btn ${activeWorkspacePreset === 'explore' ? 'active' : ''}`}
                onClick={() => applyWorkspacePreset('explore')}
              >
                {t('workspacePresetExplore')}
              </button>
              <button
                type="button"
                className={`preset-mode-btn ${activeWorkspacePreset === 'route' ? 'active' : ''}`}
                onClick={() => applyWorkspacePreset('route')}
              >
                {t('workspacePresetRoute')}
              </button>
              <button
                type="button"
                className={`preset-mode-btn ${activeWorkspacePreset === 'studio' ? 'active' : ''}`}
                onClick={() => applyWorkspacePreset('studio')}
              >
                {t('workspacePresetStudio')}
              </button>
            </div>
          </div>

          <div
            className={`map3d-bottom-controls-bar ${velocityVectorMode !== 'off' ? 'vectors-active' : ''}`}
          >
            <div className="map-control-group">
              <button
                type="button"
                className="map-pill-btn"
                onClick={() => handleSelectSystem('sol', true)}
              >
                <Compass size={13} />
                <span>{t('btnFocusSol')}</span>
              </button>

              <button
                type="button"
                className="map-pill-btn"
                onClick={() =>
                  setLabelMode((m) =>
                    m === 'auto' ? 'hz' : m === 'hz' ? 'all' : m === 'all' ? 'none' : 'auto'
                  )
                }
              >
                <Tag size={13} />
                <span>
                  {labelMode === 'auto'
                    ? t('labelsAuto')
                    : labelMode === 'hz'
                      ? t('labelsHz')
                      : labelMode === 'all'
                        ? t('labelsAll')
                        : t('labelsNone')}
                </span>
              </button>

              <button
                type="button"
                className="map-pill-btn"
                onClick={() => setColorMode((c) => (c === 'spectral' ? 'exoplanet' : 'spectral'))}
              >
                <Palette size={13} />
                <span>
                  {colorMode === 'spectral' ? t('colorBySpectral') : t('colorByExoplanet')}
                </span>
              </button>

              <button
                type="button"
                className={`map-pill-btn ${velocityVectorMode !== 'off' ? 'active-pill' : ''}`}
                onClick={() =>
                  setVelocityVectorMode((m) =>
                    m === 'off' ? 'full3d' : m === 'full3d' ? 'all' : 'off'
                  )
                }
                title={t('vectorsTitle')}
              >
                <MoveUpRight size={13} />
                <span>
                  {velocityVectorMode === 'off'
                    ? t('vectorsOff')
                    : velocityVectorMode === 'full3d'
                      ? t('vectorsFull3d')
                      : t('vectorsAll')}
                </span>
              </button>

              {velocityVectorMode !== 'off' && (
                <>
                  <button
                    type="button"
                    className="map-pill-btn vector-horizon-pill"
                    onClick={() =>
                      setVelocityHorizonKyr((h) => (h === 10 ? 20 : h === 20 ? 50 : 10))
                    }
                    title={t('vectorsHorizonLabel')}
                  >
                    +{velocityHorizonKyr} kyr
                  </button>
                  <div className="vector-legend-pill">
                    <span className="vec-dot vec-3d" />
                    <span>{t('vectorsLegendFull3d')}</span>
                    {velocityVectorMode === 'all' && (
                      <>
                        <span className="vec-dot vec-tan" />
                        <span>{t('vectorsLegendTangential')}</span>
                      </>
                    )}
                  </div>
                </>
              )}

              <button
                type="button"
                className={`map-pill-btn ${radioBubbleEnabled ? 'active-pill emerald-pill' : ''}`}
                onClick={() => setRadioBubbleEnabled((v) => !v)}
                title={t('radioBtnTooltip')}
              >
                <Radio size={13} />
                <span>{t('btnRadioBubble')}</span>
              </button>

              <button
                type="button"
                className={`map-pill-btn ${isBridgeViewOpen ? 'active-pill' : ''}`}
                onClick={() => setIsBridgeViewOpen((v) => !v)}
                title={t('bridgeBtnTooltip')}
              >
                <Eye size={13} />
                <span>{t('btnBridgeView')}</span>
              </button>
            </div>

            <div className="map-hint-banner">{t('mapHint')}</div>
          </div>
        </main>

        {isRightDockOpen && (
          <SystemInspector
            system={selectedSystem}
            solSystem={solSystem}
            lastWaypointSystem={lastWaypointSystem}
            epochOffsetYears={epochOffsetYears}
            scifiEntry={selectedSystem ? scifiBySystemId[selectedSystem.id] : null}
            activeSciFiUniverse={selectedSciFiUniverse}
            onFilterBySciFiUniverse={(uni) => {
              setSelectedSciFiUniverse((prev) => (prev === uni ? '' : uni));
            }}
            onAppendToRoute={handleAppendWaypoint}
            onSetAsOrigin={handleSetAsOrigin}
            onClose={() => setIsRightDockOpen(false)}
          />
        )}
      </div>

      {/* Optional Bottom Dock: Multi-Ship Synchronized Timeline & Minkowski Space-Time Studio */}
      <TimelineAndMinkowskiStudio
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        shipsWithVoyages={shipsWithVoyages}
        activeShipId={activeShipId}
        onSelectShip={setActiveShipId}
        masterClockYear={masterClockYear}
        onChangeMasterClockYear={setMasterClockYear}
        isPlaying={isPlayingTimeline}
        onTogglePlay={() => setIsPlayingTimeline((v) => !v)}
        storyEvents={storyEvents}
        onAddStoryEvent={(ev) => setStoryEvents((prev) => [...prev, ev])}
        onRemoveStoryEvent={(id) => setStoryEvents((prev) => prev.filter((e) => e.id !== id))}
        systemsById={systemsById}
        epochOffsetYears={epochOffsetYears}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClearAllVoyages={handleClearAllVoyages}
      />

      {/* Compact Academic Footer Strip (KIV ZČU & Author Homepage) */}
      <Footer />

      {/* Sci-Fi Voyages & Character Paths Library Modal */}
      <SciFiVoyagesModal
        isOpen={isVoyagesModalOpen}
        onClose={() => setIsVoyagesModalOpen(false)}
        voyages={voyagesLibrary}
        activeVoyagePresetId={activeVoyagePreset?.id || null}
        mergedVoyagePresetIds={mergedVoyagePresetIds}
        currentShipCount={ships.length}
        onLoadVoyage={handleLoadVoyagePreset}
        onMergeVoyages={handleMergeVoyagePresets}
        onClearAllVoyages={handleClearAllVoyages}
      />

      {/* Data Sources & Attribution Modal */}
      <DataSourcesModal
        isOpen={isDataSourcesOpen}
        onClose={() => setIsDataSourcesOpen(false)}
        catalogMeta={catalog?.meta}
        scifiMeta={scifiData?.meta}
      />
    </div>
  );
}
