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
    "Vandal"= 2900,
    "Marshal" = 950,
    "Operator" = 4700,
    "Outlaw" = 2400,
    "Ares" = 1600,
    "Odin" = 3200
}

export enum Agents {
    "" = "No Agent selected",

    "Clay_PC_C" = "Raze",
    "Clay" = "Raze",

    "Pandemic_PC_C" = "Viper",
    "Pandemic" = "Viper",

    "Wraith_PC_C" = "Omen",
    "Wraith" = "Omen",

    "Hunter_PC_C" = "Sova",
    "Hunter" = "Sova",

    "Thorne_PC_C" = "Sage",
    "Thorne" = "Sage",

    "Phoenix_PC_C" = "Phoenix",
    "Phoenix" = "Phoenix",

    "Wushu_PC_C" = "Jett",
    "Wushu" = "Jett",

    "Gumshoe_PC_C" = "Cypher",
    "Gumshoe" = "Cypher",

    "Sarge_PC_C" = "Brimstone",
    "Sarge" = "Brimstone",

    "Breach_PC_C" = "Breach",
    "Breach" = "Breach",

    "Vampire_PC_C" = "Reyna",
    "Vampire" = "Reyna",

    "Killjoy_PC_C" = "Killjoy",
    "Killjoy" = "Killjoy",

    "Guide_PC_C" = "Skye",
    "Guide" = "Skye",

    "Stealth_PC_C" = "Yoru",
    "Stealth" = "Yoru",

    "Rift_PC_C" = "Astra",
    "Rift" = "Astra",

    "Grenadier_PC_C" = "KAYO", // No / for overlay image reasons
    "Grenadier" = "KAYO",

    "Deadeye_PC_C" = "Chamber",
    "Deadeye" = "Chamber",

    "Sprinter_PC_C" = "Neon",
    "Sprinter" = "Neon",

    "BountyHunter_PC_C" = "Fade",
    "BountyHunter" = "Fade",

    "Mage_PC_C" = "Harbor",
    "Mage" = "Harbor",

    "AggroBot_PC_C" = "Gekko",
    "AggroBot" = "Gekko",

    "Cable_PC_C" = "Deadlock",
    "Cable" = "Deadlock",

    "Sequoia_PC_C" = "Iso",
    "Sequoia" = "Iso",

    "Smonk_PC_C" = "Clove",
    "Smonk" = "Clove"
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
]