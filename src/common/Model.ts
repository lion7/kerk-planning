export interface Uitnodiging {
  datum: string;
  gebouw: string;
  status: string;
}

export interface Opgave {
  dienst: string;
  aantal: number;
}

export interface Deelnemer {
  naam: string;
  adres: string;
  postcode: string;
  woonplaats: string;
  email: string;
  telefoonnummer: string;
  opgaven: Opgave[];
  uitnodigingen: Uitnodiging[];
}

export interface Genodigde {
  naam: string;
  email: string;
  aantal: number;
  gebouw: string;
  ingang: string;
  stoelen: Stoel[];
}

export enum Tijdvak {
  Ochtend = "Ochtend",
  Middag = "Middag",
  Avond = "Avond"
}

export interface Planning {
  datum: string;
  tijdvak: Tijdvak;
  genodigden: Genodigde[];
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
