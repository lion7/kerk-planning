import {Gebouw, Richting, Stoel, Tijdstippen} from "./Model";

export function isDST(datum: string) {
  const date = new Date(datum);
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) != date.getTimezoneOffset();
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

export function volgendeZondag(): string {
  const date = new Date();
  const daysUntilNextSunday = 7 - date.getDay();
  date.setDate(date.getDate() + daysUntilNextSunday);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function bepaalTijdstippen(datum: string): Tijdstippen {
  const startTijd = new Date(datum);
  const openingsTijd = new Date(datum);
  const eindTijd = new Date(datum);
  openingsTijd.setTime(startTijd.getTime() - 20 * 60 * 1000);
  eindTijd.setTime(startTijd.getTime() + 90 * 60 * 1000);
  return {
    openingsTijd: openingsTijd.toISOString(),
    startTijd: startTijd.toISOString(),
    eindTijd: eindTijd.toISOString()
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
