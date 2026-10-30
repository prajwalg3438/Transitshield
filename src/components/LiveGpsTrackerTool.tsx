import React, { useState, useEffect } from 'react';
import { ETMGpsTelemetry, CustomerLocation, TransitStop } from '../types/transit';
import { TRANSLATIONS } from '../services/i18n';
import { SupportedLanguage } from '../services/speechService';
import {
  Navigation,
  MapPin,
  Compass,
  Radio,
  Wifi,
  Satellite,
  Gauge,
  Clock,
  ArrowLeft,
  RefreshCw,
  LocateFixed,
  Bus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface LiveGpsTrackerToolProps {
  customerLocation: CustomerLocation;
  onUpdateCustomerLocation: (loc: CustomerLocation) => void;
  stops: TransitStop[];
  language: SupportedLanguage;
  onBack: () => void;
}

export const LiveGpsTrackerTool: React.FC<LiveGpsTrackerToolProps> = ({
  customerLocation,
  onUpdateCustomerLocation,
  stops,
  language,
  onBack,
}) => {
  const [fleet, setFleet] = useState<ETMGpsTelemetry[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('BUS-KA-01-F-3351');
  const [isLocating, setIsLocating] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  const fetchGpsTelemetry = async () => {
    try {
      const res = await fetch('/api/etm/gps');
      if (res.ok) {
        const data = await res.json();
        if (data.fleet) {
          setFleet(data.fleet);
          setLastRefreshed(new Date().toLocaleTimeString());
        }
      }
    } catch (e) {
      console.warn('GPS telemetry fetch fallback', e);
    }
  };

  useEffect(() => {
    fetchGpsTelemetry();
    const interval = setInterval(fetchGpsTelemetry, 3000); // Live poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Browser Geolocation Detection
  const handleDetectBrowserLocation = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const newLoc: CustomerLocation = {
            stopId: customerLocation.stopId,
            locationName: 'Live Device GPS Fix (Bengaluru Urban)',
            landmark: `Lat: ${pos.coords.latitude.toFixed(4)}°, Long: ${pos.coords.longitude.toFixed(4)}°`,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: Math.round(pos.coords.accuracy || 5),
            isLiveGps: true,
          };
          onUpdateCustomerLocation(newLoc);
        },
        (err) => {
          setIsLocating(false);
          console.warn('Browser geolocation denied/error, keeping stop preset', err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const selectedBus = fleet.find(b => b.busId === selectedBusId) || fleet[0];

  // Calculate approximate distance between customer and selected bus
  const calculateApproxDistanceKm = (busLat: number, busLng: number) => {
    const latDiff = (busLat - customerLocation.latitude) * 111;
    const lngDiff = (busLng - customerLocation.longitude) * 111 * Math.cos(customerLocation.latitude * (Math.PI / 180));
    const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    return Math.max(0.2, dist).toFixed(1);
  };

  return (
    <div className="space-y-5">
      {/* Universal Page Header with Prominent Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-emerald-800/80 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 shadow-md transition transform active:scale-95"
            title="Return to previous screen"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Navigation className="w-5 h-5 text-emerald-400" />
                <span>ETM GPS Fleet &amp; Commuter Location Tracker</span>
              </h2>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                LIVE TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time NavIC/GPS positioning broadcast from conductor ETM handheld machines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={fetchGpsTelemetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Refreshed: {lastRefreshed}</span>
          </button>
        </div>
      </div>

      {/* Persistent Customer Location Banner (Specifically shows customer position) */}
      <div className="bg-linear-to-r from-emerald-950 via-slate-900 to-slate-900 border-2 border-emerald-500/80 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              <MapPin className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Your Current Specific Commuter Location
                </span>
                <span className="text-[10px] font-mono bg-emerald-900/80 text-emerald-200 px-2 py-0.2 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>GPS Precision: ±{customerLocation.accuracyMeters}m</span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {customerLocation.locationName}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono flex-wrap">
                <span>Landmark: <strong className="text-slate-200">{customerLocation.landmark}</strong></span>
                <span>·</span>
                <span>Lat: <strong className="text-emerald-300">{customerLocation.latitude.toFixed(4)}° N</strong></span>
                <span>·</span>
                <span>Long: <strong className="text-emerald-300">{customerLocation.longitude.toFixed(4)}° E</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDetectBrowserLocation}
              disabled={isLocating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-700/30 transition disabled:opacity-50"
            >
              <LocateFixed className="w-4 h-4" />
              <span>{isLocating ? 'Detecting GPS...' : 'Detect Device GPS'}</span>
            </button>

            {/* Change Stop Presets */}
            <select
              value={customerLocation.stopId}
              onChange={(e) => {
                const s = stops.find(stop => stop.id === e.target.value);
                if (s) {
                  onUpdateCustomerLocation({
                    stopId: s.id,
                    locationName: `${s.name} (${s.locality})`,
                    landmark: s.accessibility.details.slice(0, 40),
                    latitude: 12.9716 + (s.coordinates.y * 0.0003),
                    longitude: 77.5946 + (s.coordinates.x * 0.0003),
                    accuracyMeters: 4.5,
                    isLiveGps: true,
                  });
                }
              }}
              className="bg-slate-950 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-emerald-200 font-semibold"
            >
              <option disabled>Switch Location to Stop:</option>
              {stops.map(s => (
                <option key={s.id} value={s.id}>
                  📍 {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main GPS Telemetry Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Live Radar / Tracked Fleet List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Active ETM Tracked Fleet ({fleet.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">NavIC / GPS</span>
          </div>

          <div className="space-y-3">
            {fleet.map(bus => {
              const isSelected = bus.busId === selectedBusId;
              const distToCustomer = calculateApproxDistanceKm(bus.latitude, bus.longitude);

              return (
                <div
                  key={bus.busId}
                  onClick={() => setSelectedBusId(bus.busId)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-xs">{bus.routeNumber}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      {bus.conductorMachineId}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 mb-2 truncate">
                    At: <strong className="text-white">{bus.currentLocationName}</strong>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[9px]">SPEED:</span>
                      <span className="font-bold text-emerald-400">{bus.speedKmH} km/h</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">SATELLITES:</span>
                      <span className="font-bold text-cyan-400">{bus.satelliteLock} Lock</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">FROM YOU:</span>
                      <span className="font-bold text-amber-300">{distToCustomer} km</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Telemetry Cockpit & Radar (7 cols) */}
        {selectedBus && (
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">
                  ETM Live Machine Telemetry
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {selectedBus.operatorName} · {selectedBus.routeNumber}
                </h3>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="text-slate-400 block text-[10px]">VEHICLE ID</span>
                <span className="font-bold text-emerald-400">{selectedBus.busId}</span>
              </div>
            </div>

            {/* Real-time Metrics 4-Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Speed
                </span>
                <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                  {selectedBus.speedKmH} <span className="text-xs font-normal">km/h</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" /> Heading
                </span>
                <div className="text-xl font-black font-mono text-cyan-400 mt-1">
                  {selectedBus.heading}° <span className="text-xs font-normal">East</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Satellite className="w-3.5 h-3.5 text-indigo-400" /> Satellites
                </span>
                <div className="text-xl font-black font-mono text-indigo-400 mt-1">
                  {selectedBus.satelliteLock} <span className="text-xs font-normal">Fixed</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Next Stop
                </span>
                <div className="text-xl font-black font-mono text-amber-400 mt-1">
                  {selectedBus.etaNextStopMinutes} <span className="text-xs font-normal">min</span>
                </div>
              </div>
            </div>

            {/* Live GPS Coordinates Callout */}
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/60 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                <span>RAW GPS SENTENCE &amp; NMEA TELEMETRY</span>
                <span className="text-emerald-400 font-bold">ETM Conductor POS: {selectedBus.conductorMachineId}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">LATITUDE:</span>
                  <span className="text-white font-bold">{selectedBus.latitude.toFixed(6)}° N</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">LONGITUDE:</span>
                  <span className="text-white font-bold">{selectedBus.longitude.toFixed(6)}° E</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Altitude: <strong>{selectedBus.altitudeMeters}m MSL</strong> · Corridor: <strong>Outer Ring Dedicated Transit Lane</strong>
              </div>
            </div>

            {/* Distance to Customer Alert */}
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-600/70 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-emerald-200">
                  This bus is approximately <strong>{calculateApproxDistanceKm(selectedBus.latitude, selectedBus.longitude)} km</strong> from your current position ({customerLocation.locationName}).
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
