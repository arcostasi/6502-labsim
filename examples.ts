
export interface CodeExample {
  id: string;
  name: string;
  description: string;
  code: string;
  type?: 'code' | 'rom';
  romPath?: string;
}

export const CODE_EXAMPLES: CodeExample[] = [
  {
    id: 'lcd-hello',
    name: 'LCD Hello World',
    description: 'Ben Eater style LCD display demo using VIA 6522',
    code: `; Ben Eater "Hello World"
; 6522 VIA Mapped to $6000
; Port B ($6000) = Data
; Port A ($6001) = Control (E=Bit0, RW=Bit1, RS=Bit2)

.ORG $8000

RESET:
  LDX #$FF
  TXS         ; Init Stack

  LDA #$FF
  STA $6002   ; Set DDRB (Data) to output
  STA $6003   ; Set DDRA (Control) to output

  ; Init LCD (Function Set: 8-bit, 2-line, 5x8)
  LDA #%00111000
  JSR LCD_INST

  ; Display On/Off Control (Display On, Cursor On, Blink Off)
  LDA #%00001110
  JSR LCD_INST

  ; Entry Mode Set (Increment, No Shift)
  LDA #%00000110
  JSR LCD_INST

  ; Clear Display
  LDA #%00000001
  JSR LCD_INST

  ; Print Characters
  LDA #"H"
  JSR LCD_CHAR
  LDA #"E"
  JSR LCD_CHAR
  LDA #"L"
  JSR LCD_CHAR
  LDA #"L"
  JSR LCD_CHAR
  LDA #"O"
  JSR LCD_CHAR
  LDA #" "
  JSR LCD_CHAR
  LDA #"W"
  JSR LCD_CHAR
  LDA #"O"
  JSR LCD_CHAR
  LDA #"R"
  JSR LCD_CHAR
  LDA #"L"
  JSR LCD_CHAR
  LDA #"D"
  JSR LCD_CHAR

LOOP:
  JMP LOOP

LCD_INST:
  JSR CHECK_BUSY
  STA $6000  ; Put instruction on Port B
  LDA #0     ; RS=0, RW=0, E=0
  STA $6001
  LDA #1     ; E=1 (Enable High)
  STA $6001
  LDA #0     ; E=0 (Enable Low - Latch)
  STA $6001
  RTS

LCD_CHAR:
  JSR CHECK_BUSY
  STA $6000  ; Put char on Port B
  LDA #%00000100 ; RS=1, RW=0, E=0
  STA $6001
  LDA #%00000101 ; E=1
  STA $6001
  LDA #%00000100 ; E=0
  STA $6001
  RTS

CHECK_BUSY:
  ; Simplified: Just return.
  ; Real HW would check Busy Flag, but for sim we assume instant.
  RTS
`
  },
  {
    id: 'serial-hello',
    name: 'Serial Hello World',
    description: 'Send "Hello World" via ACIA 6551 serial terminal',
    code: `; ACIA 6551 Serial "Hello World"
; ACIA Mapped to $5000-$5003
; $5000 = Data (TX/RX)
; $5001 = Status (R) / Reset (W)
; $5002 = Command
; $5003 = Control

.ORG $8000

; ACIA Registers
ACIA_DATA = $5000
ACIA_STAT = $5001
ACIA_CMD  = $5002
ACIA_CTRL = $5003

RESET:
  LDX #$FF
  TXS              ; Init Stack

  ; Initialize ACIA
  LDA #$00
  STA ACIA_STAT    ; Programmed reset
  LDA #$1F         ; 19200 baud, 8-N-1, internal clock
  STA ACIA_CTRL
  LDA #$0B         ; No parity, echo off, TX int off, RX int off, DTR active
  STA ACIA_CMD

  ; Print welcome message
  LDX #0
PRINT_LOOP:
  LDA MESSAGE,X
  BEQ DONE         ; If null terminator, done
  JSR SEND_CHAR
  INX
  JMP PRINT_LOOP

DONE:
  ; Send newline
  LDA #$0D         ; CR
  JSR SEND_CHAR

LOOP:
  JMP LOOP

; Send character in A via serial
SEND_CHAR:
  PHA
WAIT_TX:
  LDA ACIA_STAT
  AND #$10         ; Check TDRE (bit 4)
  BEQ WAIT_TX      ; Wait until TX empty
  PLA
  STA ACIA_DATA    ; Send character
  RTS

MESSAGE:
  .BYTE "Hello from 6502 Serial!", 0
`
  },
  {
    id: 'serial-echo',
    name: 'Serial Echo',
    description: 'Echo characters received via serial back to terminal',
    code: `; ACIA 6551 Serial Echo
; Type in the terminal and see characters echoed back
; ACIA Mapped to $5000-$5003

.ORG $8000

ACIA_DATA = $5000
ACIA_STAT = $5001
ACIA_CMD  = $5002
ACIA_CTRL = $5003

RESET:
  LDX #$FF
  TXS              ; Init Stack

  ; Initialize ACIA
  LDA #$00
  STA ACIA_STAT    ; Programmed reset
  LDA #$1F         ; 19200 baud, 8-N-1
  STA ACIA_CTRL
  LDA #$0B         ; No parity, DTR active
  STA ACIA_CMD

  ; Print prompt
  LDX #0
PRINT_PROMPT:
  LDA PROMPT,X
  BEQ MAIN_LOOP
  JSR SEND_CHAR
  INX
  JMP PRINT_PROMPT

MAIN_LOOP:
  ; Check for received character
  LDA ACIA_STAT
  AND #$08         ; Check RDRF (bit 3)
  BEQ MAIN_LOOP    ; No data, keep waiting

  ; Read and echo character
  LDA ACIA_DATA    ; Read received char
  JSR SEND_CHAR    ; Echo it back

  ; Check for CR (Enter)
  CMP #$0D
  BNE MAIN_LOOP

  ; Send LF after CR for newline
  LDA #$0A
  JSR SEND_CHAR
  JMP MAIN_LOOP

SEND_CHAR:
  PHA
WAIT_TX:
  LDA ACIA_STAT
  AND #$10         ; TDRE
  BEQ WAIT_TX
  PLA
  STA ACIA_DATA
  RTS

PROMPT:
  .BYTE "Echo Terminal Ready!", $0D, $0A
  .BYTE "Type something: ", 0
`
  },
  {
    id: 'counter',
    name: 'Binary Counter',
    description: 'Count from 0-255 on VIA Port B LEDs',
    code: `; Binary Counter on VIA Port B
; Watch the LEDs count in binary!
; Set clock speed to SLOW or MEDIUM to see it

.ORG $8000

VIA_PORTB = $6000
VIA_DDRB  = $6002

RESET:
  LDX #$FF
  TXS              ; Init Stack

  ; Set Port B as output
  LDA #$FF
  STA VIA_DDRB

  ; Start counter at 0
  LDA #0

COUNT_LOOP:
  STA VIA_PORTB    ; Output to LEDs

  ; Delay loop
  LDX #$FF
DELAY1:
  LDY #$FF
DELAY2:
  DEY
  BNE DELAY2
  DEX
  BNE DELAY1

  ; Increment and continue
  CLC
  ADC #1
  JMP COUNT_LOOP
`
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci Sequence',
    description: 'Calculate Fibonacci numbers and display on Serial Terminal',
    code: `; Fibonacci Sequence on Serial Terminal
; Displays: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233...

.ORG $8000

; ACIA Registers
ACIA_DATA = $5000
ACIA_STAT = $5001
ACIA_CMD  = $5002
ACIA_CTRL = $5003

; Zero page variables
FIB_A = $00
FIB_B = $01
FIB_C = $02
TEMP  = $03
HUNDREDS_FLAG = $04

RESET:
  LDX #$FF
  TXS

  ; Init ACIA
  LDA #$00
  STA ACIA_STAT    ; Programmed reset
  LDA #$1F         ; 19200 baud, 8-N-1
  STA ACIA_CTRL
  LDA #$0B         ; No parity, RTS low, TX/RX int off
  STA ACIA_CMD

  ; Print header
  LDX #0
PRINT_HEADER:
  LDA HEADER_MSG,X
  BEQ START_FIB
  JSR SEND_CHAR
  INX
  JMP PRINT_HEADER

START_FIB:
  ; Init Fibonacci: A=0, B=1
  LDA #0
  STA FIB_A
  LDA #1
  STA FIB_B

FIB_LOOP:
  ; C = A + B
  LDA FIB_A
  CLC
  ADC FIB_B
  STA FIB_C
  BCS OVERFLOW     ; Stop if overflow

  ; Display B (current fib number)
  LDA FIB_B
  JSR PRINT_NUM

  ; Print comma and space
  LDA #","
  JSR SEND_CHAR
  LDA #" "
  JSR SEND_CHAR

  ; Shift: A = B, B = C
  LDA FIB_B
  STA FIB_A
  LDA FIB_C
  STA FIB_B

  ; Small delay for visual effect
  LDY #$20
DELAY_OUTER:
  LDX #$FF
DELAY_INNER:
  DEX
  BNE DELAY_INNER
  DEY
  BNE DELAY_OUTER

  JMP FIB_LOOP

OVERFLOW:
  ; Print newline and done message
  LDA #$0D
  JSR SEND_CHAR
  LDX #0
PRINT_DONE:
  LDA DONE_MSG,X
  BEQ HALT
  JSR SEND_CHAR
  INX
  JMP PRINT_DONE

HALT:
  JMP HALT

; Print number in A as decimal (0-255)
PRINT_NUM:
  STA TEMP
  LDA #0
  STA HUNDREDS_FLAG
  LDX #0           ; Hundreds
  LDY #0           ; Tens

  ; Count hundreds
HUNDREDS:
  LDA TEMP
  CMP #100
  BCC DO_TENS
  SEC
  SBC #100
  STA TEMP
  INX
  JMP HUNDREDS

DO_TENS:
  LDA TEMP
  CMP #10
  BCC DO_ONES
  SEC
  SBC #10
  STA TEMP
  INY
  JMP DO_TENS

DO_ONES:
  ; Print hundreds if non-zero
  CPX #0
  BEQ SKIP_HUNDREDS
  TXA
  CLC
  ADC #"0"
  JSR SEND_CHAR
  LDA #1
  STA HUNDREDS_FLAG

SKIP_HUNDREDS:
  ; Print tens if hundreds printed or tens non-zero
  LDA HUNDREDS_FLAG
  BNE PRINT_TENS
  CPY #0
  BEQ SKIP_TENS
PRINT_TENS:
  TYA
  CLC
  ADC #"0"
  JSR SEND_CHAR

SKIP_TENS:
  ; Always print ones
  LDA TEMP
  CLC
  ADC #"0"
  JSR SEND_CHAR
  RTS

; Send character in A via serial
SEND_CHAR:
  PHA
WAIT_TX:
  LDA ACIA_STAT
  AND #$10         ; Check TDRE (bit 4)
  BEQ WAIT_TX
  PLA
  STA ACIA_DATA
  RTS

HEADER_MSG:
  .BYTE "Fibonacci Sequence:", $0D, $0A, 0

DONE_MSG:
  .BYTE "Overflow! Sequence complete.", 0
`
  },
  {
    id: 'memory-test',
    name: 'Memory Test',
    description: 'Test RAM by writing and reading patterns',
    code: `; RAM Memory Test
; Tests first 256 bytes of RAM
; Results shown on serial terminal

.ORG $8000

ACIA_DATA = $5000
ACIA_STAT = $5001
ACIA_CMD  = $5002
ACIA_CTRL = $5003

TEST_ADDR = $00    ; Start of test area

RESET:
  LDX #$FF
  TXS

  ; Init ACIA
  LDA #$00
  STA ACIA_STAT
  LDA #$1F
  STA ACIA_CTRL
  LDA #$0B
  STA ACIA_CMD

  ; Print header
  LDX #0
PRINT_HDR:
  LDA HEADER,X
  BEQ START_TEST
  JSR SEND_CHAR
  INX
  JMP PRINT_HDR

START_TEST:
  ; Test pattern $AA
  LDA #$AA
  JSR TEST_PATTERN

  ; Test pattern $55
  LDA #$55
  JSR TEST_PATTERN

  ; Test pattern $FF
  LDA #$FF
  JSR TEST_PATTERN

  ; Test pattern $00
  LDA #$00
  JSR TEST_PATTERN

  ; Print success
  LDX #0
PRINT_OK:
  LDA SUCCESS,X
  BEQ DONE
  JSR SEND_CHAR
  INX
  JMP PRINT_OK

DONE:
  JMP DONE

; Test RAM with pattern in A
TEST_PATTERN:
  PHA              ; Save pattern

  ; Print "Testing $XX..."
  LDX #0
PRINT_TEST:
  LDA TESTING,X
  BEQ DO_WRITE
  JSR SEND_CHAR
  INX
  JMP PRINT_TEST

DO_WRITE:
  PLA
  PHA              ; Get pattern
  JSR PRINT_HEX    ; Print pattern value

  ; Write pattern to RAM
  PLA
  PHA
  LDX #$10         ; Start at $10 (skip ZP vars)
WRITE_LOOP:
  STA TEST_ADDR,X
  INX
  BNE WRITE_LOOP

  ; Verify pattern
  PLA
  LDX #$10
VERIFY_LOOP:
  CMP TEST_ADDR,X
  BNE FAIL
  INX
  BNE VERIFY_LOOP

  ; Print OK
  LDA #" "
  JSR SEND_CHAR
  LDA #"O"
  JSR SEND_CHAR
  LDA #"K"
  JSR SEND_CHAR
  LDA #$0D
  JSR SEND_CHAR
  RTS

FAIL:
  ; Print FAIL
  LDA #" "
  JSR SEND_CHAR
  LDA #"F"
  JSR SEND_CHAR
  LDA #"A"
  JSR SEND_CHAR
  LDA #"I"
  JSR SEND_CHAR
  LDA #"L"
  JSR SEND_CHAR
  JMP DONE

; Print A as hex
PRINT_HEX:
  PHA
  LSR
  LSR
  LSR
  LSR
  JSR PRINT_NIBBLE
  PLA
  AND #$0F
  JSR PRINT_NIBBLE
  RTS

PRINT_NIBBLE:
  CMP #$0A
  BCC IS_DIGIT
  CLC
  ADC #"A"-10
  JMP SEND_CHAR
IS_DIGIT:
  CLC
  ADC #"0"
  JMP SEND_CHAR

SEND_CHAR:
  PHA
WAIT_TX:
  LDA ACIA_STAT
  AND #$10
  BEQ WAIT_TX
  PLA
  STA ACIA_DATA
  RTS

HEADER:
  .BYTE "=== RAM Memory Test ===", $0D, $0A, 0

TESTING:
  .BYTE "Testing $", 0

SUCCESS:
  .BYTE $0D, $0A, "All tests PASSED!", $0D, $0A, 0
`
  },
  {
    id: 'stack-demo',
    name: 'Stack Operations',
    description: 'Demonstrate stack push/pop operations',
    code: `; Stack Operations Demo
; Shows how the 6502 stack works
; Output via serial terminal

.ORG $8000

ACIA_DATA = $5000
ACIA_STAT = $5001
ACIA_CMD  = $5002
ACIA_CTRL = $5003

RESET:
  LDX #$FF
  TXS              ; Init stack at $01FF

  ; Init ACIA
  LDA #$00
  STA ACIA_STAT
  LDA #$1F
  STA ACIA_CTRL
  LDA #$0B
  STA ACIA_CMD

  ; Print header
  LDX #0
HDR:
  LDA HEADER,X
  BEQ DEMO
  JSR SEND_CHAR
  INX
  JMP HDR

DEMO:
  ; Show initial SP
  JSR PRINT_SP

  ; Push some values
  LDA #$AA
  PHA
  JSR PRINT_PUSH
  JSR PRINT_SP

  LDA #$BB
  PHA
  JSR PRINT_PUSH
  JSR PRINT_SP

  LDA #$CC
  PHA
  JSR PRINT_PUSH
  JSR PRINT_SP

  ; Pop values back
  JSR NEWLINE
  PLA
  JSR PRINT_POP
  JSR PRINT_SP

  PLA
  JSR PRINT_POP
  JSR PRINT_SP

  PLA
  JSR PRINT_POP
  JSR PRINT_SP

DONE:
  JMP DONE

PRINT_SP:
  LDX #0
SP_MSG:
  LDA SP_STR,X
  BEQ SP_VAL
  JSR SEND_CHAR
  INX
  JMP SP_MSG
SP_VAL:
  TSX              ; Get SP into X
  TXA
  JSR PRINT_HEX
  JSR NEWLINE
  RTS

PRINT_PUSH:
  PHA
  LDX #0
PUSH_MSG:
  LDA PUSHED,X
  BEQ PUSH_VAL
  JSR SEND_CHAR
  INX
  JMP PUSH_MSG
PUSH_VAL:
  PLA
  PHA
  JSR PRINT_HEX
  RTS

PRINT_POP:
  PHA
  LDX #0
POP_MSG:
  LDA POPPED,X
  BEQ POP_VAL
  JSR SEND_CHAR
  INX
  JMP POP_MSG
POP_VAL:
  PLA
  JSR PRINT_HEX
  RTS

NEWLINE:
  LDA #$0D
  JSR SEND_CHAR
  RTS

PRINT_HEX:
  PHA
  LSR
  LSR
  LSR
  LSR
  JSR NIBBLE
  PLA
  AND #$0F
  JSR NIBBLE
  RTS

NIBBLE:
  CMP #$0A
  BCC DIGIT
  CLC
  ADC #"A"-10
  JMP SEND_CHAR
DIGIT:
  CLC
  ADC #"0"
  JMP SEND_CHAR

SEND_CHAR:
  PHA
WAIT:
  LDA ACIA_STAT
  AND #$10
  BEQ WAIT
  PLA
  STA ACIA_DATA
  RTS

HEADER:
  .BYTE "=== Stack Demo ===", $0D, $0A, 0
SP_STR:
  .BYTE "SP = $", 0
PUSHED:
  .BYTE "PUSH $", 0
POPPED:
  .BYTE "POP  $", 0
`
  },
  {
    id: 'via-blink',
    name: 'LED Blink',
    description: 'Blink all VIA Port B LEDs on and off',
    code: `; LED Blink on VIA Port B
; All 8 LEDs blink together
; Set clock to SLOW to see effect

.ORG $8000

VIA_PORTB = $6000
VIA_DDRB  = $6002

RESET:
  LDX #$FF
  TXS

  ; Set Port B as output
  LDA #$FF
  STA VIA_DDRB

BLINK_LOOP:
  ; LEDs ON
  LDA #$FF
  STA VIA_PORTB
  JSR DELAY

  ; LEDs OFF
  LDA #$00
  STA VIA_PORTB
  JSR DELAY

  JMP BLINK_LOOP

DELAY:
  LDX #$FF
DELAY1:
  LDY #$FF
DELAY2:
  DEY
  BNE DELAY2
  DEX
  BNE DELAY1
  RTS
`
  },
  {
    id: 'knight-rider',
    name: 'Knight Rider',
    description: 'Classic LED chase effect on VIA Port B',
    code: `; Knight Rider LED Effect
; Single LED bounces back and forth
; Set clock to MEDIUM speed

.ORG $8000

VIA_PORTB = $6000
VIA_DDRB  = $6002

RESET:
  LDX #$FF
  TXS

  ; Set Port B as output
  LDA #$FF
  STA VIA_DDRB

  ; Start with leftmost LED
  LDA #$80

SCAN_RIGHT:
  STA VIA_PORTB
  JSR DELAY
  LSR              ; Shift right
  CMP #$01
  BNE SCAN_RIGHT

SCAN_LEFT:
  STA VIA_PORTB
  JSR DELAY
  ASL              ; Shift left
  CMP #$80
  BNE SCAN_LEFT

  JMP SCAN_RIGHT

DELAY:
  PHA
  LDX #$80
DELAY1:
  LDY #$FF
DELAY2:
  DEY
  BNE DELAY2
  DEX
  BNE DELAY1
  PLA
  RTS
`
  },
  {
    id: 'calculator',
    name: 'Simple Calculator',
    description: 'Add two numbers via serial input',
    code: `; Simple Serial Calculator
; Enter two single-digit numbers to add
; Example: Type "3" then "5" to get "3 + 5 = 8"

.ORG $8000

ACIA_DATA = $5000
ACIA_STAT = $5001
ACIA_CMD  = $5002
ACIA_CTRL = $5003

NUM1 = $00
NUM2 = $01
RESULT = $02

RESET:
  LDX #$FF
  TXS

  ; Init ACIA
  LDA #$00
  STA ACIA_STAT
  LDA #$1F
  STA ACIA_CTRL
  LDA #$0B
  STA ACIA_CMD

CALC_LOOP:
  ; Print prompt
  LDX #0
PROMPT:
  LDA PROMPT_MSG,X
  BEQ GET_NUM1
  JSR SEND_CHAR
  INX
  JMP PROMPT

GET_NUM1:
  JSR GET_DIGIT
  STA NUM1
  ; Echo the digit as ASCII
  CLC
  ADC #"0"
  JSR SEND_CHAR

  ; Print " + "
  LDA #" "
  JSR SEND_CHAR
  LDA #"+"
  JSR SEND_CHAR
  LDA #" "
  JSR SEND_CHAR

GET_NUM2:
  JSR GET_DIGIT
  STA NUM2
  ; Echo the digit as ASCII
  CLC
  ADC #"0"
  JSR SEND_CHAR

  ; Print " = "
  LDA #" "
  JSR SEND_CHAR
  LDA #"="
  JSR SEND_CHAR
  LDA #" "
  JSR SEND_CHAR

  ; Calculate result
  LDA NUM1
  CLC
  ADC NUM2
  STA RESULT

  ; Print result (0-18 max)
  LDA RESULT
  CMP #10
  BCC SINGLE_DIGIT

  ; Two digits
  LDA #"1"
  JSR SEND_CHAR
  LDA RESULT
  SEC
  SBC #10

SINGLE_DIGIT:
  CLC
  ADC #"0"
  JSR SEND_CHAR

  ; Newline
  LDA #$0D
  JSR SEND_CHAR

  JMP CALC_LOOP

; Get digit 0-9, return value in A
GET_DIGIT:
WAIT_KEY:
  LDA ACIA_STAT
  AND #$08
  BEQ WAIT_KEY
  LDA ACIA_DATA

  ; Validate 0-9
  CMP #"0"
  BCC WAIT_KEY
  CMP #":"         ; "9" + 1
  BCS WAIT_KEY

  ; Convert ASCII to value
  SEC
  SBC #"0"
  RTS

SEND_CHAR:
  PHA
WAIT_TX:
  LDA ACIA_STAT
  AND #$10
  BEQ WAIT_TX
  PLA
  STA ACIA_DATA
  RTS

PROMPT_MSG:
  .BYTE $0D, $0A, "Enter two digits: ", 0
`
  }
];

export const ROM_EXAMPLES: CodeExample[] = [
  {
    id: 'atari-colorbar',
    name: '🎮 Atari 2600 Colorbar',
    description: 'ROM: Color bar generator (loads into EEPROM/CART)',
    code: '; This is a pre-built Atari 2600 ROM cartridge.\n; It will be loaded into the EEPROM/CART slot automatically.\n; Use the LOAD ROM button on the EEPROM/CART board to load custom ROMs.',
    type: 'rom',
    romPath: '/roms/colorbar_generator.bin',
  },
];

export const ALL_EXAMPLES: CodeExample[] = [...CODE_EXAMPLES, ...ROM_EXAMPLES];

export const DEFAULT_EXAMPLE_ID = 'lcd-hello';
