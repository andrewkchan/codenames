const RED_TEAM = "RED_TEAM";
const BLUE_TEAM = "BLUE_TEAM";
const ROLE_SPYMASTER = "ROLE_SPYMASTER";
const ROLE_AGENT = "ROLE_AGENT";

const PHASE_BOOT = "BOOT"; // not actually used on server, kept here for consistency
const PHASE_LOBBY = "LOBBY";
const PHASE_GAME = "GAME";

const EMOJIS = {
  [RED_TEAM]: [
    0x1F482, 0x1F479, 0x1F47A, 0x1F92C, 0x1F608,
    0x1F483, 0x1F60D, 0x1F975, 0x1F385,
  ],
  [BLUE_TEAM]: [
    0x1F9D9, 0x1F9B9, 0x1F9DE, 0x1F47E, 0x1F976,
    0x1F628, 0x1F476, 0x1F478, 0x1F46E,
  ],
};

module.exports = {
  RED_TEAM,
  BLUE_TEAM,
  ROLE_SPYMASTER,
  ROLE_AGENT,
  PHASE_BOOT,
  PHASE_LOBBY,
  PHASE_GAME,
  EMOJIS,
};