/**
 * Static analyst price target seed from TOP100.md annex (March 14–15, 2026).
 * Used to fill price, avgPriceTarget, upsidePct, offAthPct when blank.
 */

export interface PriceTargetSeed {
  price: string;
  avgPriceTarget: string;
  upsidePct: string;
  offAthPct: string;
}

const ENTRIES: Array<[string, PriceTargetSeed]> = [
  // I. AI Semiconductors
  [
    "ASML",
    {
      price: "$1,384",
      avgPriceTarget: "$1,475",
      upsidePct: "+7%",
      offAthPct: "-5%",
    },
  ],
  [
    "NVDA",
    {
      price: "$115",
      avgPriceTarget: "$175",
      upsidePct: "+52%",
      offAthPct: "-25%",
    },
  ],
  [
    "TSM",
    {
      price: "$338",
      avgPriceTarget: "$429",
      upsidePct: "+27%",
      offAthPct: "-13%",
    },
  ],
  [
    "AVGO",
    {
      price: "$321",
      avgPriceTarget: "$380",
      upsidePct: "+18%",
      offAthPct: "-23%",
    },
  ],
  [
    "AMD",
    {
      price: "$192",
      avgPriceTarget: "$190",
      upsidePct: "-1%",
      offAthPct: "-17%",
    },
  ],
  [
    "MU",
    {
      price: "$104",
      avgPriceTarget: "$150",
      upsidePct: "+44%",
      offAthPct: "-34%",
    },
  ],
  [
    "MRVL",
    {
      price: "$90",
      avgPriceTarget: "$135",
      upsidePct: "+50%",
      offAthPct: "-22%",
    },
  ],
  [
    "ADI",
    {
      price: "$210",
      avgPriceTarget: "$225",
      upsidePct: "+7%",
      offAthPct: "-9%",
    },
  ],
  [
    "MCHP",
    {
      price: "$52",
      avgPriceTarget: "$72",
      upsidePct: "+38%",
      offAthPct: "-28%",
    },
  ],
  [
    "CRDO",
    {
      price: "$58",
      avgPriceTarget: "$75",
      upsidePct: "+29%",
      offAthPct: "-28%",
    },
  ],
  [
    "ARM",
    {
      price: "$117",
      avgPriceTarget: "$170",
      upsidePct: "+45%",
      offAthPct: "-38%",
    },
  ],
  [
    "GFS",
    {
      price: "$31",
      avgPriceTarget: "$38",
      upsidePct: "+23%",
      offAthPct: "-26%",
    },
  ],
  [
    "IONQ",
    {
      price: "$38",
      avgPriceTarget: "$65",
      upsidePct: "+71%",
      offAthPct: "-55%",
    },
  ],
  [
    "AMAT",
    {
      price: "$325",
      avgPriceTarget: "$425",
      upsidePct: "+31%",
      offAthPct: "-18%",
    },
  ],
  [
    "KLAC",
    {
      price: "$1,418",
      avgPriceTarget: "$1,750",
      upsidePct: "+23%",
      offAthPct: "-16%",
    },
  ],
  [
    "LRCX",
    {
      price: "$212",
      avgPriceTarget: "$275",
      upsidePct: "+30%",
      offAthPct: "-17%",
    },
  ],
  [
    "CDNS",
    {
      price: "$290",
      avgPriceTarget: "$380",
      upsidePct: "+31%",
      offAthPct: "-23%",
    },
  ],
  [
    "SNPS",
    {
      price: "$520",
      avgPriceTarget: "$620",
      upsidePct: "+19%",
      offAthPct: "-24%",
    },
  ],
  // II. AI Cloud & Compute
  [
    "MSFT",
    {
      price: "$395",
      avgPriceTarget: "$510",
      upsidePct: "+29%",
      offAthPct: "-29%",
    },
  ],
  [
    "AMZN",
    {
      price: "$213",
      avgPriceTarget: "$260",
      upsidePct: "+22%",
      offAthPct: "-12%",
    },
  ],
  [
    "META",
    {
      price: "$598",
      avgPriceTarget: "$700",
      upsidePct: "+17%",
      offAthPct: "-19%",
    },
  ],
  [
    "ORCL",
    {
      price: "$155",
      avgPriceTarget: "$249",
      upsidePct: "+61%",
      offAthPct: "-55%",
    },
  ],
  [
    "CRWV",
    {
      price: "$80",
      avgPriceTarget: "$121",
      upsidePct: "+51%",
      offAthPct: "-57%",
    },
  ],
  [
    "NBIS",
    {
      price: "$89",
      avgPriceTarget: "$110",
      upsidePct: "+24%",
      offAthPct: "-29%",
    },
  ],
  [
    "DELL",
    {
      price: "$104",
      avgPriceTarget: "$145",
      upsidePct: "+39%",
      offAthPct: "-42%",
    },
  ],
  [
    "HPE",
    {
      price: "$20",
      avgPriceTarget: "$24",
      upsidePct: "+20%",
      offAthPct: "-13%",
    },
  ],
  [
    "SMCI",
    {
      price: "$40",
      avgPriceTarget: "$60",
      upsidePct: "+50%",
      offAthPct: "-67%",
    },
  ],
  // III. AI Platforms & Infrastructure
  [
    "PLTR",
    {
      price: "$153",
      avgPriceTarget: "$190",
      upsidePct: "+24%",
      offAthPct: "-30%",
    },
  ],
  [
    "APP",
    {
      price: "$290",
      avgPriceTarget: "$420",
      upsidePct: "+45%",
      offAthPct: "-45%",
    },
  ],
  [
    "CSCO",
    {
      price: "$78",
      avgPriceTarget: "$89",
      upsidePct: "+14%",
      offAthPct: "-11%",
    },
  ],
  [
    "ANET",
    {
      price: "$247",
      avgPriceTarget: "$177",
      upsidePct: "-28%",
      offAthPct: "-20%",
    },
  ],
  [
    "FTNT",
    {
      price: "$83",
      avgPriceTarget: "$100",
      upsidePct: "+20%",
      offAthPct: "-24%",
    },
  ],
  [
    "ZS",
    {
      price: "$195",
      avgPriceTarget: "$270",
      upsidePct: "+38%",
      offAthPct: "-33%",
    },
  ],
  [
    "DDOG",
    {
      price: "$105",
      avgPriceTarget: "$155",
      upsidePct: "+48%",
      offAthPct: "-32%",
    },
  ],
  [
    "CIEN",
    {
      price: "$68",
      avgPriceTarget: "$84",
      upsidePct: "+24%",
      offAthPct: "-19%",
    },
  ],
  [
    "NTNX",
    {
      price: "$65",
      avgPriceTarget: "$90",
      upsidePct: "+38%",
      offAthPct: "-21%",
    },
  ],
  [
    "CTSH",
    {
      price: "$73",
      avgPriceTarget: "$82",
      upsidePct: "+12%",
      offAthPct: "-10%",
    },
  ],
  [
    "GLW",
    {
      price: "$47",
      avgPriceTarget: "$56",
      upsidePct: "+19%",
      offAthPct: "-8%",
    },
  ],
  [
    "SOUN",
    {
      price: "$8",
      avgPriceTarget: "$14",
      upsidePct: "+75%",
      offAthPct: "-67%",
    },
  ],
  [
    "VRT",
    {
      price: "$247",
      avgPriceTarget: "$280",
      upsidePct: "+13%",
      offAthPct: "-23%",
    },
  ],
  [
    "LITE",
    {
      price: "$665",
      avgPriceTarget: "$750",
      upsidePct: "+13%",
      offAthPct: "-19%",
    },
  ],
  [
    "ASTS",
    {
      price: "$86",
      avgPriceTarget: "$71",
      upsidePct: "-17%",
      offAthPct: "-34%",
    },
  ],
  // IV. Defense & Aerospace
  [
    "RTX",
    {
      price: "$139",
      avgPriceTarget: "$191",
      upsidePct: "+37%",
      offAthPct: "-10%",
    },
  ],
  [
    "NOC",
    {
      price: "$485",
      avgPriceTarget: "$540",
      upsidePct: "+11%",
      offAthPct: "-13%",
    },
  ],
  [
    "GE",
    {
      price: "$193",
      avgPriceTarget: "$357",
      upsidePct: "+85%",
      offAthPct: "-44%",
    },
  ],
  [
    "AXON",
    {
      price: "$490",
      avgPriceTarget: "$640",
      upsidePct: "+31%",
      offAthPct: "-29%",
    },
  ],
  [
    "MSI",
    {
      price: "$445",
      avgPriceTarget: "$510",
      upsidePct: "+15%",
      offAthPct: "-14%",
    },
  ],
  // V. Healthcare & Biotech
  [
    "VRTX",
    {
      price: "$492",
      avgPriceTarget: "$546",
      upsidePct: "+11%",
      offAthPct: "-5%",
    },
  ],
  [
    "TMO",
    {
      price: "$484",
      avgPriceTarget: "$620",
      upsidePct: "+28%",
      offAthPct: "-22%",
    },
  ],
  [
    "DHR",
    {
      price: "$196",
      avgPriceTarget: "$270",
      upsidePct: "+38%",
      offAthPct: "-26%",
    },
  ],
  [
    "ABT",
    {
      price: "$108",
      avgPriceTarget: "$140",
      upsidePct: "+30%",
      offAthPct: "-22%",
    },
  ],
  [
    "BSX",
    {
      price: "$69",
      avgPriceTarget: "$109",
      upsidePct: "+58%",
      offAthPct: "-37%",
    },
  ],
  [
    "SYK",
    {
      price: "$337",
      avgPriceTarget: "$390",
      upsidePct: "+16%",
      offAthPct: "-16%",
    },
  ],
  [
    "AMGN",
    {
      price: "$275",
      avgPriceTarget: "$305",
      upsidePct: "+11%",
      offAthPct: "-10%",
    },
  ],
  [
    "AZN",
    {
      price: "$78",
      avgPriceTarget: "$95",
      upsidePct: "+22%",
      offAthPct: "-13%",
    },
  ],
  [
    "ELV",
    {
      price: "$408",
      avgPriceTarget: "$560",
      upsidePct: "+37%",
      offAthPct: "-31%",
    },
  ],
  [
    "PODD",
    {
      price: "$225",
      avgPriceTarget: "$280",
      upsidePct: "+24%",
      offAthPct: "-20%",
    },
  ],
  [
    "HALO",
    {
      price: "$64",
      avgPriceTarget: "$100",
      upsidePct: "+56%",
      offAthPct: "-22%",
    },
  ],
  [
    "EXAS",
    {
      price: "$40",
      avgPriceTarget: "$70",
      upsidePct: "+75%",
      offAthPct: "-30%",
    },
  ],
  // VI. Energy, Power & Utilities
  [
    "CEG",
    {
      price: "$301",
      avgPriceTarget: "$406",
      upsidePct: "+35%",
      offAthPct: "-27%",
    },
  ],
  [
    "EQT",
    {
      price: "$52",
      avgPriceTarget: "$62",
      upsidePct: "+19%",
      offAthPct: "-10%",
    },
  ],
  [
    "OKLO",
    {
      price: "$58",
      avgPriceTarget: "$112",
      upsidePct: "+93%",
      offAthPct: "-70%",
    },
  ],
  [
    "DUK",
    {
      price: "$118",
      avgPriceTarget: "$130",
      upsidePct: "+10%",
      offAthPct: "-5%",
    },
  ],
  [
    "EXC",
    { price: "$44", avgPriceTarget: "$48", upsidePct: "+9%", offAthPct: "-8%" },
  ],
  [
    "PEG",
    {
      price: "$93",
      avgPriceTarget: "$105",
      upsidePct: "+13%",
      offAthPct: "-5%",
    },
  ],
  [
    "NRG",
    {
      price: "$98",
      avgPriceTarget: "$120",
      upsidePct: "+22%",
      offAthPct: "-11%",
    },
  ],
  [
    "XEL",
    {
      price: "$69",
      avgPriceTarget: "$78",
      upsidePct: "+13%",
      offAthPct: "-12%",
    },
  ],
  [
    "WMB",
    {
      price: "$58",
      avgPriceTarget: "$68",
      upsidePct: "+17%",
      offAthPct: "-9%",
    },
  ],
  [
    "ENPH",
    {
      price: "$59",
      avgPriceTarget: "$85",
      upsidePct: "+44%",
      offAthPct: "-50%",
    },
  ],
  [
    "FSLR",
    {
      price: "$145",
      avgPriceTarget: "$200",
      upsidePct: "+38%",
      offAthPct: "-46%",
    },
  ],
  [
    "GNRC",
    {
      price: "$139",
      avgPriceTarget: "$170",
      upsidePct: "+22%",
      offAthPct: "-28%",
    },
  ],
  [
    "BE",
    {
      price: "$19",
      avgPriceTarget: "$26",
      upsidePct: "+37%",
      offAthPct: "-32%",
    },
  ],
  [
    "NXT",
    {
      price: "$90",
      avgPriceTarget: "$120",
      upsidePct: "+33%",
      offAthPct: "-32%",
    },
  ],
  [
    "CORZ",
    {
      price: "$11",
      avgPriceTarget: "$18",
      upsidePct: "+64%",
      offAthPct: "-50%",
    },
  ],
  // VII. Enterprise Software
  [
    "SAP",
    {
      price: "$260",
      avgPriceTarget: "$305",
      upsidePct: "+17%",
      offAthPct: "-13%",
    },
  ],
  [
    "INTU",
    {
      price: "$576",
      avgPriceTarget: "$730",
      upsidePct: "+27%",
      offAthPct: "-21%",
    },
  ],
  [
    "ADSK",
    {
      price: "$251",
      avgPriceTarget: "$332",
      upsidePct: "+32%",
      offAthPct: "-24%",
    },
  ],
  [
    "HUBS",
    {
      price: "$565",
      avgPriceTarget: "$750",
      upsidePct: "+33%",
      offAthPct: "-31%",
    },
  ],
  [
    "MDB",
    {
      price: "$270",
      avgPriceTarget: "$340",
      upsidePct: "+26%",
      offAthPct: "-25%",
    },
  ],
  [
    "TEAM",
    {
      price: "$198",
      avgPriceTarget: "$285",
      upsidePct: "+44%",
      offAthPct: "-31%",
    },
  ],
  [
    "WDAY",
    {
      price: "$132",
      avgPriceTarget: "$230",
      upsidePct: "+74%",
      offAthPct: "-52%",
    },
  ],
  [
    "VEEV",
    {
      price: "$237",
      avgPriceTarget: "$280",
      upsidePct: "+18%",
      offAthPct: "-17%",
    },
  ],
  [
    "DOCU",
    {
      price: "$74",
      avgPriceTarget: "$90",
      upsidePct: "+22%",
      offAthPct: "-20%",
    },
  ],
  // VIII. Industrial & Automation
  [
    "ABB",
    {
      price: "$48",
      avgPriceTarget: "$60",
      upsidePct: "+25%",
      offAthPct: "-16%",
    },
  ],
  [
    "TT",
    {
      price: "$330",
      avgPriceTarget: "$380",
      upsidePct: "+15%",
      offAthPct: "-14%",
    },
  ],
  [
    "LIN",
    {
      price: "$437",
      avgPriceTarget: "$480",
      upsidePct: "+10%",
      offAthPct: "-9%",
    },
  ],
  [
    "CMI",
    {
      price: "$325",
      avgPriceTarget: "$370",
      upsidePct: "+14%",
      offAthPct: "-14%",
    },
  ],
  [
    "PCAR",
    {
      price: "$98",
      avgPriceTarget: "$115",
      upsidePct: "+17%",
      offAthPct: "-17%",
    },
  ],
  [
    "FLEX",
    {
      price: "$36",
      avgPriceTarget: "$75",
      upsidePct: "+108%",
      offAthPct: "-10%",
    },
  ],
  [
    "ROP",
    {
      price: "$565",
      avgPriceTarget: "$620",
      upsidePct: "+10%",
      offAthPct: "-9%",
    },
  ],
  [
    "CTAS",
    {
      price: "$208",
      avgPriceTarget: "$230",
      upsidePct: "+11%",
      offAthPct: "-11%",
    },
  ],
  // IX. Consumer & Digital Commerce
  [
    "WMT",
    {
      price: "$126",
      avgPriceTarget: "$150",
      upsidePct: "+19%",
      offAthPct: "-7%",
    },
  ],
  [
    "COST",
    {
      price: "$1,020",
      avgPriceTarget: "$1,100",
      upsidePct: "+8%",
      offAthPct: "-5%",
    },
  ],
  [
    "BKNG",
    {
      price: "$5,200",
      avgPriceTarget: "$5,900",
      upsidePct: "+13%",
      offAthPct: "-10%",
    },
  ],
  [
    "MELI",
    {
      price: "$2,300",
      avgPriceTarget: "$2,750",
      upsidePct: "+20%",
      offAthPct: "-12%",
    },
  ],
  [
    "NFLX",
    {
      price: "$95",
      avgPriceTarget: "$130",
      upsidePct: "+37%",
      offAthPct: "-29%",
    },
  ],
  [
    "SHOP",
    {
      price: "$103",
      avgPriceTarget: "$135",
      upsidePct: "+31%",
      offAthPct: "-25%",
    },
  ],
  [
    "UBER",
    {
      price: "$73",
      avgPriceTarget: "$104",
      upsidePct: "+42%",
      offAthPct: "-28%",
    },
  ],
  [
    "DASH",
    {
      price: "$187",
      avgPriceTarget: "$230",
      upsidePct: "+23%",
      offAthPct: "-17%",
    },
  ],
  [
    "CVNA",
    {
      price: "$265",
      avgPriceTarget: "$290",
      upsidePct: "+9%",
      offAthPct: "-4%",
    },
  ],
  [
    "CPRT",
    {
      price: "$59",
      avgPriceTarget: "$68",
      upsidePct: "+15%",
      offAthPct: "-11%",
    },
  ],
  [
    "PM",
    {
      price: "$161",
      avgPriceTarget: "$175",
      upsidePct: "+9%",
      offAthPct: "-2%",
    },
  ],
  [
    "RBLX",
    {
      price: "$49",
      avgPriceTarget: "$65",
      upsidePct: "+33%",
      offAthPct: "-17%",
    },
  ],
  [
    "TTWO",
    {
      price: "$175",
      avgPriceTarget: "$200",
      upsidePct: "+14%",
      offAthPct: "-17%",
    },
  ],
  [
    "KKR",
    {
      price: "$117",
      avgPriceTarget: "$160",
      upsidePct: "+37%",
      offAthPct: "-23%",
    },
  ],
  [
    "VRSN",
    {
      price: "$195",
      avgPriceTarget: "$215",
      upsidePct: "+10%",
      offAthPct: "-15%",
    },
  ],
];

export const PRICE_TARGET_SEED = new Map<string, PriceTargetSeed>(ENTRIES);

export function getPriceTargetSeed(
  ticker: string,
): PriceTargetSeed | undefined {
  return PRICE_TARGET_SEED.get(ticker.toUpperCase());
}
