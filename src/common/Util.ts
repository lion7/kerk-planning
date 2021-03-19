import {Gebouw, Richting, Stoel} from "./Model";

function volgendeDag(datum: string, day: number): string {
  const date = new Date(datum);
  const daysRemaining = (7 + day - date.getDay()) % 7;
  date.setDate(date.getDate() + daysRemaining);
  const isoString = date.toISOString();
  return isoString.substring(0, isoString.indexOf('T'));
}

function bepaalBiddag(year: number): string {
  const maart = new Date(year, 2, 8); // 1 + 7 = 2de week van maart
  return volgendeDag(maart.toISOString(), 4);
}

function bepaalDankdag(year: number): string {
  const november = new Date(year, 10, 1);
  return volgendeDag(november.toISOString(), 4);
}

export function volgendeZondag(): string {
  const today = new Date();
  return volgendeDag(today.toISOString(), 0);
}

export function isTussenBiddagEnDankdag(datum: string): boolean {
  const date = new Date(datum);
  const biddag = new Date(bepaalBiddag(date.getFullYear()));
  const dankdag = new Date(bepaalDankdag(date.getFullYear()));
  return date > biddag && date < dankdag;
}

export function isTussenDankdagEnBiddag(datum: string): boolean {
  const date = new Date(datum);
  const biddag = new Date(bepaalBiddag(date.getFullYear()));
  const dankdag = new Date(bepaalDankdag(date.getFullYear()));
  return date < biddag || date > dankdag;
}

export function isHorizontaal(richting: Richting): boolean {
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
