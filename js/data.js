// 広島県医療圏リソースマップ データ定義
// 病院座標は公式データおよびNAVITIME/Google Mapsより取得

const MEDICAL_DATA = {
  // 2次医療圏定義
  regions: {
    hiroshima: {
      id: "hiroshima",
      name: "広島",
      color: "#2563EB",
      // 構成市町村コード（国土数値情報準拠）
      municipalityCodes: ["34101", "34102", "34103", "34104", "34105", "34106", "34107", "34108", "34304", "34307", "34309", "34368", "34369"],
      municipalities: ["広島市", "安芸高田市", "府中町", "海田町", "熊野町", "坂町", "安芸太田町", "北広島町"],
      population: {
        2020: 1340000,
        2025: 1290000,
        2030: 1240000,
        2035: 1180000,
        2040: 1120000
      },
      beds: {
        total: 12762,
        highAcute: 2100,
        acute: 5200,
        recovery: 2800,
        chronic: 2662
      },
      avgTransportTime: 42,
      hospitals: [
        { name: "広島大学病院", beds: 740, type: "特定機能", departments: ["救急", "循環器", "脳神経外科", "がん"], lat: 34.379583, lng: 132.479000, address: "広島市南区霞1-2-3", url: "https://www.hiroshima-u.ac.jp/hosp" },
        { name: "県立広島病院", beds: 712, type: "基幹", departments: ["救急", "周産期", "がん", "循環器"], lat: 34.367103, lng: 132.466616, address: "広島市南区宇品神田1-5-54", url: "https://www.hph.pref.hiroshima.jp/" },
        { name: "広島市立広島市民病院", beds: 743, type: "基幹", departments: ["救急", "心臓血管外科", "脳卒中"], lat: 34.394722, lng: 132.459722, address: "広島市中区基町7-33", url: "https://www.city-hosp.naka.hiroshima.jp/" },
        { name: "広島赤十字・原爆病院", beds: 565, type: "地域医療支援", departments: ["救急", "血液内科", "緩和ケア"], lat: 34.385833, lng: 132.453889, address: "広島市中区千田町1-9-6", url: "https://www.hiroshima-med.jrc.or.jp/" },
        { name: "広島市立北部医療センター安佐市民病院", beds: 488, type: "地域医療支援", departments: ["救急", "がん", "脳神経外科"], lat: 34.486667, lng: 132.489722, address: "広島市安佐北区亀山南1-2-1", url: "https://www.asa-hosp.city.hiroshima.jp/" }
      ]
    },
    hiroshimaNishi: {
      id: "hiroshimaNishi",
      name: "広島西",
      color: "#8B5CF6",
      municipalityCodes: ["34211", "34213"],
      municipalities: ["大竹市", "廿日市市"],
      population: {
        2020: 140000,
        2025: 133000,
        2030: 126000,
        2035: 118000,
        2040: 110000
      },
      beds: {
        total: 1850,
        highAcute: 150,
        acute: 680,
        recovery: 520,
        chronic: 500
      },
      avgTransportTime: 48,
      hospitals: [
        { name: "JA広島総合病院", beds: 569, type: "地域医療支援", departments: ["救急", "周産期", "がん"], lat: 34.351944, lng: 132.318056, address: "廿日市市地御前1-3-3", url: "https://www.ja-hiroshimageneral.jp/" },
        { name: "広島西医療センター", beds: 438, type: "地域医療支援", departments: ["救急", "リハビリ", "神経内科"], lat: 34.240556, lng: 132.221389, address: "大竹市玖波4-1-1", url: "https://hiroshimanishi.hosp.go.jp/" },
        { name: "JA広島厚生連廿日市記念病院", beds: 191, type: "一般", departments: ["内科", "外科", "整形外科"], lat: 34.349444, lng: 132.331667, address: "廿日市市天神12-7", url: "https://www.kouseiren-h.jp/hatsukaichi/" }
      ]
    },
    kure: {
      id: "kure",
      name: "呉",
      color: "#DC2626",
      municipalityCodes: ["34202", "34215"],
      municipalities: ["呉市", "江田島市"],
      population: {
        2020: 240000,
        2025: 220000,
        2030: 200000,
        2035: 182000,
        2040: 165000
      },
      beds: {
        total: 3580,
        highAcute: 380,
        acute: 1200,
        recovery: 1100,
        chronic: 900
      },
      avgTransportTime: 44,
      hospitals: [
        { name: "呉医療センター", beds: 700, type: "地域医療支援", departments: ["救急", "がん", "循環器"], lat: 34.239036, lng: 132.565333, address: "呉市青山町3-1", url: "https://kure.hosp.go.jp/" },
        { name: "呉共済病院", beds: 400, type: "地域医療支援", departments: ["救急", "脳神経外科", "心臓血管外科"], lat: 34.237500, lng: 132.553056, address: "呉市西中央2-3-28", url: "https://www.kurekyosai.jp/" },
        { name: "中国労災病院", beds: 360, type: "地域医療支援", departments: ["救急", "整形外科", "リハビリ"], lat: 34.241389, lng: 132.558333, address: "呉市広多賀谷1-5-1", url: "https://www.chugokuh.johas.go.jp/" }
      ]
    },
    hiroshimaChuo: {
      id: "hiroshimaChuo",
      name: "広島中央",
      color: "#F97316",
      municipalityCodes: ["34212", "34214", "34431"],
      municipalities: ["東広島市", "竹原市", "大崎上島町"],
      population: {
        2020: 220000,
        2025: 215000,
        2030: 208000,
        2035: 198000,
        2040: 188000
      },
      beds: {
        total: 2450,
        highAcute: 280,
        acute: 920,
        recovery: 680,
        chronic: 570
      },
      avgTransportTime: 52,
      hospitals: [
        { name: "東広島医療センター", beds: 485, type: "地域医療支援", departments: ["救急", "循環器", "消化器"], lat: 34.448070, lng: 132.724120, address: "東広島市西条町寺家513", url: "https://higashihiroshima.hosp.go.jp/" },
        { name: "県立安芸津病院", beds: 150, type: "一般", departments: ["内科", "外科", "リハビリ"], lat: 34.329722, lng: 132.826389, address: "東広島市安芸津町三津4388", url: "https://www.akitsu.pref.hiroshima.jp/" }
      ]
    },
    bisan: {
      id: "bisan",
      name: "尾三",
      color: "#059669",
      municipalityCodes: ["34204", "34205", "34462"],
      municipalities: ["三原市", "尾道市", "世羅町"],
      population: {
        2020: 210000,
        2025: 195000,
        2030: 180000,
        2035: 165000,
        2040: 150000
      },
      beds: {
        total: 3200,
        highAcute: 320,
        acute: 1100,
        recovery: 980,
        chronic: 800
      },
      avgTransportTime: 46,
      hospitals: [
        { name: "尾道総合病院", beds: 352, type: "地域医療支援", departments: ["救急", "循環器", "がん"], lat: 34.407058, lng: 133.176161, address: "尾道市平原1-10-23", url: "https://onomichi-hospital.jp/" },
        { name: "尾道市立市民病院", beds: 285, type: "地域医療支援", departments: ["救急", "脳神経外科", "整形外科"], lat: 34.411667, lng: 133.181944, address: "尾道市新高山3-1170-177", url: "https://www.onomichi-mh.jp/" },
        { name: "三原市医師会病院", beds: 199, type: "地域医療支援", departments: ["救急", "内科", "外科"], lat: 34.397500, lng: 133.078889, address: "三原市円一町1-3-36", url: "https://www.mihara-ishikai.jp/" },
        { name: "興生総合病院", beds: 302, type: "一般", departments: ["救急", "循環器", "消化器"], lat: 34.395556, lng: 133.089722, address: "三原市円一町2-5-1", url: "https://www.kohsei.or.jp/" }
      ]
    },
    fukuyamaFuchu: {
      id: "fukuyamaFuchu",
      name: "福山・府中",
      color: "#E11D48",
      municipalityCodes: ["34207", "34208", "34545"],
      municipalities: ["福山市", "府中市", "神石高原町"],
      population: {
        2020: 520000,
        2025: 495000,
        2030: 468000,
        2035: 438000,
        2040: 408000
      },
      beds: {
        total: 5083,
        highAcute: 650,
        acute: 1850,
        recovery: 1380,
        chronic: 1203
      },
      avgTransportTime: 44,
      hospitals: [
        { name: "福山市民病院", beds: 506, type: "地域医療支援", departments: ["救急", "がん", "循環器", "周産期"], lat: 34.511019, lng: 133.397629, address: "福山市蔵王町5-23-1", url: "https://www.city.fukuyama.hiroshima.jp/site/hospital/" },
        { name: "福山医療センター", beds: 365, type: "地域医療支援", departments: ["救急", "がん", "呼吸器"], lat: 34.483611, lng: 133.366111, address: "福山市沖野上町4-14-17", url: "https://fukuyama.hosp.go.jp/" },
        { name: "中国中央病院", beds: 281, type: "地域医療支援", departments: ["救急", "循環器", "消化器"], lat: 34.490278, lng: 133.381667, address: "福山市御幸町大字上岩成148-13", url: "https://www.kouseiren-h.jp/chugoku/" },
        { name: "日本鋼管福山病院", beds: 350, type: "一般", departments: ["救急", "整形外科", "消化器"], lat: 34.454167, lng: 133.383611, address: "福山市大門町津之下1844", url: "https://www.nkfh.or.jp/" }
      ]
    },
    bihoku: {
      id: "bihoku",
      name: "備北",
      color: "#0891B2",
      municipalityCodes: ["34209", "34210"],
      municipalities: ["三次市", "庄原市"],
      population: {
        2020: 85000,
        2025: 77000,
        2030: 70000,
        2035: 63000,
        2040: 56000
      },
      beds: {
        total: 1420,
        highAcute: 120,
        acute: 480,
        recovery: 450,
        chronic: 370
      },
      avgTransportTime: 58,
      hospitals: [
        { name: "市立三次中央病院", beds: 315, type: "地域医療支援", departments: ["救急", "循環器", "がん"], lat: 34.782053, lng: 132.867632, address: "三次市東酒屋町531", url: "https://www.city.miyoshi.hiroshima.jp/site/miyoshi-chuo-hp/" },
        { name: "庄原赤十字病院", beds: 220, type: "一般", departments: ["救急", "内科", "外科"], lat: 34.855278, lng: 133.022222, address: "庄原市西本町2-7-10", url: "https://www.shobara.jrc.or.jp/" }
      ]
    }
  },

  // 医療圏ごとの構成市町村（GeoJSON取得用）
  municipalityMapping: {
    // 広島圏域
    "広島市中区": "hiroshima", "広島市東区": "hiroshima", "広島市南区": "hiroshima",
    "広島市西区": "hiroshima", "広島市安佐南区": "hiroshima", "広島市安佐北区": "hiroshima",
    "広島市安芸区": "hiroshima", "広島市佐伯区": "hiroshima",
    "安芸高田市": "hiroshima", "府中町": "hiroshima", "海田町": "hiroshima",
    "熊野町": "hiroshima", "坂町": "hiroshima", "安芸太田町": "hiroshima", "北広島町": "hiroshima",
    // 広島西圏域
    "大竹市": "hiroshimaNishi", "廿日市市": "hiroshimaNishi",
    // 呉圏域
    "呉市": "kure", "江田島市": "kure",
    // 広島中央圏域
    "東広島市": "hiroshimaChuo", "竹原市": "hiroshimaChuo", "大崎上島町": "hiroshimaChuo",
    // 尾三圏域
    "三原市": "bisan", "尾道市": "bisan", "世羅町": "bisan",
    // 福山・府中圏域
    "福山市": "fukuyamaFuchu", "府中市": "fukuyamaFuchu", "神石高原町": "fukuyamaFuchu",
    // 備北圏域
    "三次市": "bihoku", "庄原市": "bihoku"
  },

  // 広島県全体の統計
  prefectureStats: {
    totalPopulation2020: 2800000,
    totalPopulation2040: 2428000,
    totalBeds2023: 30294,
    avgTransportTime2022: 45.5,
    targetBeds2025: {
      highAcute: 2989,
      acute: 9118,
      recovery: 9747,
      chronic: 6760
    }
  },

  // 2040年医療需要予測
  demand2040: {
    elderly85Plus: 9.55,
    workingAgeDecrease: 274000,
    expectedDiseases: [
      { name: "循環器系疾患", changeRate: 1.35 },
      { name: "脳血管疾患", changeRate: 1.28 },
      { name: "肺炎", changeRate: 1.42 },
      { name: "骨折", changeRate: 1.38 },
      { name: "周産期", changeRate: 0.72 }
    ]
  },

  // 再編シナリオ案
  reorganizationScenarios: [
    {
      id: "current",
      name: "現行（7医療圏）",
      description: "現在の二次医療圏構成を維持",
      regions: ["hiroshima", "hiroshimaNishi", "kure", "hiroshimaChuo", "bisan", "fukuyamaFuchu", "bihoku"]
    },
    {
      id: "scenario1",
      name: "6医療圏案",
      description: "広島西を広島圏域に統合",
      merges: [{ from: ["hiroshima", "hiroshimaNishi"], to: "hiroshimaNishiMerged" }]
    },
    {
      id: "scenario2",
      name: "5医療圏案",
      description: "広島西を広島に、備北を広島中央に統合",
      merges: [
        { from: ["hiroshima", "hiroshimaNishi"], to: "hiroshimaNishiMerged" },
        { from: ["hiroshimaChuo", "bihoku"], to: "chuoBihokuMerged" }
      ]
    }
  ]
};

// データをグローバルにエクスポート
if (typeof window !== 'undefined') {
  window.MEDICAL_DATA = MEDICAL_DATA;
}
