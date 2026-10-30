import React, { useState, useEffect, useMemo } from 'react';
import {
  CommuterProfileId,
  TransitStop,
  TransitRoute,
  CommunityReport,
  BusyTimeBucket,
  BacktestSummary,
  BacktestTripResult,
  PassengerUser,
  ETMTicket,
  CustomerLocation,
} from './types/transit';
import {
  COMMUTER_PROFILES,
  INITIAL_STOPS,
  INITIAL_ROUTES,
  BUSY_TIMES_DATA,
  INITIAL_REPORTS,
  INITIAL_BACKTEST_SUMMARY,
  INITIAL_BACKTEST_TRIPS,
  DEFAULT_PASSENGER_USER,
  DEFAULT_CUSTOMER_LOCATION,
} from './data/transitData';
import { rankRoutes } from './services/riskEngine';
import { SupportedLanguage, TransitVoiceSynthesizer, LOCALIZED_VOICE_GUIDANCE } from './services/speechService';
import { TRANSLATIONS } from './services/i18n';
import { Header } from './components/Header';
import { PassengerLoginScreen } from './components/PassengerLoginScreen';
import { RedBusHeroSearch } from './components/RedBusHeroSearch';
import { RiskMatrixBanner } from './components/RiskMatrixBanner';
import { RouteList } from './components/RouteList';
import { SchematicMap } from './components/SchematicMap';
import { BusyTimesChart } from './components/BusyTimesChart';
import { SeatLayoutModal } from './components/SeatLayoutModal';
import { ETMMachineModal } from './components/ETMMachineModal';
import { LiveGpsTrackerTool } from './components/LiveGpsTrackerTool';
import { CommunityReportModal } from './components/CommunityReportModal';
import { BacktestEvaluationModal } from './components/BacktestEvaluationModal';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { StopDetailsModal } from './components/StopDetailsModal';
import {
  Bus,
  Shield,
  Radio,
  AlertTriangle,
  Printer,
  Database,
  CheckCircle2,
  Ticket,
  ArrowLeft,
  Navigation,
  MapPin,
  LocateFixed,
} from 'lucide-react';

export default function App() {
  // Passenger User Profile (Opens with Login Screen initially!)
  const [passenger, setPassenger] = useState<PassengerUser>(() => {
    try {
      const saved = localStorage.getItem('transitshield_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return DEFAULT_PASSENGER_USER;
  });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Commuter Customer Specific Location (Specifically shows where customer is located!)
  const [customerLocation, setCustomerLocation] = useState<CustomerLocation>(DEFAULT_CUSTOMER_LOCATION);

  // Localization Language (Working across EN, HI, KN)
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const t = TRANSLATIONS[language];

  // Accessibility toggles
  const [highContrast, setHighContrast] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Active navigation tab and Navigation History Stack for Universal Back Press
  const [activeNavTab, setActiveNavTab] = useState<string>('buses');
  const [navHistory, setNavHistory] = useState<string[]>([]);

  // Search Stops State
  const [fromStopId, setFromStopId] = useState<string>('stop-majestic');
  const [toStopId, setToStopId] = useState<string>('stop-ecospace');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Network State
  const [stops, setStops] = useState<TransitStop[]>(INITIAL_STOPS);
  const [routes, setRoutes] = useState<TransitRoute[]>(INITIAL_ROUTES);
  const [busyTimes, setBusyTimes] = useState<BusyTimeBucket[]>(BUSY_TIMES_DATA);
  const [reports, setReports] = useState<CommunityReport[]>(INITIAL_REPORTS);
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary>(INITIAL_BACKTEST_SUMMARY);
  const [backtestTrips, setBacktestTrips] = useState<BacktestTripResult[]>(INITIAL_BACKTEST_TRIPS);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>('route-335e');

  // Modals State
  const [selectedRouteForSeat, setSelectedRouteForSeat] = useState<TransitRoute | null>(null);
  const [isETMModalOpen, setIsETMModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [inspectedStop, setInspectedStop] = useState<TransitStop | null>(null);

  // Physical QR Code scan verification banner state
  const [physicalQrBanner, setPhysicalQrBanner] = useState<{
    stopName: string;
    stopCode: string;
    locality: string;
    stepFree: boolean;
  } | null>(null);

  // Recent ticket notification banner
  const [lastIssuedTicket, setLastIssuedTicket] = useState<ETMTicket | null>(null);

  // Active Profile mapped from passenger special needs
  const currentProfileId = passenger.commuterProfileId || 'default';
  const activeProfile = COMMUTER_PROFILES[currentProfileId] || COMMUTER_PROFILES.default;

  // Stops Map for quick lookups
  const stopsMap = useMemo(() => {
    const map = new Map<string, TransitStop>();
    stops.forEach(s => map.set(s.id, s));
    return map;
  }, [stops]);

  // Compute real-time Journey Risk Scores
  const rankedRoutes = useMemo(() => {
    let list = rankRoutes(routes, stopsMap, activeProfile, reports);

    // Filter chips
    if (activeFilter === 'lowest_risk') {
      list = list.filter(r => r.breakdown.totalScore < 30);
    } else if (activeFilter === 'step_free') {
      list = list.filter(r => r.route.wheelchairAccessible && r.route.isLowFloor);
    } else if (activeFilter === 'seats_available') {
      list = list.filter(r => r.route.availableSeats >= 15);
    }

    return list;
  }, [routes, stopsMap, activeProfile, reports, activeFilter]);

  // Universal Navigation Tab changer with history tracking
  const navigateToTab = (newTab: string) => {
    if (newTab !== activeNavTab) {
      setNavHistory(prev => [...prev, activeNavTab]);
      setActiveNavTab(newTab);
    }
  };

  // Universal Back Press Handler (Requested for every page to return to page before used!)
  const handleUniversalBackPress = () => {
    // 1. If any modal is open, back press dismisses it
    if (selectedRouteForSeat) {
      setSelectedRouteForSeat(null);
      return;
    }
    if (isETMModalOpen) {
      setIsETMModalOpen(false);
      return;
    }
    if (isReportModalOpen) {
      setIsReportModalOpen(false);
      return;
    }
    if (isBacktestModalOpen) {
      setIsBacktestModalOpen(false);
      return;
    }
    if (isAIAssistantOpen) {
      setIsAIAssistantOpen(false);
      return;
    }
    if (inspectedStop) {
      setInspectedStop(null);
      return;
    }
    if (isEditProfileOpen) {
      setIsEditProfileOpen(false);
      return;
    }

    // 2. If inside a sub-tab, return to the previous page in history
    if (navHistory.length > 0) {
      const prevTab = navHistory[navHistory.length - 1];
      setNavHistory(prev => prev.slice(0, -1));
      setActiveNavTab(prevTab);
    } else if (activeNavTab !== 'buses') {
      setActiveNavTab('buses');
    }
  };

  // Detect browser live GPS position
  const handleDetectBrowserLocation = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCustomerLocation({
            stopId: 'stop-majestic',
            locationName: 'Live Device GPS Fix (Bengaluru Urban)',
            landmark: `Coordinates: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: Math.round(pos.coords.accuracy || 5),
            isLiveGps: true,
          });
        },
        (err) => {
          console.warn('Geolocation error or permission prompt cancelled', err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // High contrast sync
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Save passenger to localStorage
  const handleSavePassenger = (user: PassengerUser) => {
    setPassenger(user);
    try {
      localStorage.setItem('transitshield_user', JSON.stringify(user));
    } catch (e) {
      // ignore
    }
    setIsEditProfileOpen(false);

    if (voiceEnabled) {
      const strings = LOCALIZED_VOICE_GUIDANCE[language];
      const welcome = `${strings.greeting} ${user.name}`;
      TransitVoiceSynthesizer.speak(welcome, language);
    }
  };

  // Fetch initial network state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const response = await fetch('/api/network');
        if (response.ok) {
          const data = await response.json();
          if (data.stops) setStops(data.stops);
          if (data.routes) setRoutes(data.routes);
          if (data.reports) setReports(data.reports);
          if (data.busyTimes) setBusyTimes(data.busyTimes);
          if (data.backtestSummary) setBacktestSummary(data.backtestSummary);
        }
      } catch (err) {
        console.warn('Network state fetch fallback to local seed data:', err);
      }
    };
    fetchState();
  }, []);

  // Physical Bus Stop QR Scan Handler (Triggered via smartphone camera URL or evaluator test)
  const triggerPhysicalQrCheckin = (stopIdOrCode: string) => {
    const matched = stops.find(
      s => s.id === stopIdOrCode || s.code.toLowerCase() === stopIdOrCode.toLowerCase()
    );
    if (matched) {
      setFromStopId(matched.id);
      setCustomerLocation({
        stopId: matched.id,
        locationName: matched.name,
        landmark: `${matched.locality} · Physical Bus Stop QR Verified`,
        latitude: 12.9716,
        longitude: 77.5946,
        accuracyMeters: 2,
        isLiveGps: true,
      });
      setPhysicalQrBanner({
        stopName: matched.name,
        stopCode: matched.code,
        locality: matched.locality,
        stepFree: matched.accessibility.status === 'step_free',
      });

      // Update URL query param cleanly without page reload
      try {
        const newUrl = `${window.location.pathname}?stop=${matched.id}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      } catch (e) {
        // ignore
      }
    }
  };

  // On mount: check if app was opened via physical QR code scanned at bus stop (e.g. ?stop=stop-ecospace)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const stopParam = params.get('stop') || params.get('qr') || params.get('stop_code');
    if (stopParam && stops.length > 0) {
      triggerPhysicalQrCheckin(stopParam);
    }
  }, [stops]);

  // Handle Report Feedback
  const handleReportSubmitted = (result: any) => {
    if (result.stops) setStops(result.stops);
    if (result.routes) setRoutes(result.routes);
    if (result.report) setReports(prev => [result.report, ...prev]);
  };

  // Handle upvoting
  const handleUpvoteReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/upvote`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setReports(prev =>
          prev.map(r => (r.id === reportId ? { ...r, upvotes: data.upvotes } : r))
        );
      }
    } catch (err) {
      console.error('Failed to upvote report', err);
    }
  };

  // FIRST TURN CONDITION: If passenger is not registered, show the login onboarding screen!
  if (!passenger.isRegistered) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
        <header className="border-b border-emerald-800/80 bg-emerald-950 py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-emerald-800 flex items-center justify-center font-bold shadow-md">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black font-mono text-white tracking-tight">
                {t.appTitle}
              </h1>
              <p className="text-xs text-emerald-200/80">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Language Switcher on Login Page */}
          <div className="flex items-center bg-emerald-900 rounded-lg p-0.5 border border-emerald-700 text-xs">
            {(['en', 'hi', 'kn'] as SupportedLanguage[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded font-bold transition ${
                  language === lang
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'ಕನ್ನಡ'}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <PassengerLoginScreen
            initialUser={passenger}
            language={language}
            onLoginComplete={handleSavePassenger}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* RedBus-Green Header Bar (No back button in task bar; Customer Specific Location & Toolbar) */}
      <Header
        currentProfile={currentProfileId}
        onSelectProfile={(pId) => {
          setPassenger(prev => ({ ...prev, commuterProfileId: pId }));
        }}
        passenger={passenger}
        onEditPassenger={() => setIsEditProfileOpen(true)}
        customerLocation={customerLocation}
        onDetectLocation={handleDetectBrowserLocation}
        language={language}
        onSelectLanguage={setLanguage}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(!highContrast)}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        activeNavTab={activeNavTab}
        onSelectNavTab={navigateToTab}
        onOpenBacktest={() => setIsBacktestModalOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenETM={() => setIsETMModalOpen(true)}
        onOpenGpsTracker={() => navigateToTab('gps_tracker')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Universal Back Button Toolbar on sub-pages (Dedicated in-page back button with customer location) */}
        {activeNavTab !== 'buses' && (
          <div className="mb-4 flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
            <button
              onClick={handleUniversalBackPress}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 shadow-sm transition"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back to Previous Screen</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-xs">{customerLocation.locationName}</span>
            </div>
          </div>
        )}

        {/* Physical Bus Stop QR Scan Verified Banner (When opened by scanning bus stop QR code) */}
        {physicalQrBanner && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-100 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500 text-slate-950 font-black shrink-0">
                📱 QR
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-sm">Opened via Physical Bus Stop QR Code</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-mono font-bold">
                    Platform Check-In Verified
                  </span>
                </div>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Signboard at <strong className="text-white">{physicalQrBanner.stopName} ({physicalQrBanner.stopCode})</strong> in {physicalQrBanner.locality} · {physicalQrBanner.stepFree ? '✓ Step-Free Ramp & Kneeling Bay Available' : '⚠️ Note: Curb step present'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setPhysicalQrBanner(null)}
              className="self-end sm:self-auto px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Physical QR Scan Simulation Bar for Evaluators */}
        <div className="mb-4 bg-slate-900/90 border border-emerald-800/60 rounded-xl px-3.5 py-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
              Evaluator Demo
            </span>
            <span className="font-medium text-slate-200">
              Simulate Smartphone Scanning Physical QR Signboard at Stop:
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] w-full md:w-auto">
            <button
              onClick={() => triggerPhysicalQrCheckin('stop-majestic')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-800 text-slate-200 hover:text-white border border-slate-700 whitespace-nowrap transition font-semibold"
            >
              MAJ-01 Majestic
            </button>
            <button
              onClick={() => triggerPhysicalQrCheckin('stop-ecospace')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-800 text-slate-200 hover:text-white border border-slate-700 whitespace-nowrap transition font-semibold"
            >
              ECO-19 EcoSpace
            </button>
            <button
              onClick={() => triggerPhysicalQrCheckin('stop-indiranagar')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-800 text-slate-200 hover:text-white border border-slate-700 whitespace-nowrap transition font-semibold"
            >
              IND-12 Indiranagar
            </button>
            <button
              onClick={() => triggerPhysicalQrCheckin('stop-whitefield')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-800 text-slate-200 hover:text-white border border-slate-700 whitespace-nowrap transition font-semibold"
            >
              WHT-07 Whitefield
            </button>
          </div>
        </div>

        {/* Recent Ticket Issued Toast Banner */}
        {lastIssuedTicket && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500 flex items-center justify-between text-xs text-emerald-100 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white">Ticket Issued &amp; Saved in Database: </span>
                <span className="font-mono text-emerald-300">{lastIssuedTicket.ticketNumber}</span>
                <span className="text-slate-400"> · Seat {lastIssuedTicket.seatNumber} ({lastIssuedTicket.passengerType})</span>
              </div>
            </div>
            <button
              onClick={() => setIsETMModalOpen(true)}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              View in ETM
            </button>
          </div>
        )}

        {/* TAB 1: Find Buses (RedBus style bus listings) */}
        {activeNavTab === 'buses' && (
          <>
            {/* RedBus Hero Search Card with Customer Location sync */}
            <RedBusHeroSearch
              stops={stops}
              passenger={passenger}
              customerLocation={customerLocation}
              language={language}
              fromStopId={fromStopId}
              toStopId={toStopId}
              onFromStopChange={setFromStopId}
              onToStopChange={setToStopId}
              onSearch={() => {
                navigateToTab('buses');
              }}
              onEditPassenger={() => setIsEditProfileOpen(true)}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 cols: Ranked Bus Cards */}
              <div className="lg:col-span-7 space-y-6">
                <RiskMatrixBanner profile={activeProfile} />

                <RouteList
                  rankedRoutes={rankedRoutes}
                  profile={activeProfile}
                  passenger={passenger}
                  stopsMap={stopsMap}
                  language={language}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={setSelectedRouteId}
                  onOpenSeatLayout={(r) => setSelectedRouteForSeat(r)}
                  onOpenETMForRoute={(r) => {
                    setSelectedRouteId(r.id);
                    setIsETMModalOpen(true);
                  }}
                />
              </div>

              {/* Right 5 cols: Live Schematic Map & Busy Times */}
              <div className="lg:col-span-5 space-y-6">
                <SchematicMap
                  stops={stops}
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  onSelectStop={(stop) => setInspectedStop(stop)}
                />

                <BusyTimesChart busyTimes={busyTimes} />

                {/* GPS Tracker Callout Card */}
                <div className="bg-slate-900 border border-emerald-800/80 rounded-2xl p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                      <Navigation className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Live ETM GPS Fleet Tracker</h4>
                      <p className="text-slate-400 text-[11px]">Track real-time bus locations &amp; distance from you</p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigateToTab('gps_tracker')}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                  >
                    Open Tracker
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: Dedicated Live ETM GPS Fleet & Commuter Location Tracker Tool */}
        {activeNavTab === 'gps_tracker' && (
          <LiveGpsTrackerTool
            customerLocation={customerLocation}
            onUpdateCustomerLocation={setCustomerLocation}
            stops={stops}
            language={language}
            onBack={handleUniversalBackPress}
          />
        )}

        {/* TAB 3: Live Schematic Transit Map */}
        {activeNavTab === 'live_map' && (
          <div className="space-y-6">
            <SchematicMap
              stops={stops}
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectStop={(stop) => setInspectedStop(stop)}
            />
          </div>
        )}

        {/* TAB 4: Busy Times Forecast */}
        {activeNavTab === 'busy_times' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <BusyTimesChart busyTimes={busyTimes} />
          </div>
        )}

        {/* TAB 5 & 6: Conductor ETM Machine & Evaluator DB */}
        {(activeNavTab === 'etm_showcase' || activeNavTab === 'evaluator_db') && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-emerald-800 rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Printer className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Electronic Ticketing Machine (ETM) &amp; Evaluators Database
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Dedicated conductor POS simulation with thermal ticket printing, QR verification, real-time seat occupancy database (Free vs Booked), and live GPS tracking.
              </p>
              <button
                onClick={() => setIsETMModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/40 transition"
              >
                Launch Handheld ETM Simulator
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: Community Alerts */}
        {activeNavTab === 'reports' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Live Community Reports &amp; Road Obstacles</span>
              </h3>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
              >
                File New Report
              </button>
            </div>

            <div className="space-y-3">
              {reports.map(rep => (
                <div
                  key={rep.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{rep.stopName}</span>
                      {rep.routeNumber && (
                        <span className="font-mono text-emerald-400">({rep.routeNumber})</span>
                      )}
                    </div>
                    <p className="text-slate-300">{rep.notes}</p>
                  </div>
                  <button
                    onClick={() => handleUpvoteReport(rep.id)}
                    className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs flex items-center gap-1 shrink-0"
                  >
                    <span>👍</span>
                    <span>{rep.upvotes}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* RedBus-Green Footer */}
      <footer className="border-t border-emerald-950 bg-slate-950 py-4 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-mono">TRANSITSHIELD GREEN</span>
            <span>· RedBus-Style Smart &amp; Accessible Public Transit System</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => navigateToTab('gps_tracker')}
              className="text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>GPS Fleet Tracker</span>
            </button>
            <span className="text-slate-800">·</span>
            <button
              onClick={() => setIsETMModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 transition"
            >
              ETM Machine (Showcase)
            </button>
            <span className="text-slate-800">·</span>
            <button
              onClick={() => setIsBacktestModalOpen(true)}
              className="text-slate-300 hover:text-white transition"
            >
              Slide 7 Back-Testing
            </button>
          </div>
        </div>
      </footer>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <PassengerLoginScreen
          initialUser={passenger}
          language={language}
          isModal={true}
          onCancel={() => setIsEditProfileOpen(false)}
          onLoginComplete={handleSavePassenger}
        />
      )}

      {/* RedBus Seat Layout Selection Modal */}
      {selectedRouteForSeat && (
        <SeatLayoutModal
          isOpen={Boolean(selectedRouteForSeat)}
          onClose={() => setSelectedRouteForSeat(null)}
          route={selectedRouteForSeat}
          passenger={passenger}
          language={language}
          onSeatBooked={(ticket) => {
            setLastIssuedTicket(ticket);
            setIsETMModalOpen(true);
          }}
        />
      )}

      {/* ETM Conductor Machine & Evaluator Database Modal (Includes Seat Free/Booked DB & Live GPS) */}
      <ETMMachineModal
        isOpen={isETMModalOpen}
        onClose={() => setIsETMModalOpen(false)}
        routes={routes}
        stops={stops}
        passenger={passenger}
        language={language}
        selectedRouteId={selectedRouteId}
        onTicketIssued={(ticket) => {
          setLastIssuedTicket(ticket);
        }}
      />

      {/* Community Report Modal */}
      <CommunityReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        stops={stops}
        routes={routes}
        reports={reports}
        initialStop={inspectedStop}
        onReportSubmitted={handleReportSubmitted}
        onUpvoteReport={handleUpvoteReport}
      />

      {/* Backtest Evaluation Modal */}
      <BacktestEvaluationModal
        isOpen={isBacktestModalOpen}
        onClose={() => setIsBacktestModalOpen(false)}
        summary={backtestSummary}
        trips={backtestTrips}
      />

      {/* Stop Details Inspector */}
      <StopDetailsModal
        stop={inspectedStop}
        onClose={() => setInspectedStop(null)}
        onSelectDeparture={(s) => setFromStopId(s.id)}
        onSelectDestination={(s) => setToStopId(s.id)}
        onSetLocation={(s) => {
          setCustomerLocation({
            stopId: s.id,
            locationName: s.name,
            landmark: `${s.locality} · Selected by commuter`,
            latitude: 12.9716,
            longitude: 77.5946,
            accuracyMeters: 5,
            isLiveGps: true,
          });
        }}
        onReportIssue={(s) => {
          setInspectedStop(s);
          setIsReportModalOpen(true);
        }}
        reports={reports}
      />

      {/* Gemini AI Advisor */}
      <AIAssistantDrawer
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        profile={activeProfile}
        language={language}
        routes={routes}
        onSelectRoute={(id) => setSelectedRouteId(id)}
      />
    </div>
  );
}
