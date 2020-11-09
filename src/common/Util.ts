import {Deelnemer, Gebouw, Richting, Stoel} from "./Model";

export function isDST(datum: Date) {
  const jan = new Date(datum.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(datum.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) != datum.getTimezoneOffset();
}

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

export function isoDatum(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function isoTijd(date: Date): string {
  return `${date.getHours()}:${date.getMinutes()}`;
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
