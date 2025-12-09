import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Image as ImageIcon, Upload, ChevronLeft, Download, RefreshCw, Wand2, Edit3, Check, Type, ArrowUpDown } from 'lucide-react';
import { AppMode, AppState, GeneratedImage } from './types';
import { generateBirthdayMessage, generateBirthdayImages } from './services/geminiService';
import { Button } from './components/Button';
import { LoadingOverlay } from './components/LoadingOverlay';

// --- Logo Component for UI ---
const Logo: React.FC<{ size?: 'sm' | 'lg', className?: string }> = ({ size = 'sm', className = '' }) => {
  const isLarge = size === 'lg';
  const iconSize = isLarge ? 56 : 32;
  const textSize = isLarge ? 'text-5xl' : 'text-2xl';
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Cupcake Icon SVG */}
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        {/* Candle */}
        <rect x="47" y="10" width="6" height="25" rx="3" fill="#FCD34D" />
        <path d="M50 0 C50 0 55 8 50 15 C 45 8 50 0 50 0Z" fill="#F59E0B" />
        
        {/* Frosting (3 puffs) */}
        <circle cx="30" cy="55" r="18" fill="#FB7185" />
        <circle cx="70" cy="55" r="18" fill="#FB7185" />
        <circle cx="50" cy="45" r="22" fill="#F43F5E" />
        
        {/* Sprinkles */}
        <circle cx="50" cy="40" r="3" fill="white" fillOpacity="0.8"/>
        <circle cx="35" cy="55" r="2" fill="white" fillOpacity="0.6"/>
        <circle cx="65" cy="52" r="2" fill="white" fillOpacity="0.6"/>

        {/* Wrapper */}
        <path d="M25 65 L 32 95 L 68 95 L 75 65 Z" fill="#FDA4AF" />
        <path d="M35 65 L 40 95" stroke="#F43F5E" strokeWidth="2" strokeOpacity="0.3"/>
        <path d="M45 65 L 50 95" stroke="#F43F5E" strokeWidth="2" strokeOpacity="0.3"/>
        <path d="M55 65 L 50 95" stroke="#F43F5E" strokeWidth="2" strokeOpacity="0.3"/>
        <path d="M65 65 L 60 95" stroke="#F43F5E" strokeWidth="2" strokeOpacity="0.3"/>
      </svg>
      <span className={`font-handwriting font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600 ${textSize}`}>
        AniverApp
      </span>
    </div>
  );
};

const App: React.FC = () => {
  // --- State ---
  const [state, setState] = useState<AppState>({
    step: 0,
    mode: AppMode.NONE,
    userName: '',
    userPhoto: null,
    generatedMessage: '',
    generatedImages: [],
    selectedImageIndex: null,
    isGenerating: false,
    loadingMessage: '',
    error: null,
  });

  // Canvas ref for final composition
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Text editing state for the final step
  const [editText, setEditText] = useState('');
  const [fontSize, setFontSize] = useState(40); // Increased default font size for higher res
  const [textOffsetY, setTextOffsetY] = useState(0); // Vertical position offset
  const [fontFamily, setFontFamily] = useState('Dancing Script'); // Font selection
  const [textColor, setTextColor] = useState('#ffffff');
  const [textShadow, setTextShadow] = useState(true);

  // --- Helpers ---

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({ ...prev, userPhoto: reader.result as string, error: null }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startGeneration = async () => {
    if (!state.userName.trim()) {
      setState(prev => ({ ...prev, error: 'Por favor, digite o nome do aniversariante.' }));
      return;
    }
    if (state.mode === AppMode.WITH_PHOTO && !state.userPhoto) {
      setState(prev => ({ ...prev, error: 'Por favor, envie uma foto.' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      loadingMessage: 'A IA está escrevendo uma mensagem especial...',
      error: null 
    }));

    try {
      // 1. Generate Text
      const message = await generateBirthdayMessage(state.userName);
      
      setState(prev => ({ 
        ...prev, 
        generatedMessage: message,
        loadingMessage: 'A IA está pintando os cartões de aniversário... (Isso pode levar alguns segundos)'
      }));

      // 2. Generate Images
      const images = await generateBirthdayImages(
        state.mode === AppMode.WITH_PHOTO ? 'WITH_PHOTO' : 'NO_PHOTO',
        state.userPhoto
      );

      if (images.length === 0) {
        throw new Error("Não foi possível gerar as imagens. Tente novamente.");
      }

      const formattedImages: GeneratedImage[] = images.map((url, index) => ({
        id: `gen-${index}`,
        url,
        description: `Opção ${index + 1}`
      }));

      setState(prev => ({
        ...prev,
        generatedImages: formattedImages,
        generatedMessage: message,
        isGenerating: false,
        step: 2 // Go to selection
      }));

      // Initialize edit text
      setEditText(message);

    } catch (err) {
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: 'Ocorreu um erro ao criar o cartão. Verifique sua conexão e tente novamente.' 
      }));
    }
  };

  const selectImage = (index: number) => {
    setState(prev => ({ ...prev, selectedImageIndex: index, step: 3 }));
  };

  // --- Canvas Rendering for Step 3 (Editor) ---
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || state.selectedImageIndex === null) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = state.generatedImages[state.selectedImageIndex].url;

    img.onload = () => {
      // Set canvas to 9:16 aspect ratio (Stories format)
      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      // Draw Background Image with "cover" fit
      const scale = Math.max(width / img.width, height / img.height);
      const x = (width - img.width * scale) / 2;
      const y = (height - img.height * scale) / 2;
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // Overlay Dimming (bottom part for text readability)
      // UPDATED: Much softer gradient
      const gradientHeight = height * 0.45; // Start gradient lower down
      const gradientStartY = height - gradientHeight;
      
      const gradient = ctx.createLinearGradient(0, gradientStartY, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');       // Completely transparent at top
      gradient.addColorStop(0.3, 'rgba(0,0,0,0.05)');  // Very subtle transition
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.2)');   // Slight darkening
      gradient.addColorStop(1, 'rgba(0,0,0,0.45)');    // Max opacity reduced (was 0.8)
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, gradientStartY, width, gradientHeight);

      // Draw Text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Font settings
      const fontWeight = fontFamily === 'Poppins' ? '600' : 'bold';
      ctx.font = `${fontWeight} ${fontSize * 2}px "${fontFamily}", cursive`; // Scale font relative to canvas
      ctx.fillStyle = textColor;
      
      if (textShadow) {
        // Stronger glow effect on text to ensure readability without heavy background
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 25; // Increased blur for better "pop"
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
      } else {
        ctx.shadowColor = 'transparent';
      }

      // Wrap text logic
      const words = editText.split(' ');
      let line = '';
      const lines = [];
      const maxWidth = width * 0.80; // 80% width margin for safety
      // UPDATED: Increased line height slightly for better spacing
      const lineHeight = fontSize * 1.75;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      // Draw lines positioned at the bottom area
      const totalTextHeight = lines.length * lineHeight;
      // Position text: moved center point down from 0.85 to 0.89 to lower text about 1 line
      // Added textOffsetY for manual adjustment
      let textY = (height * 0.89) + textOffsetY - (totalTextHeight / 2); 

      for (let i = 0; i < lines.length; i++) {
        // Outline stroke for extra readability (optional but helpful)
        if (textShadow) {
           ctx.lineWidth = 3;
           ctx.strokeStyle = 'rgba(0,0,0,0.3)';
           ctx.strokeText(lines[i], width / 2, textY + (i * lineHeight));
        }
        ctx.fillText(lines[i], width / 2, textY + (i * lineHeight));
      }

      // --- NEW LOGO WATERMARK DRAWING (CUPCAKE) ---
      ctx.save();
      
      // Setup Text
      const logoText = "AniverApp";
      ctx.font = 'bold 50px "Dancing Script", cursive';
      ctx.textBaseline = 'top';
      const textMetrics = ctx.measureText(logoText);
      
      // Positioning (Top Right)
      const margin = 40;
      const logoX = width - margin;
      const logoY = 50;
      
      // Shadow for Visibility
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Draw Text
      ctx.textAlign = 'right';
      ctx.fillStyle = 'white';
      ctx.fillText(logoText, logoX, logoY);

      // --- Draw Cupcake Icon Manually ---
      const iconSize = 60;
      const iconX = logoX - textMetrics.width - iconSize - 15;
      const iconY = logoY - 5;
      
      // 1. Candle (Rect)
      ctx.fillStyle = '#FCD34D'; // Yellow-300
      ctx.fillRect(iconX + iconSize/2 - 3, iconY, 6, 20);
      
      // 2. Flame (Triangle/Teardrop approximation)
      ctx.beginPath();
      ctx.moveTo(iconX + iconSize/2, iconY - 10);
      ctx.quadraticCurveTo(iconX + iconSize/2 + 5, iconY, iconX + iconSize/2, iconY + 5);
      ctx.quadraticCurveTo(iconX + iconSize/2 - 5, iconY, iconX + iconSize/2, iconY - 10);
      ctx.fillStyle = '#F59E0B'; // Amber-500
      ctx.fill();

      // 3. Frosting (3 overlapping circles)
      // Center Puff (Big)
      ctx.beginPath();
      ctx.arc(iconX + iconSize/2, iconY + 30, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#F43F5E'; // Rose-500
      ctx.fill();
      // Left Puff (Small)
      ctx.beginPath();
      ctx.arc(iconX + iconSize/2 - 15, iconY + 38, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#FB7185'; // Rose-400
      ctx.fill();
      // Right Puff (Small)
      ctx.beginPath();
      ctx.arc(iconX + iconSize/2 + 15, iconY + 38, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#FB7185'; // Rose-400
      ctx.fill();
      
      // 4. Wrapper (Trapezoid)
      ctx.beginPath();
      ctx.moveTo(iconX + 12, iconY + 45); // Top Left
      ctx.lineTo(iconX + iconSize - 12, iconY + 45); // Top Right
      ctx.lineTo(iconX + iconSize - 8, iconY + 70); // Bottom Right
      ctx.lineTo(iconX + 8, iconY + 70); // Bottom Left
      ctx.closePath();
      ctx.fillStyle = '#FDA4AF'; // Rose-300
      ctx.fill();

      ctx.restore();
    };
  }, [state.selectedImageIndex, state.generatedImages, editText, fontSize, textOffsetY, fontFamily, textColor, textShadow]);

  useEffect(() => {
    if (state.step === 3) {
      drawCanvas();
    }
  }, [state.step, drawCanvas]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `aniverapp-${state.userName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  // --- Screens ---

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-4 flex flex-col items-center">
        <Logo size="lg" />
        <p className="text-slate-500 text-lg">Faça seus próprios cartões de aniversário.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
        <button
          onClick={() => setState(prev => ({ ...prev, mode: AppMode.WITH_PHOTO, step: 1 }))}
          className="group relative overflow-hidden bg-white p-6 rounded-2xl shadow-md border-2 border-slate-100 hover:border-pink-300 hover:shadow-xl transition-all text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Camera size={80} className="text-pink-500" />
          </div>
          <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-pink-600">
            <Camera size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Com Foto</h3>
          <p className="text-sm text-slate-500 mt-1">Sua foto num cenário festivo incrível.</p>
        </button>

        <button
          onClick={() => setState(prev => ({ ...prev, mode: AppMode.NO_PHOTO, step: 1 }))}
          className="group relative overflow-hidden bg-white p-6 rounded-2xl shadow-md border-2 border-slate-100 hover:border-indigo-300 hover:shadow-xl transition-all text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ImageIcon size={80} className="text-indigo-500" />
          </div>
          <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-indigo-600">
            <ImageIcon size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Sem Foto</h3>
          <p className="text-sm text-slate-500 mt-1">Arte elegante com balões e cores.</p>
        </button>
      </div>
    </div>
  );

  const renderInput = () => (
    <div className="w-full max-w-md mx-auto px-4 py-8 animate-in slide-in-from-right-8 duration-500">
      <div className="mb-6 flex items-center">
        <button 
          onClick={() => setState(prev => ({ ...prev, step: 0 }))}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft />
        </button>
        <h2 className="text-2xl font-bold ml-2 text-slate-800">
          {state.mode === AppMode.WITH_PHOTO ? 'Sua Foto' : 'Detalhes'}
        </h2>
      </div>

      <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Aniversariante</label>
          <input
            type="text"
            value={state.userName}
            onChange={(e) => setState(prev => ({ ...prev, userName: e.target.value, error: null }))}
            placeholder="Ex: Tia Maria"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
          />
        </div>

        {state.mode === AppMode.WITH_PHOTO && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Foto da Pessoa</label>
            <div className="relative group">
               <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors ${state.userPhoto ? 'border-pink-500 bg-pink-50' : 'border-slate-300 hover:border-pink-400 hover:bg-slate-50'}`}>
                {state.userPhoto ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden shadow-md">
                    <img src={state.userPhoto} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Trocar
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500 text-center">Toque para enviar foto</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {state.error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center">
            <span className="mr-2">⚠️</span> {state.error}
          </div>
        )}

        <Button onClick={startGeneration} fullWidth disabled={state.isGenerating}>
          {state.isGenerating ? 'Gerando...' : 'Criar Cartão Mágico ✨'}
        </Button>
      </div>
    </div>
  );

  const renderSelection = () => (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
             <button 
            onClick={() => setState(prev => ({ ...prev, step: 1 }))}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 mr-2"
          >
            <ChevronLeft />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Escolha o Modelo</h2>
        </div>
        <Button variant="outline" onClick={startGeneration} className="text-sm py-2">
          <RefreshCw className="w-4 h-4 mr-2 inline" /> Tentar Outros
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {state.generatedImages.map((img, idx) => (
          <div 
            key={img.id}
            onClick={() => selectImage(idx)}
            className="group cursor-pointer bg-white p-2 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-pink-300 transition-all duration-300 transform hover:-translate-y-1"
          >
            {/* Aspect ratio changed to 9/16 for vertical preview */}
            <div className="aspect-[9/16] rounded-xl overflow-hidden relative mb-3 bg-slate-100">
              <img src={img.url} alt={img.description} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                <span className="text-white font-bold px-4 py-2 bg-pink-500 rounded-full text-sm shadow-lg">
                  Editar Este
                </span>
              </div>
            </div>
            <p className="text-center text-slate-600 font-medium text-sm">Opção {idx + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="w-full max-w-lg mx-auto px-4 py-8 animate-in slide-in-from-right-8 duration-500 pb-20">
      <div className="mb-6 flex items-center">
        <button 
          onClick={() => setState(prev => ({ ...prev, step: 2, selectedImageIndex: null }))}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft />
        </button>
        <h2 className="text-2xl font-bold ml-2 text-slate-800">Finalizar Cartão</h2>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 space-y-6">
        {/* Canvas Preview - Vertical Container */}
        <div className="aspect-[9/16] w-full rounded-lg overflow-hidden shadow-inner bg-slate-100 flex items-center justify-center border border-slate-200">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full object-contain"
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
              <Edit3 className="w-4 h-4 mr-2" /> Editar Mensagem
            </label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500 outline-none text-sm resize-none"
            />
          </div>

          <div className="space-y-4">
            {/* Row 1: Font Family Selection */}
            <div>
               <label className="flex items-center text-xs font-medium text-slate-500 mb-2">
                 <Type className="w-3 h-3 mr-1" /> Estilo da Fonte
               </label>
               <div className="flex gap-2">
                 <button
                   onClick={() => setFontFamily('Dancing Script')}
                   className={`flex-1 py-2 text-sm rounded-lg font-handwriting transition-all border ${fontFamily === 'Dancing Script' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                 >
                   Manuscrita
                 </button>
                 <button
                   onClick={() => setFontFamily('Poppins')}
                   className={`flex-1 py-2 text-sm rounded-lg font-sans transition-all border ${fontFamily === 'Poppins' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                 >
                   Moderna
                 </button>
                 <button
                   onClick={() => setFontFamily('Playfair Display')}
                   className={`flex-1 py-2 text-sm rounded-lg font-serif transition-all border ${fontFamily === 'Playfair Display' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                 >
                   Clássica
                 </button>
               </div>
            </div>

             {/* Row 2: Sliders */}
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tamanho da Letra</label>
                  <input 
                    type="range" 
                    min="20" 
                    max="80" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>
                <div>
                  <label className="flex items-center text-xs font-medium text-slate-500 mb-1">
                     <ArrowUpDown className="w-3 h-3 mr-1" /> Posição Vertical
                  </label>
                  <input 
                    type="range" 
                    min="-400" 
                    max="100" 
                    value={textOffsetY} 
                    onChange={(e) => setTextOffsetY(Number(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>
             </div>

             {/* Row 3: Color and Shadow */}
             <div className="flex items-center justify-between">
                <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Cor</label>
                   <div className="flex gap-2">
                     {['#ffffff', '#000000', '#FFD700', '#FF69B4', '#1E293B'].map(color => (
                       <button
                        key={color}
                        onClick={() => setTextColor(color)}
                        className={`w-6 h-6 rounded-full border border-slate-200 ${textColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                        style={{ backgroundColor: color }}
                       />
                     ))}
                   </div>
                </div>
                <button 
                  onClick={() => setTextShadow(!textShadow)}
                  className={`p-2 rounded-lg text-xs font-semibold ${textShadow ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Sombra
                </button>
             </div>
          </div>

          <Button onClick={handleDownload} fullWidth className="flex items-center justify-center gap-2 mt-4 bg-green-600 hover:bg-green-700">
            <Download className="w-5 h-5" /> Baixar para WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-slate-100 text-slate-800">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-pink-100 h-16 flex items-center justify-center">
         <Logo />
      </header>
      <div className="h-16" /> {/* Spacer */}

      {state.isGenerating && <LoadingOverlay message={state.loadingMessage} />}

      <main>
        {state.step === 0 && renderWelcome()}
        {state.step === 1 && renderInput()}
        {state.step === 2 && renderSelection()}
        {state.step === 3 && renderEditor()}
      </main>
      
      {/* Simple Footer */}
      {state.step === 0 && (
         <footer className="py-6 text-center text-slate-400 text-sm">
           <p>Feito com ❤️ e IA para facilitar sua vida.</p>
         </footer>
      )}
    </div>
  );
};

export default App;