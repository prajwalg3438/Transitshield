import React, { useState, useEffect } from 'react';
import {
  TransitRoute,
  TransitStop,
  ETMTicket,
  PassengerUser,
  ETMPassengerType,
  ETMSeat,
} from '../types/transit';
import { TRANSLATIONS } from '../services/i18n';
import { SupportedLanguage } from '../services/speechService';
import {
  Printer,
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  BatteryCharging,
  Wifi,
  Database,
  RefreshCw,
  Search,
  X,
  Ticket,
  Users,
  AlertTriangle,
  Armchair,
  Compass,
  ArrowLeft,
  Navigation,
} from 'lucide-react';

interface ETMMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: TransitRoute[];
  stops: TransitStop[];
  passenger: PassengerUser;
  language: SupportedLanguage;
  selectedRouteId?: string | null;
  onTicketIssued?: (ticket: ETMTicket) => void;
}

export const ETMMachineModal: React.FC<ETMMachineModalProps> = ({
  isOpen,
  onClose,
  routes,
  stops,
  passenger,
  language,
  selectedRouteId,
  onTicketIssued,
}) => {
  const t = TRANSLATIONS[language];

  // Active view: 'terminal' | 'seats' | 'database'
  const [activeTab, setActiveTab] = useState<'terminal' | 'seats' | 'database'>('terminal');

  // Terminal state
  const [activeRouteId, setActiveRouteId] = useState<string>(selectedRouteId || routes[0]?.id || '');
  const [fromStopName, setFromStopName] = useState<string>(stops[0]?.name || 'Majestic Central Interchange');
  const [toStopName, setToStopName] = useState<string>(stops[3]?.name || 'EcoSpace Tech Gateway');
  const [passengerName, setPassengerName] = useState<string>(passenger.name || 'Commuter');
  const [passengerType, setPassengerType] = useState<ETMPassengerType>(
    passenger.specialPerson === 'wheelchair'
      ? 'Special Person / Disabled'
      : passenger.specialPerson === 'elderly'
      ? 'Senior Citizen'
      : 'General'
  );
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'SMART_CARD' | 'UPI_QR'>('UPI_QR');
  const [seatNumber, setSeatNumber] = useState<string>('08A (Window)');

  // Printing & feedback state
  const [isPrinting, setIsPrinting] = useState(false);
  const [printedTicket, setPrintedTicket] = useState<ETMTicket | null>(null);

  // Evaluator Database state
  const [ticketsList, setTicketsList] = useState<ETMTicket[]>([]);
  const [dbStats, setDbStats] = useState({
    totalTickets: 3,
    totalRevenue: 53,
    specialPassengers: 2,
  });
  const [evaluatorSearch, setEvaluatorSearch] = useState('');
  const [verifyInput, setVerifyInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    valid?: boolean;
    message?: string;
    ticket?: ETMTicket;
  } | null>(null);

  // Seat Occupancy Database state (Free vs Booked)
  const [seatDatabase, setSeatDatabase] = useState<ETMSeat[]>([]);
  const [seatStats, setSeatStats] = useState({ total: 21, free: 19, booked: 2 });
  const [seatSearch, setSeatSearch] = useState('');

  // Live ETM GPS Telemetry state
  const [liveGps, setLiveGps] = useState({
    lat: 12.9734,
    lng: 77.6085,
    speed: 34,
    sats: 10,
    heading: '88° E',
    currentLocation: 'MG Road Trinity Junction',
    nextStop: 'Indiranagar 100ft Junction',
    distMeters: 1420,
  });

  const activeRoute = routes.find(r => r.id === activeRouteId) || routes[0];

  // Dynamic fare with concession
  const baseFare = activeRoute?.fare || 28;
  let finalFare = baseFare;
  let discount = 0;
  if (passengerType === 'Special Person / Disabled') {
    finalFare = 5;
    discount = baseFare - 5;
  } else if (passengerType === 'Senior Citizen') {
    finalFare = Math.round(baseFare * 0.5);
    discount = baseFare - finalFare;
  } else if (passengerType === 'Student') {
    finalFare = 10;
    discount = baseFare - 10;
  }

  // Fetch Tickets from Database
  const fetchTicketsFromDatabase = async () => {
    try {
      const res = await fetch('/api/etm/tickets');
      if (res.ok) {
        const data = await res.json();
        if (data.tickets) setTicketsList(data.tickets);
        if (data.stats) {
          setDbStats({
            totalTickets: data.stats.totalTickets,
            totalRevenue: data.stats.totalRevenue,
            specialPassengers: data.stats.specialPassengers,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch ETM tickets:', err);
    }
  };

  // Fetch Live Seat Occupancy Database (Free vs Booked)
  const fetchSeatsFromDatabase = async (routeId: string) => {
    try {
      const res = await fetch(`/api/etm/seats/${routeId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.seats) {
          setSeatDatabase(data.seats);
          setSeatStats({
            total: data.totalCapacity || data.seats.length,
            free: data.freeSeatsCount,
            booked: data.bookedSeatsCount,
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load seats database', e);
    }
  };

  // Fetch Live GPS Telemetry
  const fetchGpsTelemetry = async () => {
    try {
      const res = await fetch('/api/etm/gps');
      if (res.ok) {
        const data = await res.json();
        if (data.fleet && data.fleet.length > 0) {
          const match = data.fleet.find((b: any) => b.routeId === activeRouteId) || data.fleet[0];
          setLiveGps({
            lat: match.latitude,
            lng: match.longitude,
            speed: match.speedKmH,
            sats: match.satelliteLock,
            heading: `${match.heading}°`,
            currentLocation: match.currentLocationName,
            nextStop: match.nextStopName,
            distMeters: match.distanceToNextStopMeters,
          });
        }
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTicketsFromDatabase();
      fetchSeatsFromDatabase(activeRouteId);
      fetchGpsTelemetry();

      if (passenger.name) setPassengerName(passenger.name);
      if (passenger.specialPerson === 'wheelchair') {
        setPassengerType('Special Person / Disabled');
        setSeatNumber('W-01 (Priority Bay)');
      } else if (passenger.specialPerson === 'elderly') {
        setPassengerType('Senior Citizen');
        setSeatNumber('S-02 (Senior Reserved)');
      }
    }
  }, [isOpen, activeRouteId, passenger]);

  if (!isOpen) return null;

  // Handle printing new ticket
  const handleIssueAndPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPrinting(true);
    setPrintedTicket(null);

    try {
      const res = await fetch('/api/etm/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: activeRoute.id,
          fromStopName,
          toStopName,
          passengerName,
          passengerType,
          seatNumber,
          fareAmount: finalFare,
          discountApplied: discount,
          paymentMode,
          riskScoreAtIssue: activeRoute.reliabilityScore || 18,
          isStepFreeVerified: activeRoute.wheelchairAccessible,
        }),
      });

      const data = await res.json();
      if (data.success && data.ticket) {
        setPrintedTicket(data.ticket);
        fetchTicketsFromDatabase();
        fetchSeatsFromDatabase(activeRoute.id);
        if (onTicketIssued) onTicketIssued(data.ticket);
      }
    } catch (err) {
      console.error('Error generating ETM ticket:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Toggle seat state directly in database
  const handleToggleSeat = async (sNumber: string) => {
    try {
      const res = await fetch('/api/etm/seats/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: activeRouteId,
          seatNumber: sNumber,
          passengerName: passenger.name || 'Conductor Direct Booking',
          passengerCategory: passengerType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSeatsFromDatabase(activeRouteId);
      }
    } catch (e) {
      console.error('Failed to toggle seat', e);
    }
  };

  // Evaluator verification
  const handleVerifyTicket = async () => {
    if (!verifyInput.trim()) return;
    try {
      const res = await fetch('/api/etm/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: verifyInput.trim() }),
      });
      const data = await res.json();
      setVerificationResult(data);
      fetchTicketsFromDatabase();
    } catch (err) {
      console.error('Failed to verify ticket', err);
    }
  };

  // Reset database for evaluators showcase
  const handleResetDB = async () => {
    try {
      await fetch('/api/etm/reset', { method: 'POST' });
      fetchTicketsFromDatabase();
      fetchSeatsFromDatabase(activeRouteId);
      setVerificationResult(null);
    } catch (err) {
      console.error('Failed to reset ETM database', err);
    }
  };

  const filteredTickets = ticketsList.filter(t =>
    t.ticketNumber.toLowerCase().includes(evaluatorSearch.toLowerCase()) ||
    t.passengerName.toLowerCase().includes(evaluatorSearch.toLowerCase()) ||
    t.passengerType.toLowerCase().includes(evaluatorSearch.toLowerCase())
  );

  const filteredSeats = seatDatabase.filter(s =>
    s.seatNumber.toLowerCase().includes(seatSearch.toLowerCase()) ||
    (s.passengerName && s.passengerName.toLowerCase().includes(seatSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-emerald-800 rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Top Bar with Prominent Back Button */}
        <div className="bg-linear-to-r from-emerald-950 via-slate-900 to-slate-900 p-3.5 sm:p-4 border-b border-emerald-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 shadow-sm transition"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {t.etmTitle}
                  </h3>
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                    BMTC POS + GPS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{t.etmSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 3 Sub-Tabs: Terminal / Seat Occupancy DB / Tickets DB */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'terminal'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Conductor Machine
              </button>
              <button
                onClick={() => setActiveTab('seats')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
                  activeTab === 'seats'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Armchair className="w-3.5 h-3.5" />
                <span>Seat DB ({seatStats.free} Free)</span>
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
                  activeTab === 'database'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Tickets DB ({ticketsList.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: Handheld ETM Hardware Machine with Live GPS Telemetry */}
          {activeTab === 'terminal' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Handheld Device Casing */}
              <div className="lg:col-span-7 bg-slate-950 border-4 border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl relative">
                {/* Hardware Header with GPS Status */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>POS ID: BMTC-ETM-908</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Navigation className="w-3 h-3" /> GPS LOCKED ({liveGps.sats} SATS)
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <BatteryCharging className="w-3 h-3" /> 94%
                    </span>
                  </div>
                </div>

                {/* Built-in LCD Display with GPS Telemetry */}
                <div className="my-4 bg-emerald-950/90 border-2 border-emerald-700/70 rounded-xl p-4 font-mono text-emerald-300 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between text-xs font-bold border-b border-emerald-800/80 pb-1.5">
                    <span>* BMTC SMART ETM v4.2 *</span>
                    <span className="text-[10px] text-emerald-400">4G NAVIC OK</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-emerald-500 text-[9px] block">BUS LINE:</span>
                      <span className="font-bold text-white text-xs">{activeRoute.routeNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-500 text-[9px] block">FARE AMOUNT:</span>
                      <span className="font-bold text-emerald-200 text-sm">₹{finalFare}</span>
                    </div>
                  </div>

                  {/* Built-in GPS Tracker Telemetry readout on LCD */}
                  <div className="bg-emerald-900/40 p-2 rounded border border-emerald-800/80 text-[10px] space-y-1">
                    <div className="flex items-center justify-between font-bold text-emerald-200">
                      <span>GPS: {liveGps.lat.toFixed(4)}°N, {liveGps.lng.toFixed(4)}°E</span>
                      <span className="text-emerald-300">{liveGps.speed} KM/H · {liveGps.heading}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="truncate max-w-[180px]">AT: {liveGps.currentLocation}</span>
                      <span>NEXT: {liveGps.nextStop} ({liveGps.distMeters}m)</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-400/90 pt-1 border-t border-emerald-800/60 flex items-center justify-between">
                    <span>PASSENGER: {passengerName.slice(0, 16)}</span>
                    <span className="font-bold uppercase text-[10px] bg-emerald-900 px-1.5 py-0.2 rounded">
                      {passengerType}
                    </span>
                  </div>
                </div>

                {/* Conductor Form */}
                <form onSubmit={handleIssueAndPrint} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Bus Route:
                      </label>
                      <select
                        value={activeRouteId}
                        onChange={(e) => {
                          setActiveRouteId(e.target.value);
                          fetchSeatsFromDatabase(e.target.value);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs focus:ring-1 focus:ring-emerald-500"
                      >
                        {routes.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.routeNumber}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Passenger Category:
                      </label>
                      <select
                        value={passengerType}
                        onChange={(e) => setPassengerType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs focus:ring-1 focus:ring-emerald-500 font-bold"
                      >
                        <option value="General">General (Full Fare)</option>
                        <option value="Special Person / Disabled">Special Person / Disabled (₹5)</option>
                        <option value="Senior Citizen">Senior Citizen (50% Off)</option>
                        <option value="Student">Student Concession (₹10)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Passenger Name:
                      </label>
                      <input
                        type="text"
                        value={passengerName}
                        onChange={(e) => setPassengerName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        Seat Assignment:
                      </label>
                      <input
                        type="text"
                        value={seatNumber}
                        onChange={(e) => setSeatNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Payment Mode:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['UPI_QR', 'SMART_CARD', 'CASH'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPaymentMode(mode)}
                          className={`py-2 px-2 rounded-lg font-semibold text-[11px] border transition ${
                            paymentMode === mode
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {mode === 'UPI_QR' ? 'UPI QR' : mode === 'SMART_CARD' ? 'Smart Card' : 'Cash'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPrinting}
                    className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/40 transition disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isPrinting ? 'Dispensing Ticket...' : t.etmPrintTicket}</span>
                  </button>
                </form>
              </div>

              {/* Thermal Output Ticket */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-emerald-400" />
                  <span>Physical Thermal Roll Output</span>
                </div>

                {printedTicket ? (
                  <div className="w-full max-w-xs bg-amber-50 text-slate-900 p-4 rounded-t-lg rounded-b-md shadow-2xl font-mono text-[11px] border-t-8 border-dashed border-slate-700 relative animate-in slide-in-from-top-4 duration-500">
                    <div className="text-center pb-2 border-b-2 border-dashed border-slate-400 space-y-0.5">
                      <div className="font-extrabold text-xs tracking-wider">BMTC TRANSITSHIELD</div>
                      <div className="text-[10px] text-slate-600">SMART ETM TICKET</div>
                      <div className="text-[10px] text-slate-700 font-bold">{printedTicket.ticketNumber}</div>
                    </div>

                    <div className="py-2.5 space-y-1.5 border-b-2 border-dashed border-slate-400 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">LINE:</span>
                        <span className="font-bold">{printedTicket.routeNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">PASSENGER:</span>
                        <span className="font-bold">{printedTicket.passengerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">CATEGORY:</span>
                        <span className="font-bold text-emerald-800">{printedTicket.passengerType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">SEAT NUMBER:</span>
                        <span className="font-bold">{printedTicket.seatNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">STEP-FREE:</span>
                        <span className="font-bold text-emerald-700">
                          {printedTicket.isStepFreeVerified ? 'VERIFIED (YES)' : 'STANDARD'}
                        </span>
                      </div>
                    </div>

                    <div className="py-2 flex justify-between items-baseline border-b-2 border-dashed border-slate-400">
                      <span className="font-bold text-xs">FARE PAID:</span>
                      <span className="font-extrabold text-base text-emerald-800">₹{printedTicket.fareAmount}</span>
                    </div>

                    <div className="pt-3 pb-1 flex flex-col items-center gap-1 text-center">
                      <div className="w-20 h-20 bg-white p-1 border border-slate-300 rounded shadow-xs flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-slate-900" />
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {printedTicket.qrVerificationHash}
                      </div>
                      <div className="text-[9px] text-emerald-800 font-bold">
                        RISK SCORE AT ISSUE: {printedTicket.riskScoreAtIssue}/100
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-xs h-64 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                    <Printer className="w-8 h-8 text-slate-600 mb-2" />
                    <p>Press "ISSUE &amp; PRINT TICKET" to test live thermal printing.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Live Seat Occupancy Database (Shows whether seats are FREE or NOT) */}
          {activeTab === 'seats' && (
            <div className="space-y-5 text-xs">
              {/* Seat Availability KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">Total Bus Capacity</span>
                  <div className="text-2xl font-black font-mono text-white mt-1">
                    {seatStats.total} Seats
                  </div>
                  <span className="text-[10px] text-slate-500">Configured in ETM database</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-800/80">
                  <span className="text-emerald-400 text-[11px] block font-semibold">Free / Available Seats</span>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                    {seatStats.free} Free
                  </div>
                  <span className="text-[10px] text-emerald-300">Ready for instant allocation</span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-rose-900/60">
                  <span className="text-rose-400 text-[11px] block font-semibold">Occupied / Booked Seats</span>
                  <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                    {seatStats.booked} Occupied
                  </div>
                  <span className="text-[10px] text-rose-300">Assigned tickets verified</span>
                </div>
              </div>

              {/* Seat Grid View */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <Armchair className="w-4 h-4 text-emerald-400" />
                      <span>Live Seat Occupancy Manifest: {activeRoute.routeNumber}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Shows whether each individual seat is Free or Booked in real time. Click any seat to toggle status.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={seatSearch}
                      onChange={(e) => setSeatSearch(e.target.value)}
                      placeholder="Filter seat #..."
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <button
                      onClick={() => fetchSeatsFromDatabase(activeRouteId)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Grid of Seats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2">
                  {filteredSeats.map(seat => {
                    return (
                      <div
                        key={seat.seatNumber}
                        onClick={() => handleToggleSeat(seat.seatNumber)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition ${
                          seat.isFree
                            ? 'bg-emerald-950/30 border-emerald-700/80 hover:bg-emerald-950/60'
                            : 'bg-rose-950/30 border-rose-700/80 hover:bg-rose-950/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-sm text-white">
                            {seat.seatNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                              seat.isFree
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {seat.isFree ? 'FREE' : 'BOOKED'}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-300 truncate">
                          {seat.isFree ? (
                            <span className="text-emerald-400">Available to tap &amp; book</span>
                          ) : (
                            <span className="text-rose-300 font-medium truncate block">
                              {seat.passengerName || 'Occupied'}
                            </span>
                          )}
                        </div>

                        {seat.ticketNumber && (
                          <div className="text-[9px] font-mono text-slate-400 truncate">
                            {seat.ticketNumber}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Evaluators Tickets Manifest Database */}
          {activeTab === 'database' && (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">{t.etmTotalTickets}</span>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                    {dbStats.totalTickets}
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">{t.etmTotalRevenue}</span>
                  <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
                    ₹{dbStats.totalRevenue}
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">{t.etmSpecialPassengers}</span>
                  <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                    {dbStats.specialPassengers}
                  </div>
                </div>
              </div>

              {/* QR Validator */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Evaluator Live Ticket Validator (Simulate Bus Boarding QR Scan)</span>
                  </span>
                  <button
                    onClick={handleResetDB}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t.etmResetDB}</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verifyInput}
                    onChange={(e) => setVerifyInput(e.target.value)}
                    placeholder="Enter Ticket # (e.g. BMTC-849201) or QR Hash..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleVerifyTicket}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                  >
                    Verify QR
                  </button>
                </div>

                {verificationResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      verificationResult.valid
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-700 text-rose-200'
                    }`}
                  >
                    {verificationResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{verificationResult.message}</span>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-mono">
                    <tr>
                      <th className="p-2.5">Ticket #</th>
                      <th className="p-2.5">Passenger</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Route</th>
                      <th className="p-2.5">Seat</th>
                      <th className="p-2.5">Fare</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTickets.map(tk => (
                      <tr key={tk.id} className="hover:bg-slate-900/60">
                        <td className="p-2.5 font-mono font-bold text-emerald-400">{tk.ticketNumber}</td>
                        <td className="p-2.5 text-white font-medium">{tk.passengerName}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              tk.passengerType !== 'General'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {tk.passengerType}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-slate-300">{tk.routeNumber}</td>
                        <td className="p-2.5 font-mono">{tk.seatNumber}</td>
                        <td className="p-2.5 font-bold font-mono text-emerald-300">₹{tk.fareAmount}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              tk.status === 'BOARDED'
                                ? 'bg-cyan-950 text-cyan-300'
                                : 'bg-emerald-950 text-emerald-300'
                            }`}
                          >
                            {tk.status}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <button
                            onClick={() => {
                              setVerifyInput(tk.qrVerificationHash);
                              handleVerifyTicket();
                            }}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                          >
                            Test Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
