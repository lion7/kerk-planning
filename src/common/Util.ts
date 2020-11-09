import {Deelnemer, Gebouw, Richting, Stoel, Tijdstippen, Tijdvak} from "./Model";

export function isHorizontaal(richting: Richting) {
  return richting === Richting.Noord || richting === Richting.Zuid;
}

export function toCssRotation(richting: Richting): string {
  switch (richting) {
    case Richting.Noord:
      return '180deg';
    case Richting.Oost:
      return '270deg';
    case Richting.Zuid:
      return '0';
    case Richting.West:
      return '90deg';
    default:
      return '0';
  }
}

export function bepaalRichting(char: any): Richting | undefined {
  switch (char) {
    case '0':
    case 'N':
      return Richting.Noord;
    case '1':
    case 'O':
      return Richting.Oost;
    case '2':
    case 'Z':
      return Richting.Zuid;
    case '3':
    case 'W':
      return Richting.West;
    default:
      return undefined;
  }
}

export function bepaalTijdstippen(datum: Date, tijdvak: Tijdvak): Tijdstippen {
  const openingsTijd = new Date(datum);
  const startTijd = new Date(datum);
  const eindTijd = new Date(datum);
  switch (tijdvak) {
    case Tijdvak.Ochtend:
      openingsTijd.setHours(9, 10, 0, 0);
      startTijd.setHours(9, 30, 0, 0);
      eindTijd.setHours(11, 0, 0, 0);
      break;
    case Tijdvak.Middag:
      openingsTijd.setHours(15, 10, 0, 0);
      startTijd.setHours(15, 30, 0, 0);
      eindTijd.setHours(17, 0, 0, 0);
      break;
    case Tijdvak.Avond:
      openingsTijd.setHours(18, 40, 0, 0);
      startTijd.setHours(19, 0, 0, 0);
      eindTijd.setHours(20, 30, 0, 0);
      break;
  }

  return {
    openingsTijd: openingsTijd,
    startTijd: startTijd,
    eindTijd: eindTijd
  }
}

export function isoDatum(date: Date): string {
  const datum = date.toISOString();
  return datum.substring(0, datum.indexOf('T'));
}

export function volgendeZondag(): Date {
  const date = new Date();
  const daysUntilNextSunday = 7 - date.getDay();
  date.setDate(date.getDate() + daysUntilNextSunday);
  date.setHours(9, 30, 0, 0);
  return date;
}

export function laatsteUitnodiging(deelnemer: Deelnemer): Date {
  return deelnemer.uitnodigingen.map(value => new Date(value.datum))
    .reduce((previousValue, currentValue) => previousValue > currentValue ? previousValue : currentValue, new Date(0));
}

export function isOnbeschikbaar(stoel: Stoel, stoelen: Stoel[]): boolean {
  const richting = stoelen[0].richting;
  let totRij = stoelen.map(value => value.rij).reduce((previousValue, currentValue) => previousValue < currentValue ? currentValue : previousValue, 0);
  let vanRij = stoelen.map(value => value.rij).reduce((previousValue, currentValue) => previousValue > currentValue ? currentValue : previousValue, totRij);
  let totKolom = stoelen.map(value => value.kolom).reduce((previousValue, currentValue) => previousValue < currentValue ? currentValue : previousValue, 0);
  let vanKolom = stoelen.map(value => value.kolom).reduce((previousValue, currentValue) => previousValue > currentValue ? currentValue : previousValue, totKolom);
  if (isHorizontaal(richting)) {
    vanRij -= 2;
    totRij += 2;
    totKolom += 3;
    vanKolom -= 3;
  } else {
    vanRij -= 3;
    totRij += 3;
    totKolom += 2;
    vanKolom -= 2;
  }
  return (stoel.rij >= vanRij && stoel.rij <= totRij) && (stoel.kolom >= vanKolom && stoel.kolom <= totKolom)
}

export function bepaalIngang(gebouw: Gebouw, stoel: Stoel): string {
  const ingang = gebouw.ingangen.find(ingang => {
    let matches = true;
    let predicates = 0;
    if (ingang.richting !== undefined) {
      matches = matches && stoel.richting == ingang.richting;
      predicates++;
    }
    if (ingang.vanRij !== undefined) {
      matches = matches && stoel.rij >= ingang.vanRij;
      predicates++;
    }
    if (ingang.totRij !== undefined) {
      matches = matches && stoel.rij < ingang.totRij;
      predicates++;
    }
    if (ingang.vanKolom !== undefined) {
      matches = matches && stoel.kolom >= ingang.vanKolom;
      predicates++;
    }
    if (ingang.totKolom !== undefined) {
      matches = matches && stoel.kolom < ingang.totKolom;
      predicates++;
    }
    return predicates > 0 && matches;
  });
  return ingang ? ingang.naam : 'onbekend';
}
