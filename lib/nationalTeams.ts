// All world national teams, used for the user's "favorite team" identity choice.
//
// This is deliberately decoupled from the `teams` table (which only holds the
// qualified teams synced from the football API and is used for match
// predictions). The favorite team is purely cosmetic: it gives the user a flag
// shown next to their name in standings and member lists.
//
// Flags are rendered as emoji derived from the ISO 3166-1 alpha-2 code, so there
// are no hosted assets to break. The few football nations without a plain ISO
// flag (the UK home nations) use explicit tag-sequence emoji overrides.

export type NationalTeam = {
  code: string; // identity key stored on the profile (ISO alpha-2, or a custom key)
  name: string; // Italian display name
  flag: string; // emoji flag
};

// Football nations whose flag is not a simple ISO alpha-2 regional-indicator pair.
const FLAG_OVERRIDES: Record<string, string> = {
  "GB-ENG": "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", // England
  "GB-SCT": "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}", // Scotland
  "GB-WLS": "🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}", // Wales
  "GB-NIR": "🇬🇧", // Northern Ireland (no distinct emoji; fall back to UK)
};

/** Convert an ISO 3166-1 alpha-2 code to its emoji flag (regional indicators). */
export function flagEmoji(code: string): string {
  const override = FLAG_OVERRIDES[code];
  if (override) return override;
  if (!/^[A-Za-z]{2}$/.test(code)) return "🏳️";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// [code, Italian name] for every FIFA member national team. Sorted at use time.
const RAW: ReadonlyArray<readonly [string, string]> = [
  ["AF", "Afghanistan"],
  ["AL", "Albania"],
  ["DZ", "Algeria"],
  ["AS", "Samoa Americane"],
  ["AD", "Andorra"],
  ["AO", "Angola"],
  ["AI", "Anguilla"],
  ["AG", "Antigua e Barbuda"],
  ["AR", "Argentina"],
  ["AM", "Armenia"],
  ["AW", "Aruba"],
  ["AU", "Australia"],
  ["AT", "Austria"],
  ["AZ", "Azerbaigian"],
  ["BS", "Bahamas"],
  ["BH", "Bahrein"],
  ["BD", "Bangladesh"],
  ["BB", "Barbados"],
  ["BY", "Bielorussia"],
  ["BE", "Belgio"],
  ["BZ", "Belize"],
  ["BJ", "Benin"],
  ["BM", "Bermuda"],
  ["BT", "Bhutan"],
  ["BO", "Bolivia"],
  ["BA", "Bosnia ed Erzegovina"],
  ["BW", "Botswana"],
  ["BR", "Brasile"],
  ["VG", "Isole Vergini Britanniche"],
  ["BN", "Brunei"],
  ["BG", "Bulgaria"],
  ["BF", "Burkina Faso"],
  ["BI", "Burundi"],
  ["KH", "Cambogia"],
  ["CM", "Camerun"],
  ["CA", "Canada"],
  ["CV", "Capo Verde"],
  ["KY", "Isole Cayman"],
  ["CF", "Repubblica Centrafricana"],
  ["TD", "Ciad"],
  ["CL", "Cile"],
  ["CN", "Cina"],
  ["TW", "Taipei Cinese"],
  ["CO", "Colombia"],
  ["KM", "Comore"],
  ["CG", "Congo"],
  ["CD", "Congo RD"],
  ["CK", "Isole Cook"],
  ["CR", "Costa Rica"],
  ["CI", "Costa d'Avorio"],
  ["HR", "Croazia"],
  ["CU", "Cuba"],
  ["CW", "Curaçao"],
  ["CY", "Cipro"],
  ["CZ", "Repubblica Ceca"],
  ["DK", "Danimarca"],
  ["DJ", "Gibuti"],
  ["DM", "Dominica"],
  ["DO", "Repubblica Dominicana"],
  ["EC", "Ecuador"],
  ["EG", "Egitto"],
  ["SV", "El Salvador"],
  ["GB-ENG", "Inghilterra"],
  ["GQ", "Guinea Equatoriale"],
  ["ER", "Eritrea"],
  ["EE", "Estonia"],
  ["SZ", "Eswatini"],
  ["ET", "Etiopia"],
  ["FO", "Isole Fær Øer"],
  ["FJ", "Figi"],
  ["FI", "Finlandia"],
  ["FR", "Francia"],
  ["GF", "Guyana Francese"],
  ["GA", "Gabon"],
  ["GM", "Gambia"],
  ["GE", "Georgia"],
  ["DE", "Germania"],
  ["GH", "Ghana"],
  ["GR", "Grecia"],
  ["GD", "Grenada"],
  ["GP", "Guadalupa"],
  ["GU", "Guam"],
  ["GT", "Guatemala"],
  ["GN", "Guinea"],
  ["GW", "Guinea-Bissau"],
  ["GY", "Guyana"],
  ["HT", "Haiti"],
  ["HN", "Honduras"],
  ["HK", "Hong Kong"],
  ["HU", "Ungheria"],
  ["IS", "Islanda"],
  ["IN", "India"],
  ["ID", "Indonesia"],
  ["IR", "Iran"],
  ["IQ", "Iraq"],
  ["IE", "Irlanda"],
  ["IL", "Israele"],
  ["IT", "Italia"],
  ["JM", "Giamaica"],
  ["JP", "Giappone"],
  ["JO", "Giordania"],
  ["KZ", "Kazakistan"],
  ["KE", "Kenya"],
  ["KI", "Kiribati"],
  ["XK", "Kosovo"],
  ["KW", "Kuwait"],
  ["KG", "Kirghizistan"],
  ["LA", "Laos"],
  ["LV", "Lettonia"],
  ["LB", "Libano"],
  ["LS", "Lesotho"],
  ["LR", "Liberia"],
  ["LY", "Libia"],
  ["LI", "Liechtenstein"],
  ["LT", "Lituania"],
  ["LU", "Lussemburgo"],
  ["MO", "Macao"],
  ["MG", "Madagascar"],
  ["MW", "Malawi"],
  ["MY", "Malesia"],
  ["MV", "Maldive"],
  ["ML", "Mali"],
  ["MT", "Malta"],
  ["MH", "Isole Marshall"],
  ["MQ", "Martinica"],
  ["MR", "Mauritania"],
  ["MU", "Mauritius"],
  ["MX", "Messico"],
  ["FM", "Micronesia"],
  ["MD", "Moldavia"],
  ["MC", "Monaco"],
  ["MN", "Mongolia"],
  ["ME", "Montenegro"],
  ["MS", "Montserrat"],
  ["MA", "Marocco"],
  ["MZ", "Mozambico"],
  ["MM", "Myanmar"],
  ["NA", "Namibia"],
  ["NR", "Nauru"],
  ["NP", "Nepal"],
  ["NL", "Paesi Bassi"],
  ["NC", "Nuova Caledonia"],
  ["NZ", "Nuova Zelanda"],
  ["NI", "Nicaragua"],
  ["NE", "Niger"],
  ["NG", "Nigeria"],
  ["GB-NIR", "Irlanda del Nord"],
  ["MK", "Macedonia del Nord"],
  ["KP", "Corea del Nord"],
  ["NO", "Norvegia"],
  ["OM", "Oman"],
  ["PK", "Pakistan"],
  ["PW", "Palau"],
  ["PS", "Palestina"],
  ["PA", "Panama"],
  ["PG", "Papua Nuova Guinea"],
  ["PY", "Paraguay"],
  ["PE", "Perù"],
  ["PH", "Filippine"],
  ["PL", "Polonia"],
  ["PT", "Portogallo"],
  ["PR", "Porto Rico"],
  ["QA", "Qatar"],
  ["RE", "Riunione"],
  ["RO", "Romania"],
  ["RU", "Russia"],
  ["RW", "Ruanda"],
  ["KN", "Saint Kitts e Nevis"],
  ["LC", "Saint Lucia"],
  ["VC", "Saint Vincent e Grenadine"],
  ["WS", "Samoa"],
  ["SM", "San Marino"],
  ["ST", "São Tomé e Príncipe"],
  ["SA", "Arabia Saudita"],
  ["GB-SCT", "Scozia"],
  ["SN", "Senegal"],
  ["RS", "Serbia"],
  ["SC", "Seychelles"],
  ["SL", "Sierra Leone"],
  ["SG", "Singapore"],
  ["SK", "Slovacchia"],
  ["SI", "Slovenia"],
  ["SB", "Isole Salomone"],
  ["SO", "Somalia"],
  ["ZA", "Sudafrica"],
  ["KR", "Corea del Sud"],
  ["SS", "Sud Sudan"],
  ["ES", "Spagna"],
  ["LK", "Sri Lanka"],
  ["SD", "Sudan"],
  ["SR", "Suriname"],
  ["SE", "Svezia"],
  ["CH", "Svizzera"],
  ["SY", "Siria"],
  ["TJ", "Tagikistan"],
  ["TZ", "Tanzania"],
  ["TH", "Thailandia"],
  ["TL", "Timor Est"],
  ["TG", "Togo"],
  ["TO", "Tonga"],
  ["TT", "Trinidad e Tobago"],
  ["TN", "Tunisia"],
  ["TR", "Turchia"],
  ["TM", "Turkmenistan"],
  ["TC", "Isole Turks e Caicos"],
  ["TV", "Tuvalu"],
  ["UG", "Uganda"],
  ["UA", "Ucraina"],
  ["AE", "Emirati Arabi Uniti"],
  ["GB", "Regno Unito"],
  ["US", "Stati Uniti"],
  ["UY", "Uruguay"],
  ["UZ", "Uzbekistan"],
  ["VU", "Vanuatu"],
  ["VE", "Venezuela"],
  ["VN", "Vietnam"],
  ["VI", "Isole Vergini Americane"],
  ["GB-WLS", "Galles"],
  ["YE", "Yemen"],
  ["ZM", "Zambia"],
  ["ZW", "Zimbabwe"],
];

/** All national teams, sorted alphabetically by Italian name. */
export const NATIONAL_TEAMS: NationalTeam[] = RAW.map(([code, name]) => ({
  code,
  name,
  flag: flagEmoji(code),
})).sort((a, b) => a.name.localeCompare(b.name, "it"));

const BY_CODE = new Map(NATIONAL_TEAMS.map((t) => [t.code, t]));

/** Look up a national team by its stored code, or null. */
export function teamByCode(code: string | null | undefined): NationalTeam | null {
  if (!code) return null;
  return BY_CODE.get(code) ?? null;
}

/** Emoji flag for a stored code, or empty string when unknown/unset. */
export function flagForCode(code: string | null | undefined): string {
  return teamByCode(code)?.flag ?? "";
}

/** True if the code corresponds to a known national team. */
export function isValidCode(code: string): boolean {
  return BY_CODE.has(code);
}
