/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export enum WeaponsAndAbilities {
  "TX_Hud_Pistol_Classic" = "Classic",
  "TX_Hud_Pistol_Glock_S" = "Classic",

  "TX_Hud_Pistol_Slim" = "Shorty",
  "TX_Hud_Pistol_SawedOff_S" = "Shorty",

  "TX_Hud_Pistol_AutoPistol" = "Frenzy",
  "TX_Hud_AutoPistol" = "Frenzy",

  "TX_Hud_Pistol_Luger" = "Ghost",
  "TX_Hud_Pistol_Luger_S" = "Ghost",

  "TX_Hud_Pistol_Sheriff" = "Sheriff",
  "TX_Hud_Pistol_Revolver_S" = "Sheriff",

  "TX_Hud_Shotguns_Pump" = "Bucky",
  "TX_Hud_Pump" = "Bucky",

  "TX_Hud_Shotguns_Persuader" = "Judge",
  "TX_Hud_Shotguns_Spas12_S" = "Judge",

  "TX_Hud_SMGs_Vector" = "Stinger",
  "TX_Hud_Vector" = "Stinger",

  "TX_Hud_SMGs_Ninja" = "Spectre",
  "TX_Hud_SMG_MP5_S" = "Spectre",

  "TX_Hud_Rifles_Burst" = "Bulldog",
  "TX_Hud_Burst" = "Bulldog",

  "TX_Hud_Rifles_DMR" = "Guardian",
  "tx_hud_dmr" = "Guardian",

  "TX_Hud_Rifles_Ghost" = "Phantom",
  "TX_Hud_Assault_AR10A2_S" = "Phantom",

  "TX_Hud_Rifles_Volcano" = "Vandal",
  "TX_Hud_Volcano" = "Vandal",

  "TX_Hud_Sniper_Bolt" = "Marshal",
  "TX_Hud_Sniper_BoltAction_S" = "Marshal",

  "TX_Hud_Sniper_Operater" = "Operator",
  "TX_Hud_Operator" = "Operator",

  "TX_Hud_Sniper_DoubleSniper" = "Outlaw",
  "TX_Hud_DoubleSniper" = "Outlaw",

  "TX_Hud_LMG" = "Ares",

  "TX_Hud_HMG" = "Odin",

  "knife" = "Knife",
  "TX_Hud_Knife_Standard_S" = "Knife",

  "unknown" = "Unknown",

  // Abilities
  "TX_Breach_FusionBlast" = "Aftershock",
  "TX_Sarge_MolotovLauncher" = "Incendiary",
  "TX_Sarge_OrbitalStrike" = "Orbital Strike (ULT)",
  "TX_Pheonix_FireWall" = "Blaze",
  "TX_Pheonix_Molotov" = "Hot Hands",
  "TX_Hunter_ShockArrow" = "Shock Bolt",
  "TX_Hunter_BowBlast" = "Hunters Fury",
  "TX_Hud_Deadeye_Q_Pistol" = "Headhunter",
  "TX_Hud_Deadeye_X_GiantSlayer" = "Tour de Force (ULT)",
  "TX_Cable_FishingHook" = "Annihilation (ULT)",
  "TX_Hud_Wushu_X_Dagger" = "Blade Storm (ULT)",
  "TX_Neon_Ult" = "Overdrive (ULT)",
  "TX_Thorne_Heal" = "Resurrection (ULT)",
  "TX_Gumshoe_Tripwire" = "Trapwire",
  "TX_Gren_Icon" = "Frag/ment",
  "TX_Aggrobot_Bubbles" = "Mosh Pit",
  "TX_KJ_Bees" = "Nanoswarm",
  "tx_KJ_turret" = "Turret",
  "TX_Clay_Boomba" = "Boom bot",
  "TX_Clay_ClusterBomb" = "Paint Shells",
  "TX_Clay_RocketLauncher" = "Show stopper (ULT)",
  "TX_Guide4" = "Trail blazer",
  "TX_Pandemic_AcidLauncher" = "Snake bite",
}

export enum WeaponCosts {
  "Knife" = 0,
  "Classic" = 0,
  "Shorty" = 300,
  "Frenzy" = 450,
  "Ghost" = 500,
  "Sheriff" = 800,
  "Bucky" = 850,
  "Judge" = 1850,
  "Stinger" = 1100,
  "Spectre" = 1600,
  "Bulldog" = 2050,
  "Guardian" = 2250,
  "Phantom" = 2900,
  "Vandal" = 2900,
  "Marshal" = 950,
  "Operator" = 4700,
  "Outlaw" = 2400,
  "Ares" = 1600,
  "Odin" = 3200,
}

export enum Agents {
  "" = "No Agent selected",

  "Clay_PC_C" = "Raze",
  "Clay" = "Raze",
  "TX_Killfeed_Raze" = "Clay",

  "Pandemic_PC_C" = "Viper",
  "Pandemic" = "Viper",
  "TX_Killfeed_Viper" = "Pandemic",

  "Wraith_PC_C" = "Omen",
  "Wraith" = "Omen",
  "TX_Killfeed_Omen" = "Wraith",

  "Hunter_PC_C" = "Sova",
  "Hunter" = "Sova",
  "TX_Killfeed_Sova" = "Hunter",

  "Thorne_PC_C" = "Sage",
  "Thorne" = "Sage",
  "TX_Killfeed_Sage" = "Thorne",

  "Phoenix_PC_C" = "Phoenix",
  "Phoenix" = "Phoenix",
  "TX_Killfeed_Phoenix" = "Phoenix",

  "Wushu_PC_C" = "Jett",
  "Wushu" = "Jett",
  "TX_Killfeed_Jett" = "Wushu",

  "Gumshoe_PC_C" = "Cypher",
  "Gumshoe" = "Cypher",
  "TX_Killfeed_Cypher" = "Gumshoe",

  "Sarge_PC_C" = "Brimstone",
  "Sarge" = "Brimstone",
  "TX_Killfeed_Brimstone" = "Sarge",

  "Breach_PC_C" = "Breach",
  "Breach" = "Breach",
  "TX_Killfeed_Breach" = "Breach",

  "Vampire_PC_C" = "Reyna",
  "Vampire" = "Reyna",
  "TX_Killfeed_Reyna" = "Vampire",

  "Killjoy_PC_C" = "Killjoy",
  "Killjoy" = "Killjoy",
  "TX_Killfeed_Killjoy" = "Killjoy",

  "Guide_PC_C" = "Skye",
  "Guide" = "Skye",
  "TX_Killfeed_Skye" = "Guide",

  "Stealth_PC_C" = "Yoru",
  "Stealth" = "Yoru",
  "TX_Killfeed_Yoru" = "Stealth",

  "Rift_PC_C" = "Astra",
  "Rift" = "Astra",
  "TX_Killfeed_Astra" = "Rift",

  "Grenadier_PC_C" = "KAYO", // No / for overlay image reasons
  "Grenadier" = "KAYO",
  "TX_Killfeed_KAYO" = "Grenadier",

  "Deadeye_PC_C" = "Chamber",
  "Deadeye" = "Chamber",
  "TX_Killfeed_Chamber" = "Deadeye",

  "Sprinter_PC_C" = "Neon",
  "Sprinter" = "Neon",
  "TX_Killfeed_Neon" = "Sprinter",

  "BountyHunter_PC_C" = "Fade",
  "BountyHunter" = "Fade",
  "TX_Killfeed_Fade" = "BountyHunter",

  "Mage_PC_C" = "Harbor",
  "Mage" = "Harbor",
  "TX_Killfeed_Harbor" = "Mage",

  "Aggrobot_PC_C" = "Gekko",
  "Aggrobot" = "Gekko",
  "TX_Killfeed_Gekko" = "Aggrobot",

  "Cable_PC_C" = "Deadlock",
  "Cable" = "Deadlock",
  "TX_Killfeed_Deadlock" = "Cable",

  "Sequoia_PC_C" = "Iso",
  "Sequoia" = "Iso",
  "TX_Killfeed_Iso" = "Sequoia",

  "Smonk_PC_C" = "Clove",
  "Smonk" = "Clove",
  "TX_Killfeed_Clove" = "Smonk",

  "Nox_PC_C" = "Vyse",
  "Nox" = "Vyse",
  "TX_Killfeed_Vyse" = "Nox",

  "Cashew_PC_C" = "Tejo",
  "Cashew" = "Tejo",
  "TX_Killfeed_Tejo" = "Cashew",

  "Terra_PC_C" = "Waylay",
  "Terra" = "Waylay",
  "TX_Killfeed_Waylay" = "Terra",
}

export enum Maps {
  "Infinityy" = "Abyss",
  "Triad" = "Haven",
  "Duality" = "Bind",
  "Bonsai" = "Split",
  "Ascent" = "Ascent",
  "Port" = "Icebox",
  "Foxtrot" = "Breeze",
  "Canyon" = "Fracture",
  "Pitt" = "Pearl",
  "Jam" = "Lotus",
  "Juliett" = "Sunset",
  "Range" = "Practice Range",
  "HURM_Alley" = "District",
  "HURM_Yard" = "Piazza ",
  "HURM_Bowl" = "Kasbah",
  "HURM_Helix" = "Drift",
}

export const Armor: string[] = ["None", "Light", "Heavy", "None", "Regen"] as const;

export const ranks: string[] = [
  "Unranked",
  "",
  "",
  "Iron_01",
  "Iron_02",
  "Iron_03",
  "Bronze_01",
  "Bronze_02",
  "Bronze_03",
  "Silver_01",
  "Silver_02",
  "Silver_03",
  "Gold_01",
  "Gold_02",
  "Gold_03",
  "Platinum_01",
  "Platinum_02",
  "Platinum_03",
  "Diamond_01",
  "Diamond_02",
  "Diamond_03",
  "Ascendant_1",
  "Ascendant_2",
  "Ascendant_3",
  "Immortal_01",
  "Immortal_02",
  "Immortal_03",
  "Radiant",
];
