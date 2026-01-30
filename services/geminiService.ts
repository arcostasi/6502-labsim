
import { GoogleGenAI } from "@google/genai";

export const generateAssemblyCode = async (prompt: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "; Error: API Key not found in environment.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemPrompt = `
      You are an expert 6502 Assembly programmer.
      The user is simulating a Ben Eater style 6502 breadboard computer.

      Hardware Configuration:
      - RAM: $0000 - $3FFF
      - VIA (6522): Base Address $6000
        - Port B ($6000): Data Bus for LCD
        - Port A ($6001): Control Signals for LCD (Bit 0: E, Bit 1: RW, Bit 2: RS)
      - ROM: $8000 - $FFFF

      Task: Write 6502 Assembly code for the user's request.

      Constraints:
      - Use standard mnemonics (LDA, STA, etc.).
      - Use .ORG $8000 for the code start.
      - Add comments explaining lines.
      - If using the LCD, remember to toggle the E bit (Bit 0 of Port A) to send data.
      - Initialize the Stack Pointer if needed (LDX #$FF, TXS).
      - Ensure you define the Reset Vector at the end if you output a full program, BUT mostly prefer just the snippet starting at $8000.
      - Return ONLY the assembly code, no markdown backticks.
    `;

    const model = process.env.GEMINI_MODEL || 'gemini-3-pro-preview';

    const response = await ai.models.generateContent({
      model,
      contents: `Write code to: ${prompt}`,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text?.trim() || "; No code generated";
  } catch (error) {
    console.error(error);
    return "; Error generating code with Gemini.";
  }
};
