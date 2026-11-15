// terra.pura · NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
// designed, reviewed and tested by the terra.pura team.
//
// Directory of electricity suppliers and water/sewerage bodies by country (and region where supply is a
// regional monopoly). Major household/business suppliers only — not exhaustive; farmers can always enter
// another supplier under "Other". Compiled from national regulators' market reports (2024–2026).
// Prices are NOT stored here: they come from EIA-861 (US), Eurostat (EU/EEA), Octopus (UK) or the
// national-average table in data.js.
//
// elec: string[]            competitive market: pick any
// elecByRegion: {match: [regex, names[]][], fallback}   regional monopolies / distribution areas
// water / sewage: { national: name } | { byRegion: [[regex, name]] } | { note }

export const SUPPLIERS = {
  // ---------------- Europe ----------------
  DE: { elec: ['E.ON', 'EnBW', 'Vattenfall', 'EWE', 'Octopus Energy Deutschland', 'Your local Stadtwerke'], note: 'Germany has over 1,000 suppliers; your local Stadtwerke is the default (Grundversorger).', water: { note: 'Water and sewerage are run by your municipality or its Stadtwerke.' } },
  FR: { elec: ['EDF', 'Engie', 'TotalEnergies', 'Ekwateur', 'Mint Énergie', 'Octopus Energy France'], water: { note: 'Each commune contracts water and sewerage, often to Veolia, Suez or Saur.' } },
  ES: { elec: ['Iberdrola', 'Endesa', 'Naturgy', 'Repsol', 'TotalEnergies', 'Octopus Energy España'], water: { byRegion: [[/madrid/i, 'Canal de Isabel II'], [/barcelona|catalu/i, 'Aigües de Barcelona']], note: 'Water is managed by your municipality.' } },
  IT: { elec: ['Enel Energia', 'Edison', 'A2A Energia', 'Hera Comm', 'Iren', 'Eni Plenitude'], water: { byRegion: [[/lazio|rome|roma/i, 'Acea Ato 2'], [/lombard|milan/i, 'MM / regional Gruppo CAP'], [/emilia/i, 'Hera']], note: 'Water is run by your area\'s ATO operator.' } },
  PT: { elec: ['EDP Comercial', 'Endesa', 'Galp', 'Iberdrola', 'Goldenergy'], water: { note: 'Water is supplied by your municipality (e.g. EPAL in Lisbon).' } },
  NL: { elec: ['Eneco', 'Vattenfall', 'Essent', 'Budget Energie', 'Greenchoice', 'Frank Energie'],
        water: { byRegion: [[/gelderland|overijssel|flevoland|friesland|drenthe/i, 'Vitens'], [/noord-brabant|brabant/i, 'Brabant Water'], [/zeeland/i, 'Evides'], [/limburg/i, 'WML'], [/groningen/i, 'Waterbedrijf Groningen'], [/utrecht/i, 'Vitens'], [/noord-holland/i, 'PWN'], [/zuid-holland/i, 'Dunea / Evides / Oasen']], note: 'Drinking water is a regional monopoly; sewerage is run by your municipality and water board.' } },
  BE: { elec: ['Engie', 'Luminus', 'TotalEnergies', 'Eneco', 'Mega', 'Bolt'], water: { byRegion: [[/flanders|vlaanderen|antwerp|limburg|east flanders|west flanders|flemish/i, 'De Watergroep / Farys / Water-link'], [/brussels|bruxelles/i, 'Vivaqua'], [/wallon|walloon|liège|namur|hainaut|luxembourg/i, 'SWDE']] } },
  IE: { elec: ['Electric Ireland', 'Bord Gáis Energy', 'SSE Airtricity', 'Energia', 'Flogas', 'Pinergy'], water: { national: 'Uisce Éireann (Irish Water)' }, sewage: { national: 'Uisce Éireann (Irish Water)' } },
  AT: { elec: ['Wien Energie', 'EVN', 'Verbund', 'Energie Steiermark', 'Kelag', 'Salzburg AG'], water: { note: 'Water is supplied by your municipality.' } },
  CH: { elecByRegion: { fallback: ['Your local utility (e.g. EKZ, BKW, Groupe E, IWB, Romande Energie)'] }, note: 'Swiss customers using under 100 MWh a year are supplied by their local utility.', water: { note: 'Water and sewerage are run by your commune.' } },
  PL: { elec: ['PGE Obrót', 'Tauron', 'Enea', 'Energa', 'E.ON Polska'], water: { note: 'Water is supplied by your gmina\'s water company (e.g. MPWiK).' } },
  CZ: { elec: ['ČEZ Prodej', 'E.ON Energie', 'Pražská energetika (PRE)', 'Innogy Energie', 'Centropol'], water: { note: 'Water is supplied by your regional vodárna.' } },
  SK: { elec: ['ZSE', 'SSE', 'VSE', 'Slovenské elektrárne'] },
  SI: { elec: ['Elektro energija', 'GEN-I', 'Petrol', 'E3', 'ECE'] },
  HR: { elec: ['HEP Elektra', 'E.ON Hrvatska', 'RWE Hrvatska'] },
  HU: { elec: ['MVM Next'], note: 'Households and small businesses are supplied by MVM Next under the universal service.' },
  RO: { elec: ['Electrica Furnizare', 'E.ON Energie România', 'Hidroelectrica', 'PPC Energie'] },
  BG: { elec: ['EVN Bulgaria', 'Energo-Pro', 'Electrohold'] },
  GR: { elec: ['PPC (ΔΕΗ)', 'Heron', 'Protergia', 'Elpedison', 'NRG', 'Zenith'] },
  SE: { elec: ['Vattenfall', 'E.ON', 'Fortum', 'Tibber', 'Skellefteå Kraft', 'Göteborg Energi'], water: { note: 'Water and sewerage are run by your kommun.' } },
  NO: { elec: ['Fjordkraft', 'Tibber', 'Fortum', 'NorgesEnergi', 'Ishavskraft'], water: { note: 'Water and sewerage are run by your kommune.' } },
  DK: { elec: ['Andel Energi', 'Norlys', 'OK', 'Vindstød', 'EWII'], water: { note: 'Water is supplied by your local waterworks (vandværk).' } },
  FI: { elec: ['Helen', 'Fortum', 'Vattenfall', 'Oomi', 'Väre'], water: { note: 'Water is supplied by your municipality\'s water utility.' } },
  EE: { elec: ['Enefit (Eesti Energia)', 'Alexela', 'Elektrum', 'Elenger'] },
  LV: { elec: ['Elektrum (Latvenergo)', 'Enefit', 'Tet', 'Ignitis'] },
  LT: { elec: ['Ignitis', 'Enefit', 'Elektrum', 'Perlas Energija'] },
  LU: { elec: ['Enovos', 'Sudstroum', 'Nordenergie'] },
  CY: { elec: ['Electricity Authority of Cyprus (EAC)'] },
  MT: { elec: ['Enemalta'], water: { national: 'Water Services Corporation' }, sewage: { national: 'Water Services Corporation' } },
  IS: { elec: ['Orka náttúrunnar', 'HS Orka', 'Orkusalan', 'Straumlind'] },
  TR: { elec: ['Enerjisa', 'CK Enerji', 'Aydem Enerji', 'Uludağ Elektrik', 'Kolen Enerji'], note: 'Your regional incumbent supplier depends on your province.', water: { note: 'Water is supplied by your city\'s water authority (e.g. İSKİ in Istanbul).' } },
  UA: { elecByRegion: { match: [[/kyiv|kiev/i, ['YASNO']], [/dnipro/i, ['YASNO']]], fallback: ['Your regional supplier (oblenergo)'] } },
  RS: { elec: ['EPS Snabdevanje'] },

  // ---------------- Americas ----------------
  CA: { elecByRegion: { match: [[/ontario/i, ['Hydro One', 'Toronto Hydro', 'Alectra Utilities', 'Hydro Ottawa']], [/qu[ée]bec/i, ['Hydro-Québec']], [/british columbia/i, ['BC Hydro', 'FortisBC']], [/alberta/i, ['ENMAX', 'EPCOR', 'Direct Energy', 'ATCO Energy']], [/manitoba/i, ['Manitoba Hydro']], [/saskatchewan/i, ['SaskPower']], [/new brunswick/i, ['NB Power']], [/nova scotia/i, ['Nova Scotia Power']], [/newfoundland|labrador/i, ['Newfoundland Power', 'NL Hydro']], [/prince edward/i, ['Maritime Electric']]], fallback: ['Your provincial utility'] }, water: { note: 'Water is supplied by your municipality, or a private well in rural areas.' } },
  MX: { elec: ['CFE (Comisión Federal de Electricidad)'], water: { note: 'Water is supplied by your municipal operator (e.g. SACMEX in Mexico City).' } },
  BR: { elecByRegion: { match: [[/são paulo|sao paulo/i, ['Enel SP', 'CPFL Paulista', 'EDP São Paulo', 'Neoenergia Elektro']], [/minas gerais/i, ['CEMIG']], [/paraná|parana/i, ['Copel']], [/rio de janeiro/i, ['Light', 'Enel RJ']], [/santa catarina/i, ['Celesc']], [/rio grande do sul/i, ['RGE', 'CEEE Equatorial']], [/bahia/i, ['Neoenergia Coelba']], [/goiás|goias/i, ['Equatorial Goiás']], [/mato grosso do sul/i, ['Energisa MS']], [/mato grosso/i, ['Energisa MT']]], fallback: ['Your state distribution company'] }, water: { byRegion: [[/são paulo|sao paulo/i, 'Sabesp'], [/minas gerais/i, 'Copasa'], [/paraná|parana/i, 'Sanepar'], [/rio de janeiro/i, 'Cedae / Águas do Rio']] } },
  AR: { elecByRegion: { match: [[/buenos aires|capital federal|caba/i, ['Edenor', 'Edesur', 'EDELAP']], [/córdoba|cordoba/i, ['EPEC']], [/santa fe/i, ['EPE Santa Fe']], [/mendoza/i, ['Edemsa']]], fallback: ['Your provincial distribution company'] } },
  CL: { elec: ['Enel Distribución', 'CGE', 'Chilquinta', 'Saesa'] },
  CO: { elecByRegion: { match: [[/bogot|cundinamarca/i, ['Enel Colombia']], [/antioquia/i, ['EPM']], [/valle del cauca/i, ['Celsia']], [/atlántico|atlantico|magdalena|guajira/i, ['Air-e']]], fallback: ['Your regional operator'] } },
  PE: { elec: ['Luz del Sur', 'Enel Perú', 'Hidrandina', 'Electrocentro'] },

  // ---------------- Asia-Pacific ----------------
  AU: { elecByRegion: { match: [[/western australia/i, ['Synergy', 'Horizon Power']], [/tasmania/i, ['Aurora Energy', '1st Energy']], [/northern territory/i, ['Jacana Energy']]], fallback: ['Origin Energy', 'AGL', 'EnergyAustralia', 'Red Energy', 'Alinta Energy', 'Amber'] }, water: { byRegion: [[/new south wales/i, 'Sydney Water / your council'], [/victoria/i, 'Your Victorian water corporation (e.g. Yarra Valley Water)'], [/queensland/i, 'Urban Utilities / your council'], [/south australia/i, 'SA Water'], [/western australia/i, 'Water Corporation'], [/tasmania/i, 'TasWater'], [/northern territory/i, 'Power and Water Corporation']] } },
  NZ: { elec: ['Mercury', 'Genesis Energy', 'Contact Energy', 'Meridian Energy', 'Electric Kiwi', 'Octopus Energy NZ'], water: { note: 'Water is supplied by your district council (Watercare in Auckland).' } },
  JP: { elecByRegion: { match: [[/hokkaido/i, ['Hokkaido Electric']], [/aomori|iwate|miyagi|akita|yamagata|fukushima|niigata/i, ['Tohoku Electric']], [/ibaraki|tochigi|gunma|saitama|chiba|tokyo|kanagawa|yamanashi/i, ['TEPCO Energy Partner']], [/nagano|gifu|shizuoka|aichi|mie/i, ['Chubu Electric Power Miraiz']], [/toyama|ishikawa|fukui/i, ['Hokuriku Electric']], [/shiga|kyoto|osaka|hyogo|nara|wakayama/i, ['Kansai Electric']], [/tottori|shimane|okayama|hiroshima|yamaguchi/i, ['Chugoku Electric']], [/tokushima|kagawa|ehime|kochi/i, ['Shikoku Electric']], [/fukuoka|saga|nagasaki|kumamoto|oita|miyazaki|kagoshima/i, ['Kyushu Electric']], [/okinawa/i, ['Okinawa Electric']]], fallback: ['Your regional electric company'] } },
  KR: { elec: ['KEPCO (Korea Electric Power Corporation)'], water: { national: 'K-water / your local water authority' } },
  CN: { elecByRegion: { match: [[/guangdong|guangxi|yunnan|guizhou|hainan/i, ['China Southern Power Grid']], [/inner mongolia|nei mongol/i, ['Inner Mongolia Power Group']]], fallback: ['State Grid Corporation of China'] } },
  IN: { elecByRegion: { match: [[/maharashtra/i, ['MSEDCL (Mahavitaran)', 'Tata Power', 'Adani Electricity']], [/delhi/i, ['BSES Rajdhani', 'BSES Yamuna', 'Tata Power-DDL']], [/uttar pradesh/i, ['UPPCL']], [/punjab/i, ['PSPCL']], [/haryana/i, ['UHBVN', 'DHBVN']], [/gujarat/i, ['UGVCL', 'MGVCL', 'PGVCL', 'DGVCL', 'Torrent Power']], [/rajasthan/i, ['JVVNL', 'AVVNL', 'JdVVNL']], [/karnataka/i, ['BESCOM', 'HESCOM', 'MESCOM', 'GESCOM', 'CESC Mysore']], [/tamil nadu/i, ['TANGEDCO (TNPDCL)']], [/kerala/i, ['KSEB']], [/andhra pradesh/i, ['APSPDCL', 'APEPDCL', 'APCPDCL']], [/telangana/i, ['TSSPDCL', 'TSNPDCL']], [/west bengal/i, ['WBSEDCL', 'CESC']], [/bihar/i, ['NBPDCL', 'SBPDCL']], [/madhya pradesh/i, ['MPPKVVCL']], [/odisha/i, ['TP Central Odisha', 'TP Western Odisha']]], fallback: ['Your state distribution company (DISCOM)'] }, note: 'Most farm connections in India are on subsidised agricultural tariffs set by the state.' },
  PK: { elecByRegion: { match: [[/sindh|karachi/i, ['K-Electric', 'HESCO', 'SEPCO']], [/punjab|lahore/i, ['LESCO', 'FESCO', 'GEPCO', 'MEPCO', 'IESCO']], [/khyber|peshawar/i, ['PESCO']], [/balochistan|quetta/i, ['QESCO']]], fallback: ['Your regional DISCO'] } },
  BD: { elec: ['BREB (Palli Bidyut)', 'DPDC', 'DESCO', 'WZPDCL', 'NESCO'] },
  ID: { elec: ['PLN (Perusahaan Listrik Negara)'] },
  TH: { elecByRegion: { match: [[/bangkok|nonthaburi|samut prakan/i, ['MEA (Metropolitan Electricity Authority)']]], fallback: ['PEA (Provincial Electricity Authority)'] } },
  VN: { elec: ['EVN (Vietnam Electricity)'] },
  PH: { elecByRegion: { match: [[/metro manila|national capital|bulacan|cavite|rizal|laguna/i, ['Meralco']], [/cebu/i, ['Visayan Electric', 'CEBECO']], [/davao/i, ['Davao Light']]], fallback: ['Your electric cooperative'] } },
  MY: { elecByRegion: { match: [[/sabah/i, ['Sabah Electricity (SESB)']], [/sarawak/i, ['Sarawak Energy']]], fallback: ['Tenaga Nasional (TNB)'] } },
  SG: { elec: ['SP Group', 'Geneco', 'Senoko Energy', 'Tuas Power', 'Keppel Electric'], water: { national: 'PUB, Singapore\'s National Water Agency' }, sewage: { national: 'PUB, Singapore\'s National Water Agency' } },
  LK: { elec: ['Ceylon Electricity Board (CEB)', 'LECO'] },
  NP: { elec: ['Nepal Electricity Authority'] },

  // ---------------- Middle East & Africa ----------------
  IL: { elec: ['Israel Electric Corporation', 'Cellcom Energy', 'Electra Power', 'Amisragas'], water: { note: 'Water is supplied by your municipal water corporation.' } },
  SA: { elec: ['Saudi Electricity Company'], water: { national: 'National Water Company' } },
  AE: { elecByRegion: { match: [[/dubai/i, ['DEWA']], [/abu dhabi/i, ['TAQA Distribution (ADDC / AADC)']], [/sharjah/i, ['SEWA']]], fallback: ['Etihad Water & Electricity'] } },
  EG: { elec: ['Your regional EEHC distribution company'] },
  MA: { elec: ['ONEE', 'Lydec (Casablanca)', 'Redal (Rabat)', 'Amendis (Tangier/Tetouan)'] },
  ZA: { elec: ['Eskom', 'Your municipality (e.g. City Power, City of Cape Town)'], water: { note: 'Water is supplied by your municipality; many farms use boreholes.' } },
  NG: { elecByRegion: { match: [[/lagos/i, ['Ikeja Electric', 'Eko Electricity']], [/abuja|federal capital|niger|kogi|nasarawa/i, ['AEDC']], [/oyo|ogun|osun|kwara/i, ['IBEDC']], [/enugu|anambra|ebonyi|imo|abia/i, ['EEDC']], [/kano|jigawa|katsina/i, ['KEDCO']], [/kaduna|kebbi|sokoto|zamfara/i, ['Kaduna Electric']], [/rivers|cross river|akwa ibom|bayelsa/i, ['PHED']], [/edo|delta|ekiti|ondo/i, ['BEDC']], [/plateau|bauchi|benue|gombe/i, ['JED']], [/adamawa|borno|taraba|yobe/i, ['YEDC']]], fallback: ['Your regional DisCo'] } },
  KE: { elec: ['Kenya Power (KPLC)'] },
  GH: { elec: ['ECG (Electricity Company of Ghana)', 'NEDCo'] },
  ET: { elec: ['Ethiopian Electric Utility'] },
  TZ: { elec: ['TANESCO'] },
  UG: { elec: ['UEDCL'] },
};

// US retail-choice states (customers can buy energy from a competitive supplier; the utility still delivers it)
export const US_RETAIL_CHOICE = ['TX', 'PA', 'OH', 'IL', 'NY', 'MD', 'NJ', 'MA', 'CT', 'NH', 'ME', 'DE', 'DC', 'RI', 'MI'];

export function electricityFor(cc, regionText = '') {
  const e = SUPPLIERS[cc];
  if (!e) return null;
  if (e.elec) return { names: e.elec, note: e.note };
  const hit = e.elecByRegion.match?.find(([re]) => re.test(regionText));
  return { names: hit ? hit[1] : e.elecByRegion.fallback, note: e.note, regional: !!hit };
}
function legacyWaterFor(cc, regionText = '', kind = 'water') {
  const e = SUPPLIERS[cc]?.[kind];
  if (!e) { // sewerage without its own entry: reuse the water note only (water ≠ sewerage company in most countries)
    const n = kind === 'sewage' ? SUPPLIERS[cc]?.water?.note : null;
    return n ? { names: [], note: n } : null;
  }
  if (e.national) return { names: [e.national], single: true };
  const hit = e.byRegion?.find(([re]) => re.test(regionText));
  if (hit) return { names: [hit[1]], single: true, note: e.note };
  return { names: [], note: e.note };
}

/* ---------------- water & sewerage bodies (takes precedence over the water/sewage fields above) ----------------
   integrated: the same body runs both water and sewerage.  list: main operators where the commune/town chooses.
   byRegion entries: [regex, name] or [regex, waterName, sewerName]. */
export const WATER = {
  IE: { national: 'Uisce Éireann (Irish Water)', integrated: true },
  FR: { byRegion: [[/paris|île-de-france|ile-de-france/i, 'Eau de Paris', 'SIAAP'], [/lyon|rhône|rhone/i, 'Eau du Grand Lyon'], [/marseille|bouches-du-rh/i, 'Eau de Marseille Métropole'], [/toulouse|haute-garonne/i, 'Eau de Toulouse Métropole'], [/bordeaux|gironde/i, "Régie de l'eau Bordeaux Métropole"], [/nantes|loire-atlantique/i, 'Nantes Métropole'], [/strasbourg|bas-rhin/i, 'Eurométropole de Strasbourg'], [/nice|alpes-maritimes/i, "Régie Eau d'Azur"], [/montpellier|hérault|herault/i, 'Régie des eaux de Montpellier Méditerranée'], [/rennes|ille-et-vilaine/i, 'Eau du Bassin Rennais']], list: ['Veolia Eau', 'Suez Eau France', 'Saur'], note: 'Each commune or intercommunality runs water and sanitation itself (régie) or contracts it, mostly to Veolia, Suez or Saur.' },
  DE: { byRegion: [[/berlin/i, 'Berliner Wasserbetriebe'], [/hamburg/i, 'Hamburg Wasser'], [/munich|münchen|muenchen/i, 'Stadtwerke München (SWM)'], [/cologne|köln/i, 'RheinEnergie', 'Stadtentwässerungsbetriebe Köln'], [/frankfurt/i, 'Mainova', 'Stadtentwässerung Frankfurt'], [/stuttgart/i, 'Netze BW Wasser', 'Stadtentwässerung Stuttgart'], [/dresden/i, 'SachsenEnergie', 'Stadtentwässerung Dresden'], [/leipzig/i, 'Leipziger Wasserwerke'], [/hannover|hanover/i, 'enercity', 'Stadtentwässerung Hannover'], [/düsseldorf|dusseldorf/i, 'Stadtwerke Düsseldorf'], [/bremen/i, 'swb', 'hanseWasser'], [/nürnberg|nuremberg/i, 'N-ERGIE'], [/essen|ruhr/i, 'Gelsenwasser'], [/bodensee|lake constance/i, 'Bodensee-Wasserversorgung']], note: 'Water and sewerage are run by your municipality, its Stadtwerke or a Zweckverband; many farms use their own well.' },
  ES: { byRegion: [[/madrid/i, 'Canal de Isabel II'], [/barcelona|catalu/i, 'Aigües de Barcelona'], [/valencia/i, 'Global Omnium (Aguas de Valencia)'], [/sevilla|seville/i, 'EMASESA'], [/málaga|malaga/i, 'EMASA'], [/zaragoza/i, 'Ecociudad Zaragoza'], [/murcia/i, 'Aguas de Murcia (EMUASA)'], [/alicante/i, 'Aguas de Alicante'], [/bizkaia|vizcaya|bilbao/i, 'Consorcio de Aguas Bizkaia'], [/córdoba|cordoba/i, 'EMACSA'], [/mallorca|palma|balear/i, 'EMAYA'], [/gipuzkoa|guipúzcoa/i, 'Gipuzkoako Urak'], [/navarra|pamplona/i, 'Mancomunidad de la Comarca de Pamplona'], [/granada/i, 'EMASAGRA'], [/canari|las palmas|tenerife/i, 'Canaragua']], list: ['Aqualia', 'Agbar (Veolia)'], note: 'Water and sewerage are one service run by your municipality, often contracted to Aqualia or Agbar. Irrigation water comes from your comunidad de regantes.' },
  IT: { byRegion: [[/lazio|rome|roma/i, 'Acea Ato 2'], [/milan|milano/i, 'MM SpA'], [/lombard/i, 'Gruppo CAP'], [/emilia/i, 'Hera'], [/tuscan|toscana|florence|firenze/i, 'Publiacqua'], [/piedmont|piemonte|turin|torino/i, 'SMAT'], [/campania|napl|napoli/i, 'GORI'], [/puglia|apulia/i, 'Acquedotto Pugliese'], [/veneto|venice|venezia/i, 'Veritas'], [/liguria|genoa|genova/i, 'IRETI (Iren)'], [/sardinia|sardegna/i, 'Abbanoa'], [/umbria/i, 'Umbra Acque'], [/basilicata/i, 'Acquedotto Lucano'], [/friuli|udine/i, 'CAFC'], [/sicil|palermo/i, 'AMAP Palermo'], [/calabria/i, 'Sorical'], [/trentino|alto adige|bolzano|trento/i, 'Novareti']], note: "Water and sewerage are one integrated service run by your area's ATO operator. Irrigation water comes from your consorzio di bonifica." },
  PT: { byRegion: [[/lisbon|lisboa/i, 'EPAL', 'Águas do Tejo Atlântico'], [/porto/i, 'Águas e Energia do Porto'], [/algarve|faro/i, 'Águas do Algarve'], [/coimbra/i, 'Águas de Coimbra'], [/braga/i, 'AGERE']], note: 'Water and sanitation are supplied by your municipality or its concessionaire (Águas de Portugal group regionally).' },
  NL: { byRegion: [[/amsterdam/i, 'Waternet'], [/drenthe/i, 'WMD Drinkwater'], [/groningen/i, 'Waterbedrijf Groningen'], [/gelderland|overijssel|flevoland|friesland|frysl|utrecht/i, 'Vitens'], [/noord-brabant|brabant/i, 'Brabant Water'], [/zeeland|rotterdam/i, 'Evides'], [/limburg/i, 'WML'], [/noord-holland/i, 'PWN'], [/den haag|the hague|leiden|delft/i, 'Dunea'], [/gouda|alblasserwaard|krimpen/i, 'Oasen'], [/zuid-holland/i, 'Evides']], integrated: false, sewerNote: 'Sewers are run by your municipality and wastewater is treated by your regional water board (waterschap); both are charged through local taxes.' },
  BE: { byRegion: [[/brussels|bruxelles/i, 'Vivaqua'], [/flanders|vlaanderen|antwerp|limburg|flemish|ghent|gent/i, 'De Watergroep', 'Aquafin'], [/wallon|walloon|liège|liege|namur|hainaut|luxembourg/i, 'SWDE', 'SPGE']] },
  AT: { byRegion: [[/vienna|wien/i, 'Wiener Wasser', 'Wien Kanal']], note: 'Water is supplied by your municipality or a local water co-operative.' },
  CH: { byRegion: [[/zürich|zurich/i, 'Wasserversorgung Zürich', 'ERZ Entsorgung + Recycling Zürich'], [/geneva|genève|geneve/i, 'SIG']], note: 'Water and sewerage are run by your commune.' },
  PL: { byRegion: [[/warsaw|warszawa|masovian|mazowieckie/i, 'MPWiK Warszawa'], [/kraków|krakow|lesser poland|małopolsk/i, 'Wodociągi Miasta Krakowa'], [/wrocław|wroclaw|lower silesia|dolnośląsk/i, 'MPWiK Wrocław'], [/poznań|poznan|greater poland|wielkopolsk/i, 'Aquanet'], [/gdańsk|gdansk|pomeranian|pomorsk/i, 'Gdańskie Wody'], [/łódź|lodz/i, 'ZWiK Łódź'], [/szczecin|west pomeranian|zachodniopomorsk/i, 'ZWiK Szczecin'], [/lublin/i, 'MPWiK Lublin']], note: "Water and sewerage are run by your gmina's water company (wodociągi)." },
  CZ: { byRegion: [[/prague|praha/i, 'Pražské vodovody a kanalizace'], [/brno|south moravian/i, 'Brněnské vodárny a kanalizace']], integrated: true },
  HU: { byRegion: [[/budapest/i, 'Fővárosi Vízművek', 'Fővárosi Csatornázási Művek']], note: 'Water is supplied by your regional state water utility.' },
  RO: { byRegion: [[/bucure|bucharest/i, 'Apa Nova București'], [/ilfov/i, 'Apă Canal Ilfov'], [/cluj|s[ăa]laj/i, 'Compania de Apă Someș'], [/ia[șs]i/i, 'ApaVital'], [/bra[șs]ov/i, 'Compania Apa Brașov'], [/timi/i, 'Aquatim'], [/constan|ialomi/i, 'RAJA Constanța'], [/dolj/i, 'Compania de Apă Oltenia'], [/sibiu/i, 'Apa Canal Sibiu'], [/maramure/i, 'Vital Baia Mare'], [/mure/i, 'Compania Aquaserv'], [/arad/i, 'Compania de Apă Arad'], [/bihor/i, 'Compania de Apă Oradea'], [/suceava/i, 'ACET Suceava'], [/bistri/i, 'Aquabis'], [/satu mare/i, 'Apaserv Satu Mare'], [/gala/i, 'Apa Canal Galați'], [/br[ăa]ila/i, 'Compania de Utilități Publice Dunărea Brăila'], [/buz[ăa]u/i, 'Compania de Apă Buzău'], [/prahova/i, 'Hidro Prahova'], [/d[âa]mbovi/i, 'Compania de Apă Târgoviște Dâmbovița'], [/arge/i, 'Compania de Apă Argeș'], [/v[âa]lcea/i, 'Apavil'], [/\bolt\b/i, 'Compania de Apă Olt'], [/mehedin/i, 'Secom Drobeta'], [/cara/i, 'Aquacaraș'], [/hunedoara/i, 'Apa Prod Deva'], [/alba/i, 'Apa CTTA Alba'], [/harghita/i, 'Harviz'], [/neam/i, 'Apa Serv Neamț'], [/bac[ăa]u/i, 'Compania Regională de Apă Bacău'], [/vaslui/i, 'Aquavaslui'], [/boto[șs]ani/i, 'Nova Apaserv Botoșani'], [/tulcea/i, 'Aquaserv Tulcea'], [/vrancea/i, 'CUP Focșani'], [/c[ăa]l[ăa]ra/i, 'Ecoaqua Călărași']], note: 'Water and sewerage are run by your county’s regional operator. Villages not yet connected rely on wells and septic tanks.' },
  GR: { byRegion: [[/attica|athens/i, 'EYDAP'], [/thessaloniki|central macedonia/i, 'EYATH']], integrated: true },
  SE: { note: 'Water and sewerage are run by your kommun (e.g. Stockholm Vatten och Avfall).' },
  NO: { note: 'Water and sewerage are run by your kommune.' },
  DK: { byRegion: [[/copenhagen|københavn|hovedstaden|capital region/i, 'HOFOR']], note: 'Water is supplied by your local waterworks (vandværk).' },
  FI: { byRegion: [[/helsinki|uusimaa/i, 'HSY']], integrated: true },
  MT: { national: 'Water Services Corporation', integrated: true },
  CY: { note: 'Water is supplied by your municipal water board.' },
  TR: { byRegion: [[/istanbul/i, 'İSKİ'], [/ankara/i, 'ASKİ'], [/izmir/i, 'İZSU'], [/bursa/i, 'BUSKİ'], [/antalya/i, 'ASAT']], integrated: true },
  IL: { list: ['Mekorot (national bulk supplier)'], integrated: false, note: 'Homes and farms are billed by the municipal water corporation; farms often buy directly from Mekorot.' },
  CA: { byRegion: [[/toronto/i, 'Toronto Water'], [/vancouver|british columbia/i, 'Metro Vancouver'], [/montréal|montreal/i, "Service de l'eau de Montréal"], [/calgary/i, 'City of Calgary Water'], [/edmonton/i, 'EPCOR Water']], integrated: true, note: 'Water is supplied by your municipality; most rural farms use a private well and septic system.' },
  MX: { byRegion: [[/mexico city|ciudad de méxico|cdmx/i, 'SACMEX'], [/nuevo león|nuevo leon|monterrey/i, 'Agua y Drenaje de Monterrey'], [/jalisco|guadalajara/i, 'SIAPA']], integrated: true, note: 'Farms usually hold a CONAGUA water concession for irrigation wells.' },
  BR: { byRegion: [[/são paulo|sao paulo/i, 'Sabesp'], [/minas gerais/i, 'Copasa'], [/paraná|parana/i, 'Sanepar'], [/rio de janeiro/i, 'Águas do Rio'], [/santa catarina/i, 'Casan'], [/rio grande do sul/i, 'Corsan'], [/bahia/i, 'Embasa'], [/goiás|goias/i, 'Saneago'], [/pernambuco/i, 'Compesa'], [/ceará|ceara/i, 'Cagece'], [/distrito federal|brasília|brasilia/i, 'Caesb']], integrated: true },
  AR: { byRegion: [[/buenos aires|capital federal|caba/i, 'AySA'], [/córdoba|cordoba/i, 'Aguas Cordobesas'], [/santa fe/i, 'Aguas Santafesinas'], [/mendoza/i, 'AYSAM']], integrated: true },
  CL: { byRegion: [[/santiago|metropolitana/i, 'Aguas Andinas'], [/valparaíso|valparaiso/i, 'Esval'], [/biobío|biobio|ñuble|maule/i, 'Essbio']], integrated: true },
  CO: { byRegion: [[/bogot|cundinamarca/i, 'Acueducto de Bogotá (EAAB)'], [/antioquia|medellín|medellin/i, 'EPM'], [/valle del cauca|cali/i, 'EMCALI']], integrated: true },
  PE: { byRegion: [[/lima|callao/i, 'Sedapal'], [/arequipa/i, 'Sedapar']], integrated: true },
  AU: { byRegion: [[/new south wales|sydney/i, 'Sydney Water'], [/victoria|melbourne/i, 'Yarra Valley Water'], [/queensland|brisbane/i, 'Urban Utilities'], [/south australia/i, 'SA Water'], [/western australia/i, 'Water Corporation'], [/tasmania/i, 'TasWater'], [/northern territory/i, 'Power and Water Corporation'], [/australian capital|canberra/i, 'Icon Water']], integrated: true, note: 'Rural farms usually rely on rainwater, bores and irrigation licences.' },
  NZ: { byRegion: [[/auckland/i, 'Watercare'], [/wellington/i, 'Wellington Water'], [/canterbury|christchurch/i, 'Christchurch City Council']], integrated: true, note: 'Water is supplied by your district council.' },
  JP: { byRegion: [[/tokyo/i, 'Tokyo Metropolitan Waterworks', 'Tokyo Bureau of Sewerage'], [/osaka/i, 'Osaka City Waterworks']], note: 'Water and sewerage are run by your municipality.' },
  KR: { national: 'K-water', note: 'Cities run their own supply; K-water runs national and regional systems.' },
  CN: { byRegion: [[/beijing/i, 'Beijing Waterworks Group', 'Beijing Drainage Group'], [/shanghai/i, 'Shanghai Chengtou Water']] },
  IN: { byRegion: [[/delhi/i, 'Delhi Jal Board'], [/maharashtra|mumbai/i, 'BMC Hydraulic Engineer'], [/karnataka|bengaluru|bangalore/i, 'BWSSB'], [/tamil nadu|chennai/i, 'CMWSSB'], [/telangana|hyderabad/i, 'HMWSSB'], [/west bengal|kolkata/i, 'Kolkata Municipal Corporation']], integrated: true, note: 'Most farms irrigate from borewells or canals managed by the state irrigation department.' },
  PK: { byRegion: [[/karachi|sindh/i, 'Karachi Water and Sewerage Corporation'], [/lahore|punjab/i, 'WASA Lahore']], integrated: true },
  BD: { byRegion: [[/dhaka/i, 'Dhaka WASA'], [/chittagong|chattogram/i, 'Chattogram WASA']], integrated: true },
  SG: { national: "PUB, Singapore's National Water Agency", integrated: true },
  MY: { byRegion: [[/selangor|kuala lumpur|putrajaya/i, 'Air Selangor'], [/johor/i, 'Ranhill SAJ'], [/penang|pulau pinang/i, 'PBAPP']], sewerNational: 'Indah Water Konsortium' },
  TH: { byRegion: [[/bangkok|nonthaburi|samut prakan/i, 'Metropolitan Waterworks Authority', 'Bangkok Metropolitan Administration (Drainage and Sewerage)']], list: ['Provincial Waterworks Authority'], integrated: false, sewerNote: 'Outside Bangkok, sewerage is run by your municipality and many farms use septic tanks.' },
  PH: { byRegion: [[/metro manila|national capital|rizal|cavite/i, 'Maynilad', 'Manila Water']], note: 'Outside Metro Manila, water comes from your local water district.' },
  ID: { byRegion: [[/jakarta/i, 'PAM Jaya']], note: 'Water is supplied by your regional PDAM.' },
  VN: { byRegion: [[/hà nội|hanoi/i, 'Hanoi Water (Hawacom)'], [/hồ chí minh|ho chi minh|saigon/i, 'SAWACO']] },
  SA: { national: 'National Water Company', integrated: true },
  AE: { byRegion: [[/dubai/i, 'DEWA', 'Dubai Municipality'], [/abu dhabi/i, 'TAQA Distribution', 'ADSSC'], [/sharjah/i, 'SEWA']] },
  EG: { national: 'Holding Company for Water and Wastewater', integrated: true },
  MA: { byRegion: [[/casablanca/i, 'Lydec'], [/rabat/i, 'Redal']], list: ['ONEE (water branch)'], integrated: true },
  ZA: { byRegion: [[/johannesburg|gauteng/i, 'Johannesburg Water'], [/cape town|western cape/i, 'City of Cape Town'], [/durban|ethekwini|kwazulu/i, 'eThekwini Water and Sanitation']], integrated: true, note: 'Many farms use boreholes and septic tanks.' },
  KE: { byRegion: [[/nairobi/i, 'Nairobi City Water and Sewerage Company'], [/mombasa/i, 'Mombasa Water Supply and Sanitation Company'], [/kisumu/i, 'KIWASCO'], [/nyeri/i, 'NYEWASCO']], integrated: true, note: 'Outside towns, farms rely on boreholes, rivers and community water projects.' },
  NG: { byRegion: [[/lagos/i, 'Lagos Water Corporation'], [/abuja|federal capital/i, 'FCT Water Board']], note: 'Most farms use boreholes.' },
  GH: { national: 'Ghana Water Limited' },
  TZ: { byRegion: [[/dar es salaam/i, 'DAWASA']], integrated: true },
  ET: { byRegion: [[/addis/i, 'Addis Ababa Water and Sewerage Authority']], integrated: true },
  BG: { byRegion: [[/sofia|софия/i, 'Sofiyska Voda'], [/plovdiv/i, 'ViK Plovdiv'], [/varna/i, 'ViK Varna'], [/burgas/i, 'ViK Burgas']], note: 'Water and sewerage are run by your regional ViK company.' },
  HR: { byRegion: [[/zagreb/i, 'Vodoopskrba i odvodnja Zagreb'], [/split/i, 'Vodovod i kanalizacija Split'], [/rijeka|primorje/i, 'KD Vodovod i kanalizacija Rijeka'], [/osijek/i, 'Vodovod-Osijek']], note: 'Water and sewerage are run by your local public utility.' },
  SI: { byRegion: [[/ljubljana/i, 'JP VOKA SNAGA'], [/maribor/i, 'Mariborski vodovod']], note: 'Water and sewerage are run by your municipal public utility.' },
  SK: { byRegion: [[/bratislava/i, 'Bratislavská vodárenská spoločnosť'], [/trnava|nitra|trenčín|trencin/i, 'Západoslovenská vodárenská spoločnosť'], [/banská bystrica|banska bystrica|žilina|zilina/i, 'Stredoslovenská vodárenská spoločnosť'], [/košice|kosice|prešov|presov/i, 'Východoslovenská vodárenská spoločnosť']] },
  RS: { byRegion: [[/belgrade|beograd/i, 'Beogradski vodovod i kanalizacija'], [/novi sad|vojvodina/i, 'JKP Vodovod i kanalizacija Novi Sad']], note: 'Water and sewerage are run by your municipal JKP.' },
  UA: { byRegion: [[/kyiv|kiev/i, 'Kyivvodokanal'], [/kharkiv/i, 'Kharkivvodokanal'], [/odesa|odessa/i, 'Infox (Odesa Vodokanal)'], [/lviv/i, 'Lvivvodokanal'], [/dnipro/i, 'Dniprovodokanal']], note: 'Water and sewerage are run by your city vodokanal; most farms use wells.' },
  LT: { byRegion: [[/vilnius/i, 'Vilniaus vandenys'], [/kaunas/i, 'Kauno vandenys'], [/klaip/i, 'Klaipėdos vanduo']] },
  LV: { byRegion: [[/riga|rīga/i, 'Rīgas ūdens']], note: 'Water and sewerage are run by your municipality.' },
  EE: { byRegion: [[/tallinn|harju/i, 'Tallinna Vesi'], [/tartu/i, 'Tartu Veevärk']], note: 'Water and sewerage are run by your municipal water company.' },
  LU: { note: 'Water and sewerage are run by your commune; wastewater is treated by an intercommunal syndicate (e.g. SIDERO, SIDEST).' },
  IS: { byRegion: [[/reykjav|capital region|höfuðborgarsvæði/i, 'Veitur']], note: 'Water and sewerage are run by your municipality.' },
  UY: { national: 'OSE (Obras Sanitarias del Estado)' },
  CR: { national: 'AyA (Instituto Costarricense de Acueductos y Alcantarillados)' },
  PY: { byRegion: [[/asunción|asuncion|central/i, 'ESSAP']] },
  EC: { byRegion: [[/quito|pichincha/i, 'EPMAPS'], [/guayaquil|guayas/i, 'Interagua']] },
  BO: { byRegion: [[/la paz|el alto/i, 'EPSAS'], [/cochabamba/i, 'SEMAPA'], [/santa cruz/i, 'SAGUAPAC']] },
  GT: { byRegion: [[/guatemala/i, 'EMPAGUA']] },
  DO: { byRegion: [[/santo domingo/i, 'CAASD'], [/santiago/i, 'CORAASAN']], list: ['INAPA'] },
  JM: { national: 'National Water Commission' },
  TT: { national: 'WASA (Water and Sewerage Authority)' },
  JO: { byRegion: [[/amman|zarqa/i, 'Miyahuna'], [/irbid|ajloun|jerash|mafraq/i, 'Yarmouk Water Company'], [/aqaba/i, 'Aqaba Water']] },
  LB: { byRegion: [[/beirut|mount lebanon/i, 'Beirut and Mount Lebanon Water Establishment'], [/bekaa/i, 'Bekaa Water Establishment']] },
  QA: { national: 'Kahramaa', sewerNational: 'Ashghal' },
  KW: { national: 'Ministry of Electricity, Water and Renewable Energy' },
  OM: { national: 'Nama Water Services' },
  BH: { national: 'Electricity and Water Authority' },
  TN: { national: 'SONEDE', sewerNational: 'ONAS' },
  DZ: { national: 'Algérienne des Eaux', sewerNational: 'ONA (Office National de l’Assainissement)' },
  SN: { national: 'SEN’EAU', sewerNational: 'ONAS' },
  CI: { national: 'SODECI' },
  CM: { national: 'Camwater' },
  UG: { national: 'National Water and Sewerage Corporation' },
  RW: { national: 'WASAC' },
  ZM: { byRegion: [[/lusaka/i, 'Lusaka Water Supply and Sanitation Company']] },
  ZW: { byRegion: [[/harare/i, 'City of Harare Water']] },
  BW: { national: 'Water Utilities Corporation' },
  NA: { byRegion: [[/windhoek|khomas/i, 'City of Windhoek']], list: ['NamWater'] },
  MZ: { byRegion: [[/maputo/i, 'Águas da Região de Maputo']] },
  LK: { national: 'National Water Supply and Drainage Board' },
  NP: { byRegion: [[/kathmandu/i, 'Kathmandu Upatyaka Khanepani Limited']], list: ['Nepal Water Supply Corporation'] },
  KH: { byRegion: [[/phnom penh/i, 'Phnom Penh Water Supply Authority']] },
  TW: { byRegion: [[/taipei/i, 'Taipei Water Department']], list: ['Taiwan Water Corporation'] },
  HK: { national: 'Water Supplies Department', sewerNational: 'Drainage Services Department' },
  KZ: { byRegion: [[/almaty/i, 'Almaty Su'], [/astana/i, 'Astana Su Arnasy']] },
  GE: { byRegion: [[/tbilisi/i, 'Georgian Water and Power (GWP)']], list: ['United Water Supply Company of Georgia'] },
  AM: { national: 'Veolia Djur' },
  AZ: { national: 'Azersu' },
};

export function waterFor(cc, regionText = '', kind = 'water') {
  const w = WATER[cc];
  if (w) {
    const sewer = kind === 'sewage';
    // in most places one company runs both water and sewerage; only entries marked integrated:false split them
    const both = w.integrated !== false;
    if (sewer && w.sewerNational) return { names: [w.sewerNational], single: true, note: w.sewerNote };
    if (w.national && (!sewer || both)) return { names: [w.national], single: true, note: w.note, both: sewer };
    const hit = w.byRegion?.find(([re]) => re.test(regionText));
    if (hit) {
      const name = sewer ? (hit[2] || (both ? hit[1] : null)) : hit[1];
      if (name) return { names: [name], single: true, note: sewer ? (w.sewerNote || w.note) : w.note, both: sewer && !hit[2] };
    }
    if (w.list && (!sewer || both)) return { names: w.list, note: w.note, both: sewer };
    return { names: [], note: sewer ? (w.sewerNote || w.note) : w.note };
  }
  return legacyWaterFor(cc, regionText, kind);
}
