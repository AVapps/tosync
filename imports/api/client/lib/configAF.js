module.exports = {
	hdn: {
		nightEnd: { hour: 9, minute: 0 }, // o'clock LT
		nightStart: { hour: 21, minute: 0 } // o'clock LT
	},

  hdnSimuInstruction: {
		nightEnd: { hour: 6, minute: 0 }, // o'clock LT
		nightStart: { hour: 22, minute: 0 } // o'clock LT
	},

	hcaParJour: 4.0,
  hcParNJ: 5.0,

  preTSVr: 1.0,
  postTSVr: 0.5,

  Hcs: 4.0,
  demiHcs: 2.0,

  HcDelegation: 5.28,
  PVDelegation: 7.25,

  HcInsructionSol: 5.0,
  HcDemiInsructionSol: 2.5,
  PVInsructionSol: 7.0,
  PVDemiInsructionSol: 3.5,

  HcSimu: 5.0,
  HcDemiSimu: 3.0,

  HcSimuInstruction: 6.0,
  HcDemiSimuInstruction: 3.5,
  PVSimuInstruction: 9,
  PVDemiSimuInstruction: 5.5,

	coefMajoNuit: 0.50,
  coefPVCDB: 0.20,

	bonusEtape: 15/60,
  bonusEtape2100NM: 35/60,

	tsvMini: 5.74,

  hcPogo: 1.05,

	coefTSV: 1/1.64,
  coefTSV10: 1/1.45,

  coefPVHC: 1.13,

  PVMGA: 80,

  coefEchelon: {
    1: 1.00,
    2: 1.15,
    3: 1.30,
    4: 1.40,
    5: 1.50,
    6: 1.60,
    7: 1.70,
    8: 1.80,
    9: 1.90,
    10: 2.00
  },

  echelonParAnciennete: { 0: 1, 1:1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 4, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6, 12: 7, 13: 7, 14: 7, 15: 8, 16: 8, 17: 8, 18: 9, 19: 9, 20: 9, 21: 10 },

  classes: {
    CDB: [ 0, 1.55, 1.45, 1.35, 1.30, 1.25 ],
    OPL: [ 0, 1.08, 1.03, 0.98, 0.93, 0.88 ]
  },

  bonificationATPL: 0.06,

  coefCategorie: { A: 0.70, B: 0.85, C: 1.00 },

  coefFixeOPL: 0.665

}
