import { DateTime } from "luxon";
import { first as _first, last as _last } from 'lodash'

export function getDutyStart(events) {
  const first = _first(events);
  const debut = DateTime.fromMillis(first.start);

  if (first.tag === "vol") {
    switch (first.from) {
      case "ORY":
      case "LYS":
        return debut.minus({ minutes: 75 }).toMillis();
      case "TLV":
        return debut.minus({ minutes: 80 }).toMillis();
      default:
        return debut.minus({ minutes: 60 }).toMillis();
    }
    // +15 min pour les vols à dest. de KEF, KTT, RVN et IVL pour les PNT seulement
  } else if (first.tag === "mep") {
    return debut.minus({ minutes: 15 }).toMillis();
  } else if (first.tag === "simu") {
    return debut.minus({ minutes: 60 }).toMillis();
  } else {
    return first.start;
  }
}

export function getDutyEnd(events) {
  const last = _last(events);
  switch (last.tag) {
    case "vol":
      const realEnd = last.real && last.real.end ? last.real.end : last.end;
      return DateTime.fromMillis(realEnd).plus({ minutes: 30 }).toMillis();
    case "simu":
    case "simuInstruction":
      return DateTime.fromMillis(last.end).plus({ minutes: 30 }).toMillis();
    default:
      return last.end;
  }
}
