import {Beschikbaarheid, Gebouw, Ingang, Prop, Richting, Stoel} from "../common/Model";

interface GebouwIngang extends Ingang {
  gebouw: string;
}

function convertRichting(c: any): Richting | undefined {
  switch (c) {
    case 'N':
      return Richting.Noord;
    case 'O':
      return Richting.Oost;
    case 'Z':
      return Richting.Zuid;
    case 'W':
      return Richting.West;
    default:
      return undefined;
  }
}

function createIngang(row: any[]): GebouwIngang {
  const gebouw = row[0];
  const naam = row[1];
  const richting = convertRichting(row[2]);
  const vanRij = typeof row[3] == "number" ? row[3] : undefined;
  const totRij = typeof row[4] == "number" ? row[4] : undefined;
  const vanKolom = typeof row[5] == "number" ? row[5] : undefined;
  const totKolom = typeof row[6] == "number" ? row[6] : undefined;
  return {
    gebouw: gebouw,
    naam: naam,
    richting: richting,
    vanRij: vanRij,
    totRij: totRij,
    vanKolom: vanKolom,
    totKolom: totKolom
  };
}

function getIngangen(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): GebouwIngang[] {
  const sheet = spreadsheet.getSheets()[0];
  const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
  const ingangen = range.getValues();
  const result: GebouwIngang[] = [];
  for (let i = 1; i < ingangen.length; i++) {
    const ingang = createIngang(ingangen[i]);
    if (ingang) {
      result.push(ingang);
    }
  }
  return result;
}

function convertBeschikbaarheid(bg: string): Beschikbaarheid {
  switch (bg) {
    case '#ffff00':
      return Beschikbaarheid.Onbeschikbaar;
    case '#00ffff':
      return Beschikbaarheid.Gereserveerd;
    default:
      return Beschikbaarheid.Beschikbaar;
  }
}

function createGebouw(sheet: GoogleAppsScript.Spreadsheet.Sheet, ingangen: GebouwIngang[]): Gebouw {
  const naam = sheet.getName();
  const cached = CacheService.getScriptCache()?.get(naam);
  if (cached != null) {
    return JSON.parse(cached);
  }
  const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
  const indeling = range.getValues();
  const backgrounds = range.getBackgrounds();
  const stoelen: Stoel[] = [];
  const props: Prop[] = [];
  for (let rij = 0; rij < range.getLastRow(); rij++) {
    for (let kolom = 0; kolom < range.getLastColumn(); kolom++) {
      const v = indeling[rij][kolom];
      const bg = backgrounds[rij][kolom];
      if (v && v.charAt(0) === 'S') {
        const richting = convertRichting(v.charAt(1));
        const beschikbaarheid = convertBeschikbaarheid(bg);
        stoelen.push({
          rij: rij + 1,
          kolom: kolom + 1,
          richting: richting ? richting : Richting.Noord,
          beschikbaarheid: beschikbaarheid
        });
      } else if (bg && bg != '#ffffff') {
        props.push({
          rij: rij + 1,
          kolom: kolom + 1,
          kleur: bg
        });
      }
    }
  }
  const result: Gebouw = {
    naam: naam,
    ingangen: ingangen.filter(v => v.gebouw == naam),
    stoelen: stoelen,
    props: props
  };
  CacheService.getScriptCache()?.put(naam, JSON.stringify(result), 86400);
  return result;
}

function getGebouwen(): Gebouw[] {
  const filename = 'gebouwen.json';
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    const file = iterator.next();
    const json = file.getBlob().getDataAsString();
    return JSON.parse(json);
  } else {
    const spreadsheet = SpreadsheetApp.openById('1FPTrd515HQUC0LXMBU4qUUNzKfc80bi7VXOxjOhWffg');
    const ingangen = getIngangen(spreadsheet);
    const sheets = spreadsheet.getSheets();
    const gebouwen: Gebouw[] = [];
    for (let i = 1; i < sheets.length; i++) {
      gebouwen.push(createGebouw(sheets[i], ingangen));
    }
    DriveApp.createFile(filename, JSON.stringify(gebouwen), "application/json");
    return gebouwen;
  }
}