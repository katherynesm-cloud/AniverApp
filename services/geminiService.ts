import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- VOCABULARY EXPANSION FOR INFINITE VARIETY ---
// IMPORTANT: All themes MUST contain explicit birthday elements (balloons, cake, candles, gifts, confetti).
// CRITICAL: NO TEXT REFERENCES ALLOWED IN THEMES.

const VIVID_THEMES = [
  "Explosão de confetes coloridos e muitos balões de aniversário brilhantes",
  "Tema tropical com um bolo de aniversário festivo, cores quentes, laranjas e rosas",
  "Estilo Pop Art moderno com chapéus de festa e cores primárias fortes",
  "Gradientes neon futuristas com silhuetas de velas de aniversário brilhantes",
  "Festival de cores com bandeirinhas decorativas (sem escrita) e fogos de artifício",
  "Balões metalizados (dourado e prata) flutuando em céu azul vibrante",
  "Padrões geométricos coloridos com caixas de presente espalhadas",
  "Um bolo de aniversário gigante e colorido com velas acesas",
  "Luzes de discoteca, brilhos intensos e balões de festa noturna",
  "Arco-íris vibrante com nuvens fofas e presentes em estilo 3D"
];

const SOBER_THEMES = [
  "Luxo minimalista com balões brancos e dourados elegantes",
  "Mármore elegante com texturas douradas e um bolo de aniversário sofisticado",
  "Tons pastéis suaves (verde sálvia, bege) com um presente embrulhado delicadamente",
  "Estilo botânico chique com moldura de folhas decorativas",
  "Papel texturizado artesanal com pintura de um cupcake em aquarela suave",
  "Fundo azul marinho profundo com chuva de confetes dourados finos",
  "Design monocromático sofisticado com silhueta de balões em relevo",
  "Estilo japonês minimalista com um pequeno doce cerimonial e flor",
  "Seda drapeada e fitas de cetim envolvendo uma caixa de presente chique",
  "Vidro fosco, luz suave e uma única vela de aniversário elegante"
];

const RANDOM_STYLES = [
  "Uma ilustração estilo livro infantil de animais em uma festa de aniversário",
  "Renderização 3D fofa (estilo Pixar) de uma pilha de presentes coloridos",
  "Arte abstrata com pinceladas de tinta a óleo formando balões festivos",
  "Colagem vintage com selos postais e carimbos decorativos (sem letras)",
  "Estilo Cyberpunk suave com um bolo de aniversário holográfico neon",
  "Fundo de madeira rústica com luzes de fada e bandeirinhas de festa lisas",
  "Tema de jardim encantado com uma mesa de chá de aniversário",
  "Estilo Art Deco (anos 20) com taças de brinde e confetes geométricos",
  "Nuvens de algodão doce e balões flutuantes em um céu de fantasia",
  "Textura de glitter realista cobrindo velas de aniversário"
];

/**
 * Helper to get a random item from an array
 */
const getRandom = (arr: string[]): string => {
  return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * Generates 3 STRONGLY DISTINCT prompts based on the requested archetypes
 */
const generateDynamicPrompts = (): string[] => {
  const negativePrompt = "NO TEXT, NO WORDS, NO TYPOGRAPHY, NO LETTERS, NO SIGNATURES. Picture only.";

  // Arquétipo 1: VIBRANTE e INTENSO
  const vividPrompt = `Vertical 9:16 birthday card background. STYLE: ${getRandom(VIVID_THEMES)}. MOOD: Energetic, Happy, Bright. ELEMENTS: Party balloons, confetti, cake, or gifts. COMPOSITION: Clean space at bottom. ${negativePrompt}`;

  // Arquétipo 2: SÓBRIO e ELEGANTE
  const soberPrompt = `Vertical 9:16 birthday card background. STYLE: ${getRandom(SOBER_THEMES)}. MOOD: Sophisticated, Elegant, Calm, Luxury. ELEMENTS: Minimalist decorations, balloons, flowers. COMPOSITION: Clean space at bottom. ${negativePrompt}`;

  // Arquétipo 3: SURPRESA / CRIATIVO
  const randomPrompt = `Vertical 9:16 birthday card background. STYLE: ${getRandom(RANDOM_STYLES)}. MOOD: Creative, Unique, Artistic. ELEMENTS: Cake, candles, or party hats. COMPOSITION: Clean space at bottom. ${negativePrompt}`;

  // Shuffle the order so "Vivid" isn't always first
  return [vividPrompt, soberPrompt, randomPrompt].sort(() => 0.5 - Math.random());
};

// --- API Functions ---

/**
 * Generates a birthday message text.
 */
export const generateBirthdayMessage = async (name: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Atue como um redator criativo de cartões de aniversário.
      Tarefa: Escreva UMA ÚNICA mensagem carinhosa e inédita para "${name}".
      
      Regras OBRIGATÓRIAS:
      1. Retorne APENAS o texto da mensagem. Nada mais.
      2. NÃO dê opções.
      3. NÃO use asteriscos (**), negrito ou aspas.
      4. Máximo de 100 caracteres.
      5. Evite frases clichês repetitivas. Seja variado e afetuoso.
      6. Idioma: Português do Brasil.
      
      Exemplo de resposta válida:
      Feliz dia, Maria! Que a alegria de hoje ilumine todo o seu novo ano!`,
    });
    
    // Clean up response just in case
    let text = response.text?.trim() || `Feliz Aniversário, ${name}! Muita luz e alegria!`;
    text = text.replace(/["*]/g, ''); // Remove quotes and asterisks
    text = text.replace(/^(Opção \d:|Aqui está:|Mensagem:)\s*/i, ''); // Remove common prefixes if they slip through
    
    // Hard limit check backup
    if (text.length > 120) {
        text = `Parabéns, ${name}! Que seu dia seja repleto de amor e felicidade!`;
    }
    
    return text;
  } catch (error) {
    console.error("Error generating message:", error);
    return `Parabéns, ${name}! Tudo de bom hoje e sempre!`;
  }
};

/**
 * Generates birthday card backgrounds or composites.
 * Uses strict archetypes to ensure variety.
 */
export const generateBirthdayImages = async (
  mode: 'WITH_PHOTO' | 'NO_PHOTO',
  userPhotoBase64: string | null
): Promise<string[]> => {
  
  // Generate 3 DISTINCT prompts (Vivid, Sober, Random)
  const prompts = generateDynamicPrompts();
  console.log("Generating with prompts:", prompts);

  if (mode === 'WITH_PHOTO' && userPhotoBase64) {
    // For photo mode, we ask the model to edit/composite the image
    const imagePromises = prompts.map(async (stylePrompt) => {
      try {
        // Strip header if present
        const cleanBase64 = userPhotoBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64
                }
              },
              {
                text: `Create a vertical (9:16 aspect ratio) birthday card composition integrating this person's photo. 
                The person should be central or artistically framed.
                PROMPT DETAILS: ${stylePrompt}. 
                CRITICAL: DO NOT GENERATE ANY TEXT, WORDS, OR LETTERS IN THE IMAGE.`
              }
            ]
          }
        });

        // Extract image from response
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/jpeg;base64,${part.inlineData.data}`;
          }
        }
        return null;
      } catch (e) {
        console.error("Error generating image variation:", e);
        return null;
      }
    });

    const results = await Promise.all(imagePromises);
    return results.filter((url): url is string => url !== null);

  } else {
    // No Photo Mode
    const imagePromises = prompts.map(async (stylePrompt) => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `${stylePrompt}. High quality, detailed, impressive. NO TEXT.` }]
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
           if (part.inlineData) {
            return `data:image/jpeg;base64,${part.inlineData.data}`;
          }
        }
        return null;
      } catch (e) {
         console.error("Error generating image variation:", e);
         return null;
      }
    });

    const results = await Promise.all(imagePromises);
    return results.filter((url): url is string => url !== null);
  }
};