import { Deelnemer, Opgave } from '../common/Model';
import { isoDateString } from './Common';

function createDeelnemer(row: any[], headerRow: string[]): Deelnemer {
  const opgaven: Opgave[] = [];
  for (let i = 7; i < row.length; i++) {
    const dienst = headerRow[i];
    const aantal = parseInt(row[i]);
    if (dienst && aantal && !isNaN(aantal)) {
      opgaven.push({
        dienst: dienst,
        aantal: aantal,
      });
    }
  }
  return {
    email: row[1].toLowerCase(),
    naam: row[2],
    adres: row[3],
    postcode: row[4],
    woonplaats: row[5],
    telefoonnummer: row[6],
    opgaven: opgaven,
    uitnodigingen: [],
  };
}

function uitnodigingenAanvullen(deelnemers: Deelnemer[]) {
  const filename = `Genodigden`;
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    const file = iterator.next();
    const spreadsheet = SpreadsheetApp.open(file);
    spreadsheet
      .getDataRange()
      .getValues()
      .forEach(value => {
        const datum = isoDateString(value[0]);
        const dienst = value[1] as string;
        const email = value[2] as string;
        const status = value[3] as string;
        const deelnemer = deelnemers.find(deelnemer => deelnemer.email === email);
        if (deelnemer) {
          deelnemer.uitnodigingen.push({
            datum: datum,
            dienst: dienst,
            status: status,
          });
        }
      });
  }
}

function getDeelnemers(): Deelnemer[] {
  const sheet = SpreadsheetApp.getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  const headerRow = rows[0];
  let deelnemers: Deelnemer[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == '') {
      continue;
    }
    deelnemers.push(createDeelnemer(rows[i], headerRow));
  }
  // only keep the last entry of duplicates
  deelnemers = deelnemers.filter((deelnemer, index, array) => array.lastIndexOf(deelnemer) === index);
  uitnodigingenAanvullen(deelnemers);
  return deelnemers;
}
