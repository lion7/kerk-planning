import {css, html, LitElement, property, PropertyValues} from 'lit-element';

export interface Deelnemer {
  id: number;
  naam: string;
  aantal: number;
  adres: string;
  postcode: string;
  woonplaats: string;
  email: string;
  telefoonnummer: string;
  voorkeuren: string;
  beschikbaarheid: string;
}

export interface Genodigde {
  id: number;
  naam: string;
  ingang: string;
  aantal: number;
  email: string;
}

export enum Richting {
  Noord,
  Oost,
  Zuid,
  West
}

export interface Stoel {
  rij: number;
  kolom: number;
  richting: Richting;
  deelnemer: Deelnemer | null;
}

export interface Gebouw {
  naam: string;
  stoelen: Stoel[];
}

export class KerkPlanning extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    th {
      text-align: left;
    }

    #deelnemers {
      table-layout: fixed;
    }

    #view {
      position: fixed;
      top: 0;
      right: 0;
      height: 98vh;
      padding: 1vh;
    }

    #gebouwen {
      display: grid;
    }

    #gebouw {
      display: grid;
      background-color: #836B32;
    }

    #controls {
      display: grid;
      grid-template-columns: repeat(2, 50%);
      gap: 1vh;
      height: 4vh;
      margin-bottom: 1vh;
    }

    .deelnemer {
      cursor: move;
    }

    .stoel {
      height: 100%;
      width: 100%;
    }

    .genodigde {
      background-color: red;
    }
  `;

  @property({type: String}) deelnemersUrl = '';
  @property({type: String}) gebouwenUrl = '';
  @property({type: String}) genodigdenUrl = '';
  @property({type: []}) gebouwen: Gebouw[] = [];
  @property({type: []}) deelnemers: Deelnemer[] = [];
  @property({type: Number}) gebouwIndex = 0;

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);
    if (this.deelnemersUrl && this.deelnemersUrl != '') {
      console.log(`Deelnemers ophalen van ${this.deelnemersUrl}`);
      fetch(this.deelnemersUrl).then(value => value.json()).then(value => this.deelnemers = value);
    }
    if (this.gebouwenUrl && this.gebouwenUrl != '') {
      console.log(`Gebouwen ophalen van ${this.gebouwenUrl}`);
      fetch(this.gebouwenUrl).then(value => value.json()).then(value => this.gebouwen = value);
    }
  }

  _dragstart(event: DragEvent) {
    const el = event.target as Element;
    const deelnemerId = el.getAttribute("data-deelnemer-id");
    if (!deelnemerId) {
      console.log("Deelnemer id niet gevonden!");
      return;
    }

    event.dataTransfer?.setData('text/plain', deelnemerId);
  }

  _drop(event: DragEvent) {
    const el = event.target as Element;
    const stoelIndexStr = el.getAttribute("data-stoel-index");
    if (!stoelIndexStr) {
      console.log("Stoel index niet gevonden!");
      return;
    }

    const deelnemerIdStr = event.dataTransfer?.getData('text/plain');
    if (!deelnemerIdStr) {
      console.log("Deelnemer id niet gevonden!");
      return;
    }

    const gebouw = this.gebouwen[this.gebouwIndex]
    if (!gebouw) {
      console.log("Gebouw niet gevonden!");
      return;
    }

    const stoelIndex = parseInt(stoelIndexStr);
    const stoel = gebouw.stoelen[stoelIndex];
    if (!stoel) {
      console.log("Stoel niet gevonden!");
      return;
    }

    const deelnemerId = parseInt(deelnemerIdStr);
    const deelnemer = this.findDeelnemer(deelnemerId);
    if (!deelnemer) {
      console.log("Deelnemer niet gevonden!");
      return;
    }

    const aantalStoelenNodig = deelnemer.aantal;
    const vanRij = stoel.rij;
    const totRij = KerkPlanning.isHorizontaal(stoel.richting) ? vanRij + 1 : vanRij + aantalStoelenNodig;
    const vanKolom = stoel.kolom;
    const totKolom = KerkPlanning.isHorizontaal(stoel.richting) ? vanKolom + aantalStoelenNodig : vanKolom + 1;
    console.log(`Proberen om ${deelnemer.naam} in te delen op ${aantalStoelenNodig} stoelen van rij ${vanRij}-${totRij} en van kolom ${vanKolom}-${totKolom}`);
    let aantalStoelenGevonden = 0;
    const nieuweStoelen = gebouw.stoelen.map(value => {
      if (value.rij >= vanRij && value.rij < totRij && value.kolom >= vanKolom && value.kolom < totKolom) {
        aantalStoelenGevonden++;
        return {
          rij: value.rij,
          kolom: value.kolom,
          richting: value.richting,
          deelnemer: deelnemer
        };
      } else if (value.deelnemer?.id == deelnemer.id) {
        return {
          rij: value.rij,
          kolom: value.kolom,
          richting: value.richting,
          deelnemer: null
        };
      } else {
        return value;
      }
    });
    console.log(`${aantalStoelenGevonden} stoelen gevonden voor ${deelnemer.naam}`);
    if (aantalStoelenGevonden == aantalStoelenNodig) {
      gebouw.stoelen = nieuweStoelen;
      this.gebouwen = [...this.gebouwen];
    }
  }

  _reset(event: DragEvent) {
    const deelnemerIdStr = event.dataTransfer?.getData('text/plain');
    if (!deelnemerIdStr) {
      console.log("Deelnemer id niet gevonden!");
      return;
    }

    const deelnemerId = parseInt(deelnemerIdStr);
    const deelnemer = this.findDeelnemer(deelnemerId);
    if (!deelnemer) {
      console.log("Deelnemer niet gevonden!");
      return;
    }

    this.gebouwen.forEach(gebouw =>
      gebouw.stoelen.forEach(value => {
        if (value.deelnemer?.id == deelnemer.id) {
          value.deelnemer = null;
        }
      })
    );
    this.gebouwen = [...this.gebouwen];
  }

  _downloadLijst(event: Event) {
    event.preventDefault();

    const genodigden: Genodigde[] = this.bepaalGenodigden();
    const rows = genodigden.map(value => [value.naam, value.ingang, value.aantal, value.email]);
    const csvContent = "data:text/csv;charset=utf-8,naam;ingang;aantal;email\n" + rows.map(e => e.join(";")).join("\n");
    const link = document.createElement("a");
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `genodigden-${new Date().toISOString()}.csv`);
    link.click(); // This will download the CSV file
  }

  _verstuurUitnodigingen(event: Event) {
    event.preventDefault();

    const genodigden: Genodigde[] = this.bepaalGenodigden();
    fetch(this.genodigdenUrl, {
      method: 'POST',
      body: JSON.stringify(genodigden)
    }).then(value => console.log(`Uitnodigingen verstuurd: ${value}`))
  }

  _selecteerGebouw(event: Event) {
    const el = event.target as HTMLInputElement;
    this.gebouwIndex = parseInt(el.value);
  }

  render() {
    const gebouw = this.gebouwen[this.gebouwIndex]
    if (!gebouw) {
      console.log("Gebouw niet gevonden!");
      return;
    }
    const rijen = gebouw.stoelen.length > 0 ? gebouw.stoelen.reduce((previousValue, currentValue) => previousValue.rij < currentValue.rij ? currentValue : previousValue).rij : 0;
    const kolommen = gebouw.stoelen.length > 0 ? gebouw.stoelen.reduce((previousValue, currentValue) => previousValue.kolom < currentValue.kolom ? currentValue : previousValue).kolom : 0;
    return html`
      <div id="planning" xmlns="http://www.w3.org/1999/html">
        <table id="deelnemers"
               style="width: calc(100vw - 2vh - (${kolommen} * 98vh / ${rijen}))"
               draggable="true"
               ondragenter="return false"
               ondragover="return false"
               @drop="${this._reset}">
          <thead>
          <tr>
            <th>Naam</th>
            <th>Aantal</th>
            <th>Voorkeuren</th>
            <th>Beschikbaarheid</th>
          </tr>
          </thead>
          <tbody>
          ${this.deelnemers.map(value => html`
            <tr>
            <td class="deelnemer ${this.isGenodigde(value) ? 'genodigde' : ''}"
                draggable="true"
                data-deelnemer-id="${value.id}"
                @dragstart="${this._dragstart})">${value.naam}</td>
            <td>${value.aantal}</td>
            <td>${value.voorkeuren}</td>
            <td>${value.beschikbaarheid}</td>
            </tr>
          `)}
          </tbody>
        </table>

        <div id="view">
          <div id="controls">
            <div>Gebouw: <select @change="${this._selecteerGebouw}">${this.gebouwen.map(((value, index) => html`<option value="${index}">${value.naam}</option>`))}</select></div>
            <div>Aantal stoelen: ${gebouw.stoelen.length}</div>
            <button @click="${this._downloadLijst}">Lijst downloaden</button>
            ${this.genodigdenUrl && this.genodigdenUrl != '' ? html`<button @click="${this._verstuurUitnodigingen}">Uitnodigingen versturen</button>` : ''}
          </div>
          <div id="gebouw" style="grid-template-rows: repeat(${rijen}, calc(93vh / ${rijen}));
                                   grid-template-columns: repeat(${kolommen}, calc(93vh / ${rijen}));">
            ${gebouw.stoelen.map((value, index) => html`
                <img src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M112 128c0-29.5 16.2-55 40-68.9V256h48V48h48v208h48V59.1c23.8 13.9 40 39.4 40 68.9v128h48V128C384 57.3 326.7 0 256 0h-64C121.3 0 64 57.3 64 128v128h48zm334.3 213.9l-10.7-32c-4.4-13.1-16.6-21.9-30.4-21.9H42.7c-13.8 0-26 8.8-30.4 21.9l-10.7 32C-5.2 362.6 10.2 384 32 384v112c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V384h256v112c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V384c21.8 0 37.2-21.4 30.3-42.1z"/></svg>'
                     class="stoel${value.deelnemer ? ' genodigde' : ''}"
                     draggable="${(!!value.deelnemer)}"
                     data-stoel-index="${index}"
                     data-deelnemer-id="${value.deelnemer ? value.deelnemer.id : ''}"
                     title="${value.deelnemer ? value.deelnemer.naam : 'Leeg'}"
                     style="grid-row: ${value.rij}; grid-column: ${value.kolom}; transform: rotate(${KerkPlanning.rotation(value.richting)})"
                     ondragenter="return ${value.deelnemer != null}"
                     ondragover="return ${value.deelnemer != null}"
                     @dragstart="${this._dragstart}"
                     @drop="${this._drop}" />

            `)}
          </div>
        </div>
      </div>
    `;
  }

  private findDeelnemer(id: number): Deelnemer | undefined {
    return this.deelnemers.find(value => value.id == id);
  }

  private bepaalGenodigden(): Genodigde[] {
    const result: Genodigde[] = [];
    this.gebouwen.forEach(gebouw =>
      gebouw.stoelen.forEach(stoel => {
        if (stoel.deelnemer) {
          const genodigde = KerkPlanning.toGenodigde(stoel.deelnemer, KerkPlanning.ingang(gebouw, stoel));
          if (!result.some(g => g.email == genodigde.email)) {
            result.push(genodigde);
          }
        }
      }));
    return result;
  }

  private isGenodigde(deelnemer: Deelnemer): boolean {
    return this.gebouwen.some(gebouw => gebouw.stoelen.some(stoel => deelnemer.id == stoel.deelnemer?.id));
  }

  private static toGenodigde(deelnemer: Deelnemer, ingang: string): Genodigde {
    return {
      id: deelnemer.id,
      naam: deelnemer.naam,
      ingang: ingang,
      aantal: deelnemer.aantal,
      email: deelnemer.email
    };
  }

  private static isHorizontaal(richting: Richting) {
    return richting === Richting.Noord || richting === Richting.Zuid;
  }

  private static rotation(richting: Richting): string {
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

  private static ingang(gebouw: Gebouw, stoel: Stoel): string {
    const gebouwNaam = gebouw.naam.includes('(') ? gebouw.naam.substring(0, gebouw.naam.indexOf('(')) : gebouw.naam;
    if (gebouw.naam.includes("Kerk")) {
      if (gebouw.naam.includes("gallerij")) {
        switch (stoel.richting) {
          case Richting.Noord:
            return gebouwNaam + ' - ingang onder de toren';
          case Richting.West:
            return gebouwNaam + ' - ingang tegenover de preekstoel';
          case Richting.Zuid:
            return gebouwNaam + ' - ingang onder het orgel';
          case Richting.Oost:
            return gebouwNaam + ' - ingang vanuit de consistorie';
        }
      } else {
        switch (stoel.richting) {
          case Richting.Noord:
            return gebouwNaam + ' - ingang galerij onder de toren';
          case Richting.West:
            return gebouwNaam + ' - ingang galerij tegenover de preekstoel';
          case Richting.Zuid:
            return gebouwNaam + ' - ingang galerij bij het orgel';
        }
      }
    } else if (gebouw.naam.includes("Centrum")) {
      if (stoel.rij < 20) {
        return gebouwNaam + ' - ingang stuivenbergstraat';
      } else {
        return gebouwNaam + ' - ingang fazant';
      }
    }
    return 'onbekend';
  }
}
