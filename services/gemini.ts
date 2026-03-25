
import { GoogleGenAI, Type } from "@google/genai";
import { Language } from "../types";

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || "";

export const summarizeIncident = async (description: string, lang: Language) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize the following incident report in a clear and concise way in ${lang}: ${description}`,
  });
  return response.text;
};

export const transcribeAudio = async (base64Audio: string, lang: Language) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { mimeType: 'audio/pcm;rate=16000', data: base64Audio } },
      { text: `Transcribe this audio report accurately in ${lang}.` }
    ],
  });
  return response.text;
};

export const predictResourceAllocation = async (incidentsCount: number) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on ${incidentsCount} recent incidents in Addis Ababa, predict the required patrol resources (Vehicles, Officers, ETA) for the next 4 hours. Return in JSON format with an array of assignments.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            officer: { type: Type.STRING },
            vehicle: { type: Type.STRING },
            shift: { type: Type.STRING },
            zone: { type: Type.STRING },
            eta: { type: Type.STRING },
          },
          required: ["officer", "vehicle", "shift", "zone", "eta"]
        }
      }
    }
  });
  try {
    return JSON.parse(response.text || "[]");
  } catch {
    return [];
  }
};

export const buildLegalCase = async (incident: any, lang: Language, victimName: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: `Build a formal legal case structure for the following incident: ${JSON.stringify(incident)}. 
    The victim's name is ${victimName || 'Unknown'}.
    Write the entire legal draft in ${lang}.
    Include Evidence Summary, Witness List Placeholder, and Suggested Legal Charges based on Ethiopian law.
    IMPORTANT: DO NOT use any markdown formatting like ### or **. Format as plain text.
    The title of this document MUST be exactly "SPA Ai".`,
  });
  return response.text;
};

export const translateText = async (text: string, targetLang: Language) => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: `Translate this text to ${targetLang}: ${text}`,
    });
    return response.text;
};

export const extractLocationFromAudio = async (base64Audio: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { mimeType, data: base64Audio } },
      { text: `Transcribe this audio and identify the location mentioned. Return a JSON object with 'lat' (number) and 'lng' (number) for the coordinates in Addis Ababa, Ethiopia, and 'name' (string) for the location name.` }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          name: { type: Type.STRING },
        },
        required: ["lat", "lng", "name"]
      }
    }
  });
  try {
    return JSON.parse(response.text || "{}");
  } catch {
    return null;
  }
};
