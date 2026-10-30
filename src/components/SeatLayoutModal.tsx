import React, { useState } from 'react';
import { TransitRoute, PassengerUser, ETMTicket } from '../types/transit';
import { TRANSLATIONS } from '../services/i18n';
import { SupportedLanguage } from '../services/speechService';
import {
  X,
  Accessibility,
  CheckCircle2,
  Armchair,
  Sparkles,
  Ticket,
} from 'lucide-react';

interface SeatLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: TransitRoute;
  passenger: PassengerUser;
  language: SupportedLanguage;
  onSeatBooked: (ticket: ETMTicket) => void;
}

export const SeatLayoutModal: React.FC<SeatLayoutModalProps> = ({
  isOpen,
  onClose,
  route,
  passenger,
  language,
  onSeatBooked,
}) => {
  const t = TRANSLATIONS[language];
  const [selectedSeat, setSelectedSeat] = useState<string>(
    passenger.specialPerson === 'wheelchair' ? 'W-01' : '04A'
  );
  const [isBooking, setIsBooking] = useState(false);

  if (!isOpen) return null;

  // Base fare calculation with special person concession
  const baseFare = route.fare || 28;
  let finalFare = baseFare;
  let discount = 0;
  if (passenger.specialPerson === 'wheelchair') {
    finalFare = 5;
    discount = baseFare - 5;
  } else if (passenger.specialPerson === 'elderly' || passenger.age >= 60) {
    finalFare = Math.round(baseFare * 0.5);
    discount = baseFare - finalFare;
  }

  // Seat matrix configuration (4 rows x 4 seats = 16 sample seats + 2 wheelchair priority bays)
  const seats = [
    { id: 'W-01', label: 'W-01', isWheelchairBay: true, isBooked: false },
    { id: 'W-02', label: 'W-02', isWheelchairBay: true, isBooked: true },
    { id: 'S-01', label: '01A', isSenior: true, isBooked: false },
    { id: 'S-02', label: '01B', isSenior: true, isBooked: false },
    { id: 'S-03', label: '01C', isSenior: true, isBooked: true },
    { id: 'S-04', label: '01D', isSenior: true, isBooked: false },
    { id: '02A', label: '02A', isBooked: false },
    { id: '02B', label: '02B', isBooked: false },
    { id: '02C', label: '02C', isBooked: true },
    { id: '02D', label: '02D', isBooked: false },
    { id: '03A', label: '03A', isBooked: false },
    { id: '03B', label: '03B', isBooked: true },
    { id: '03C', label: '03C', isBooked: false },
    { id: '03D', label: '03D', isBooked: false },
    { id: '04A', label: '04A', isBooked: false },
    { id: '04B', label: '04B', isBooked: false },
    { id: '04C', label: '04C', isBooked: false },
    { id: '04D', label: '04D', isBooked: true },
  ];

  const handleConfirmBooking = async () => {
    setIsBooking(true);
    try {
      const res = await fetch('/api/etm/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: route.id,
          fromStopName: route.from,
          toStopName: route.to,
          passengerName: passenger.name || 'Commuter',
          passengerAge: passenger.age,
          passengerType:
            passenger.specialPerson === 'wheelchair'
              ? 'Special Person / Disabled'
              : passenger.specialPerson === 'elderly'
              ? 'Senior Citizen'
              : 'General',
          seatNumber: selectedSeat,
          fareAmount: finalFare,
          discountApplied: discount,
          paymentMode: 'UPI_QR',
          riskScoreAtIssue: route.reliabilityScore || 18,
          isStepFreeVerified: route.wheelchairAccessible,
        }),
      });

      const data = await res.json();
      if (data.success && data.ticket) {
        onSeatBooked(data.ticket);
        onClose();
      }
    } catch (err) {
      console.error('Seat booking error:', err);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-emerald-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-emerald-900 to-slate-900 p-4 border-b border-emerald-800/60 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {t.seatSelectTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {route.routeNumber} · {route.operator}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seat Legend */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-around text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-emerald-500 bg-emerald-900/40" />
            <span className="text-slate-300">{t.seatAvailable}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-cyan-500 bg-cyan-900/40" />
            <span className="text-cyan-300">Priority Bay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700" />
            <span className="text-slate-500">{t.seatReserved}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-400" />
            <span className="text-emerald-300 font-bold">{t.seatSelected}</span>
          </div>
        </div>

        {/* Bus Deck Mockup */}
        <div className="p-6 bg-slate-900 flex justify-center">
          <div className="w-72 bg-slate-950 border-2 border-slate-800 rounded-3xl p-4 shadow-inner relative">
            {/* Driver Cabin */}
            <div className="flex justify-end pb-3 mb-3 border-b border-slate-800 text-[10px] font-mono text-slate-500">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                STEERING / {t.driverCabin}
              </span>
            </div>

            {/* Wheelchair Priority Bays */}
            <div className="mb-4 p-2 rounded-xl bg-cyan-950/30 border border-cyan-800/40">
              <div className="text-[10px] font-mono text-cyan-400 mb-1 flex items-center gap-1 font-semibold">
                <Accessibility className="w-3 h-3" />
                <span>WHEELCHAIR PRIORITY BAY (LEVEL ENTRY)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {seats.slice(0, 2).map(seat => (
                  <button
                    key={seat.id}
                    disabled={seat.isBooked}
                    onClick={() => setSelectedSeat(seat.id)}
                    className={`py-2 px-2 rounded-lg font-mono text-xs flex items-center justify-center gap-1 border transition ${
                      selectedSeat === seat.id
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md'
                        : seat.isBooked
                        ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                        : 'bg-cyan-950/60 text-cyan-200 border-cyan-700 hover:bg-cyan-900'
                    }`}
                  >
                    <Accessibility className="w-3.5 h-3.5" />
                    <span>{seat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Standard 2+2 Rows */}
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {seats.slice(2).map(seat => {
                  const isSelected = selectedSeat === seat.id;
                  return (
                    <button
                      key={seat.id}
                      disabled={seat.isBooked}
                      onClick={() => setSelectedSeat(seat.id)}
                      className={`h-9 rounded-lg font-mono text-xs flex items-center justify-center border transition ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md'
                          : seat.isBooked
                          ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                          : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-emerald-500 hover:bg-slate-800'
                      }`}
                    >
                      {seat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Fare Summary & Booking Action */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-slate-400">
              Seat <strong className="text-white font-mono">{selectedSeat}</strong> · {passenger.name || 'Commuter'}
            </div>
            <div className="text-lg font-black font-mono text-emerald-400 flex items-baseline gap-1.5">
              <span>₹{finalFare}</span>
              {discount > 0 && (
                <span className="text-xs text-slate-500 line-through font-normal">
                  ₹{baseFare} (Special Concession)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleConfirmBooking}
            disabled={isBooking}
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-700/30 transition disabled:opacity-50"
          >
            <Ticket className="w-4 h-4" />
            <span>{isBooking ? 'Issuing...' : t.btnConfirmSeat}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
