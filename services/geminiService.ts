import { GoogleGenAI, Type } from "@google/genai";
import { Product, Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

export const suggestCategory = async (productName: string): Promise<Category | null> => {
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
  if (products.length === 0) return null;

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
            summary: { type: Type.STRING, description: "A brief overview of the inventory status." },
            lowStockAlerts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of items that seem critically low based on their minimum stock levels."
            },
            restockSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "General advice on what to buy next."
            }
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