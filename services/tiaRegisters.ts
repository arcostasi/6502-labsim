/**
 * TIA (Television Interface Adapter) Register Definitions
 * Atari 2600 - Accurate addresses for all TIA operations
 */

/**
 * TIA Write Registers
 * Address range: $00-$2C (mirrored throughout TIA space)
 */
export enum TIA_WRITE {
    VSYNC = 0x00,  // Vertical Sync Set-Clear
    VBLANK = 0x01,  // Vertical Blank Set-Clear
    WSYNC = 0x02,  // Wait for Horizontal Blank
    RSYNC = 0x03,  // Reset Horizontal Sync Counter
    NUSIZ0 = 0x04,  // Number-Size Player-Missile 0
    NUSIZ1 = 0x05,  // Number-Size Player-Missile 1
    COLUP0 = 0x06,  // Color-Luminance Player 0
    COLUP1 = 0x07,  // Color-Luminance Player 1
    COLUPF = 0x08,  // Color-Luminance Playfield
    COLUBK = 0x09,  // Color-Luminance Background
    CTRLPF = 0x0A,  // Control Playfield, Ball, Collisions
    REFP0 = 0x0B,  // Reflection Player 0
    REFP1 = 0x0C,  // Reflection Player 1
    PF0 = 0x0D,  // Playfield Register Byte 0
    PF1 = 0x0E,  // Playfield Register Byte 1
    PF2 = 0x0F,  // Playfield Register Byte 2
    RESP0 = 0x10,  // Reset Player 0
    RESP1 = 0x11,  // Reset Player 1
    RESM0 = 0x12,  // Reset Missile 0
    RESM1 = 0x13,  // Reset Missile 1
    RESBL = 0x14,  // Reset Ball
    AUDC0 = 0x15,  // Audio Control 0
    AUDC1 = 0x16,  // Audio Control 1
    AUDF0 = 0x17,  // Audio Frequency 0
    AUDF1 = 0x18,  // Audio Frequency 1
    AUDV0 = 0x19,  // Audio Volume 0
    AUDV1 = 0x1A,  // Audio Volume 1
    GRP0 = 0x1B,  // Graphics Player 0
    GRP1 = 0x1C,  // Graphics Player 1
    ENAM0 = 0x1D,  // Graphics Enable Missile 0
    ENAM1 = 0x1E,  // Graphics Enable Missile 1
    ENABL = 0x1F,  // Graphics Enable Ball
    HMP0 = 0x20,  // Horizontal Motion Player 0
    HMP1 = 0x21,  // Horizontal Motion Player 1
    HMM0 = 0x22,  // Horizontal Motion Missile 0
    HMM1 = 0x23,  // Horizontal Motion Missile 1
    HMBL = 0x24,  // Horizontal Motion Ball
    VDELP0 = 0x25,  // Vertical Delay Player 0
    VDELP1 = 0x26,  // Vertical Delay Player 1
    VDELBL = 0x27,  // Vertical Delay Ball
    RESMP0 = 0x28,  // Reset Missile 0 to Player 0
    RESMP1 = 0x29,  // Reset Missile 1 to Player 1
    HMOVE = 0x2A,  // Apply Horizontal Motion
    HMCLR = 0x2B,  // Clear Horizontal Motion Registers
    CXCLR = 0x2C,  // Clear Collision Latches
}

/**
 * TIA Read Registers
 * Address range: $00-$0D (bits 6-7 active, rest are data bus)
 */
export enum TIA_READ {
    CXM0P = 0x00,  // Collision M0-P1 (D7), M0-P0 (D6)
    CXM1P = 0x01,  // Collision M1-P0 (D7), M1-P1 (D6)
    CXP0FB = 0x02,  // Collision P0-PF (D7), P0-BL (D6)
    CXP1FB = 0x03,  // Collision P1-PF (D7), P1-BL (D6)
    CXM0FB = 0x04,  // Collision M0-PF (D7), M0-BL (D6)
    CXM1FB = 0x05,  // Collision M1-PF (D7), M1-BL (D6)
    CXBLPF = 0x06,  // Collision BL-PF (D7)
    CXPPMM = 0x07,  // Collision P0-P1 (D7), M0-M1 (D6)
    INPT0 = 0x08,  // Read Pot Port 0
    INPT1 = 0x09,  // Read Pot Port 1
    INPT2 = 0x0A,  // Read Pot Port 2
    INPT3 = 0x0B,  // Read Pot Port 3
    INPT4 = 0x0C,  // Read Input (Trigger) 0
    INPT5 = 0x0D,  // Read Input (Trigger) 1
}

/**
 * CTRLPF Register Bit Masks
 * Controls Playfield behavior, Ball size, and object priority
 */
export const CTRLPF_BITS = {
    /** Bit 0: Playfield reflection (0=repeat left half, 1=mirror left half) */
    REFLECT: 0x01,
    /** Bit 1: Score mode (left PF uses COLUP0, right PF uses COLUP1) */
    SCORE: 0x02,
    /** Bit 2: Playfield/Ball priority (0=players on top, 1=PF/BL on top) */
    PF_PRIORITY: 0x04,
    /** Bits 4-5: Ball size (00=1px, 01=2px, 10=4px, 11=8px) */
    BALL_SIZE: 0x30,
} as const;

/**
 * NUSIZ Register Bit Masks
 * Controls Player/Missile number-size modes
 */
export const NUSIZ_BITS = {
    /** Bits 0-2: Player/missile copies and spacing mode (0-7) */
    COPIES_MODE: 0x07,
    /** Bits 4-5: Missile size (00=1px, 01=2px, 10=4px, 11=8px) */
    MISSILE_SIZE: 0x30,
} as const;

/**
 * Player NUSIZ mode descriptions
 */
export const NUSIZ_MODES = {
    0: '1 copy',
    1: '2 copies close (16px apart)',
    2: '2 copies medium (32px apart)',
    3: '3 copies close (16px apart)',
    4: '2 copies wide (64px apart)',
    5: '1 copy double size',
    6: '3 copies medium (32px apart)',
    7: '1 copy quad size',
} as const;

/**
 * TIA Timing Constants
 */
export const TIA_TIMING = {
    /** Color clocks during horizontal blank (invisible) */
    HBLANK_CLOCKS: 68,
    /** Total color clocks per scanline */
    TOTAL_CLOCKS: 228,
    /** Visible screen width in pixels */
    VISIBLE_WIDTH: 160,
    /** CPU cycles per scanline (228 / 3) */
    CPU_CYCLES_PER_SCANLINE: 76,
    /** NTSC total scanlines per frame */
    NTSC_SCANLINES: 262,
    /** PAL total scanlines per frame */
    PAL_SCANLINES: 312,
    /** Player reset delay (color clocks) */
    PLAYER_RESET_DELAY: 5,
    /** Missile/Ball reset delay (color clocks) */
    MISSILE_RESET_DELAY: 4,
} as const;
