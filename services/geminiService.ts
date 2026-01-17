import { GoogleGenAI, Type } from "@google/genai";
import { Product, Category } from "../types";

// Tenta pegar a chave de diferentes fontes (Vercel/Local)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI(API_KEY);
} else {
  console.warn("Gemini API Key não encontrada. As funções de IA estarão desativadas.");
}

const MODEL_NAME = "gemini-1.5-flash"; // Usando a versão estável mais recente suportada pelo SDK gratuito

export const suggestCategory = async (productName: string): Promise<Category | null> => {
  if (!ai) return "Outros";
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Categorize the product "${productName}" into exactly one of these categories: "Ferramentas", "Material de Escritório", "Limpeza", "Outros". Return only the category name as a plain string.`,
    });

    const text = response.text?.trim();
    if (text && ["Ferramentas", "Material de Escritório", "Limpeza", "Outros"].includes(text)) {
      return text as Category;
    }
    return "Outros";
  } catch (error) {
    console.error("Error suggesting category:", error);
    return null;
  }
};

export const analyzeInventory = async (products: Product[]) => {
  if (!ai || products.length === 0) return null;

  // Include minStock in the prompt so AI knows the specific context for each item
  const inventoryList = products.map(p =>
    `${p.name}: ${p.quantity} units (Min Stock: ${p.minStock}) [${p.category}]`
  ).join("\n");

  const prompt = `
    Analyze this warehouse inventory list and provide a helpful summary in JSON format (Portuguese).
    Inventory:
    ${inventoryList}

    Consider an item "Low Stock" if its quantity is below its specific "Min Stock" value.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            lowStockAlerts: { type: Type.ARRAY, items: { type: Type.STRING } },
            restockSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error analyzing inventory:", error);
    throw error;
  }
};