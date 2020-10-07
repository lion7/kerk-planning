export interface Deelnemer {
  id: number;
  naam: string;
  aantal: string;
  adres: string;
  postcode: string;
  woonplaats: string;
  email: string;
  telefoonnummer: string;
  voorkeuren: string[];
  afwezigheid: string[];
}

export interface Genodigde {
  id: number;
  naam: string;
  email: string;
  aantal: string;
  gebouw: string;
  ingang: string;
  stoelen: Stoel[];
}

export enum Richting {
  Noord,
  Oost,
  Zuid,
  West
}

export enum Beschikbaarheid {
  Onbeschikbaar,
  Gereserveerd,
  Beschikbaar
}

export interface Stoel {
  rij: number;
  kolom: number;
  richting: Richting;
  beschikbaarheid: Beschikbaarheid;
}

export interface Prop {
  rij: number;
  kolom: number;
  kleur: string;
}

export interface Ingang {
  naam: string;
  richting: Richting | undefined;
  vanRij: number | undefined;
  totRij: number | undefined;
  vanKolom: number | undefined;
  totKolom: number | undefined;
}

export interface Gebouw {
  naam: string;
  ingangen: Ingang[];
  stoelen: Stoel[];
  props: Prop[];
}
