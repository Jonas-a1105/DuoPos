import React, { useState } from 'react';
import { Coins } from 'lucide-react';
import { User } from '../../../types';
import { playSound } from '../../../services/sounds';
import { toast } from '../../../components/Modal/FlashNotifications';
import { LicenseDetails } from '../../../services/licensing';

interface StoreItem {
  id: string;
  title: string;
  category: 'skin' | 'powerup' | 'title' | 'accessory';
  description: string;
  cost: number;
  icon: string;
  rarity: 'comun' | 'raro' | 'epico' | 'legendario';
  accentClass: string;
  value?: string;
  levelRequired?: number;
}

interface PointsShopProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  licenseDetails: LicenseDetails;
}

export default function PointsShop({ user, onUpdateUser, licenseDetails }: PointsShopProps) {
  const [activeStoreCategory, setActiveStoreCategory] = useState<'all' | 'skin' | 'accessory' | 'title' | 'powerup'>('all');

  const currentGems = user.gems ?? 0;
  const unlockedSkinsList = user.unlockedSkins || [];

  const storeItems: StoreItem[] = [
    // Theme layouts changing styles globally
    {
      id: 'skin-standard',
      title: 'Nido Verde (Clásico) 🦉',
      category: 'skin',
      description: 'El look clásico original de Duolingo, nítido y resplandeciente.',
      cost: 0,
      icon: '🟢',
      rarity: 'comun',
      accentClass: 'from-green-400 to-[#58cc02]',
      value: 'standard',
      levelRequired: 1
    },
    {
      id: 'skin-galaxy',
      title: 'Espacio Profundo 🌌',
      category: 'skin',
      description: 'Modo nocturno interestelar. Fondo ultra gótico con estrellas violetas y neblina lila.',
      cost: 80,
      icon: '⭐',
      rarity: 'raro',
      accentClass: 'from-violet-600 to-indigo-900',
      value: 'dark-galaxy',
      levelRequired: 1
    },
    {
      id: 'skin-cyberpunk',
      title: 'Neon Cyberpunk ⚡',
      category: 'skin',
      description: 'Punto de venta del año 2077. Negro líquido con bordes brillantes cian y magenta.',
      cost: 150,
      icon: '👾',
      rarity: 'epico',
      accentClass: 'from-pink-500 to-cyan-500',
      value: 'neon-cyberpunk',
      levelRequired: 1
    },
    {
      id: 'skin-emerald',
      title: 'Palacio Esmeralda 👑',
      category: 'skin',
      description: 'Lujo corporativo medieval. Verde esmeralda con ribetes dorados brillantes.',
      cost: 200,
      icon: '💍',
      rarity: 'legendario',
      accentClass: 'from-[#0d5c3a] to-yellow-600',
      value: 'emerald-palace',
      levelRequired: 1
    },
    {
      id: 'skin-bubblegum',
      title: 'Bubblegum Pastel 🌸',
      category: 'skin',
      description: 'Glaseado dulce y tierno. Rosado de fresa pastel con formas redondeadas acolchadas.',
      cost: 70,
      icon: '🍬',
      rarity: 'raro',
      accentClass: 'from-pink-300 to-[#ff4b93]',
      value: 'bubblegum-cute',
      levelRequired: 1
    },
    {
      id: 'skin-retro',
      title: 'Retro 8-Bits 🕹️',
      category: 'skin',
      description: 'Estilo arcade retro de los 80s con tipografía pixelada y colores clásicos de consola.',
      cost: 120,
      icon: '🕹️',
      rarity: 'raro',
      accentClass: 'from-amber-600 to-stone-850',
      value: 'retro-8bit',
      levelRequired: 5
    },
    {
      id: 'skin-gold',
      title: 'Ejecutivo Oro 👔',
      category: 'skin',
      description: 'Edición especial de lujo total. Fondos oscuros profundos combinados con destellos de oro.',
      cost: 250,
      icon: '👑',
      rarity: 'legendario',
      accentClass: 'from-yellow-500 to-yellow-600',
      value: 'executive-gold',
      levelRequired: 8
    },
    {
      id: 'skin-ocean',
      title: 'Océano Profundo 🌊',
      category: 'skin',
      description: 'Diseño relajante de las profundidades marinas. Azules cian combinado con turquesas.',
      cost: 100,
      icon: '🐠',
      rarity: 'comun',
      accentClass: 'from-cyan-600 to-sky-900',
      value: 'deep-ocean',
      levelRequired: 3
    },
    // Accessories for the Mascot
    {
      id: 'accessory-hat',
      title: 'Sombrero de Copa 🎩',
      category: 'accessory',
      description: 'Dale a tu búho un toque distinguido y elegante con este sombrero aristocrático.',
      cost: 30,
      icon: '🎩',
      rarity: 'comun',
      accentClass: 'from-stone-600 to-slate-800',
      levelRequired: 1
    },
    {
      id: 'accessory-glasses',
      title: 'Lentes de Sol 😎',
      category: 'accessory',
      description: 'Perfectos para los turnos de tarde con alta intensidad y ventas soleadas.',
      cost: 25,
      icon: '😎',
      rarity: 'comun',
      accentClass: 'from-yellow-400 to-amber-500',
      levelRequired: 1
    },
    {
      id: 'accessory-corona',
      title: 'Corona Real 👑',
      category: 'accessory',
      description: 'Solo para los verdaderos monarcas del escaneo rápido. Brilla con autoridad suprema.',
      cost: 80,
      icon: '👑',
      rarity: 'epico',
      accentClass: 'from-yellow-350 to-amber-500',
      levelRequired: 4
    },
    {
      id: 'accessory-traje',
      title: 'Traje Ejecutivo 🕴️',
      category: 'accessory',
      description: 'Viste a tu búho para el éxito corporativo. Impecable saco y corbata oscuros.',
      cost: 60,
      icon: '🕴️',
      rarity: 'raro',
      accentClass: 'from-gray-700 to-zinc-900',
      levelRequired: 2
    },
    {
      id: 'accessory-capa',
      title: 'Capa de Superhéroe 🦸',
      category: 'accessory',
      description: 'Porque salvar rachas de ventas diarias es el trabajo de un verdadero héroe de caja.',
      cost: 100,
      icon: '🦸',
      rarity: 'legendario',
      accentClass: 'from-red-500 to-blue-600',
      levelRequired: 5
    },
    // Powerups / Buffers
    {
      id: 'power-streak',
      title: 'Protector de Racha (Streak Freeze) ❄️',
      category: 'powerup',
      description: 'Evita perder tu racha de ventas hoy aunque no registres facturas.',
      cost: 50,
      icon: '🧊',
      rarity: 'comun',
      accentClass: 'from-sky-300 to-[#1cb0f6]',
      levelRequired: 1
    },
    {
      id: 'power-xpboost',
      title: 'Poción de Doble XP (Booster🧪)',
      category: 'powerup',
      description: 'Multiplica por 2 todos los puntos de XP que consigas en tus próximas 3 ventas.',
      cost: 40,
      icon: '🧪',
      rarity: 'raro',
      accentClass: 'from-[#ff4b93] to-purple-600',
      levelRequired: 1
    }
  ];

  const handleBuyItem = (item: StoreItem) => {
    if (item.levelRequired && user.level < item.levelRequired) {
      playSound('error');
      toast.error(`Necesitas ser nivel ${item.levelRequired} para canjear este artículo. Nivel actual: ${user.level}`, { title: 'Nivel Insuficiente 🔒' });
      return;
    }

    if (currentGems < item.cost) {
      playSound('error');
      toast.error(`Gemas insuficientes. Necesitas ${item.cost} Gemas (Tienes ${currentGems})`, { title: 'Tienda Bloqueada 🔒' });
      return;
    }

    // Plan-based restrictions for skins
    if (item.category === 'skin') {
      if (item.id === 'skin-cyberpunk' || item.id === 'skin-emerald' || item.id === 'skin-gold') {
        if (licenseDetails.tier !== 'pro') {
          playSound('error');
          toast.error(`La Skin "${item.title}" requiere el Plan Pro. Actualiza tu plan en Ajustes > Planes.`, { title: 'Plan Pro Requerido 🔒' });
          return;
        }
      } else if (item.id === 'skin-galaxy' || item.id === 'skin-bubblegum' || item.id === 'skin-retro' || item.id === 'skin-ocean') {
        if (licenseDetails.tier === 'free') {
          playSound('error');
          toast.error(`La Skin "${item.title}" requiere el Plan Standard o Pro. Actualiza tu plan en Ajustes > Planes.`, { title: 'Plan Standard o Pro Requerido 🔒' });
          return;
        }
      }
    }

    playSound('success');
    const remainingGems = currentGems - item.cost;
    let nextUser: User = { ...user, gems: remainingGems };

    if (item.category === 'skin' && item.value) {
      const nextUnlockedSkins = [...unlockedSkinsList, item.id];
      nextUser = {
        ...nextUser,
        unlockedSkins: nextUnlockedSkins,
        activeSkin: item.value
      };
      toast.success(`Se ha comprado la Skin layout "${item.title}". ¡Equipada automáticamente!`, { title: 'Tienda DuoPOS 🛍️' });
    } 
    else if (item.category === 'accessory') {
      const nextUnlockedAccessories = [...(user.unlockedAccessories || []), item.id];
      nextUser = {
        ...nextUser,
        unlockedAccessories: nextUnlockedAccessories,
        activeAccessory: item.id
      };
      toast.success(`Se ha comprado el accesorio "${item.title}". ¡Equipado automáticamente! 🦉✨`, { title: 'Tienda DuoPOS 🛍️' });
    }
    else if (item.category === 'title' && item.value) {
      nextUser = {
        ...nextUser,
        levelTitle: item.value
      };
      toast.success(`Establecido nuevo Rango Titular: "${item.title}" ✨`, { title: 'Rango Actualizado ✨' });
    }
    else if (item.id === 'power-streak') {
      const nextSavedCount = (user.dailyStreakSavedCount ?? 0) + 1;
      nextUser = {
        ...nextUser,
        dailyStreakSavedCount: nextSavedCount
      };
      toast.success('¡Has comprado 1 Congelador de Racha ❄️! Te protegerá automáticamente.', { title: 'Escudo Activado 🧊' });
    }
    else if (item.id === 'power-xpboost') {
      toast.success('Poción de Doble XP comprada. ¡Tus siguientes 3 ventas otorgarán el doble de puntos!', { title: 'Booster de Fila 🧪' });
      localStorage.setItem('duo_pos_xp_booster_charges', '3');
    }

    onUpdateUser(nextUser);
  };

  const handleEquipSkin = (item: StoreItem) => {
    if (!item.value) return;
    playSound('click');
    const nextUser: User = {
      ...user,
      activeSkin: item.value
    };
    onUpdateUser(nextUser);
    toast.info(`Tema cambiado a: "${item.title}"`, { title: 'Personalización Visual 🔄' });
  };

  const handleEquipAccessory = (item: StoreItem) => {
    playSound('click');
    const isCurrentlyEquipped = user.activeAccessory === item.id;
    const nextUser: User = {
      ...user,
      activeAccessory: isCurrentlyEquipped ? '' : item.id
    };
    onUpdateUser(nextUser);
    toast.info(isCurrentlyEquipped ? `Accesorio desequipado 🦉` : `Accesorio equipado: "${item.title}" 🦉✨`, { title: 'Personalización Visual 🔄' });
  };

  const getRarityBadge = (rarity: StoreItem['rarity']) => {
    switch (rarity) {
      case 'comun': return <span className="text-[8px] bg-gray-100 text-gray-700 px-1.5 py-0.5 border border-gray-200 rounded font-black uppercase">Común</span>;
      case 'raro': return <span className="text-[8px] bg-purple-100 text-purple-700 px-1.5 py-0.5 border border-purple-200 rounded font-black uppercase">Raro</span>;
      case 'epico': return <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 border border-indigo-200 rounded font-black uppercase">Épico</span>;
      case 'legendario': return <span className="text-[8px] bg-yellow-100 text-amber-800 px-1.5 py-0.5 border border-amber-300 rounded font-black uppercase animate-pulse">Legendario</span>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-5 border-b-[6px] border-amber-800 shadow-md">
        <div className="space-y-1 text-center sm:text-left">
          <span className="bg-amber-800/55 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Tienda de Compras Oficial</span>
          <h3 className="text-2xl font-black tracking-tight">Utiliza tus gemas de racha DuoPOS</h3>
          <p className="text-xs text-amber-100 font-semibold max-w-xl">
            Al canjear estas recompensas, cambiará de inmediato la apariencia visual del sistema, desbloquearás flairs especiales visibles en tu perfil y activarás multiplicadores de experiencia en transacciones.
          </p>
        </div>

        <div className="bg-white text-amber-600 font-black px-5 py-3.5 rounded-2xl border-2 border-amber-200 border-b-4 flex items-center gap-2 text-xl shadow-inner select-none shrink-0 font-mono">
          <span>{currentGems}</span>
          <Coins className="text-amber-500" strokeWidth={2.5} size={22} />
        </div>
      </div>

      {/* Store Sub-Category Tab Selector */}
      <div className="flex border-b-2 border-gray-250 gap-4 overflow-x-auto scrollbar-none pb-0.5">
        {[
          { id: 'all', label: 'Todos 🌐' },
          { id: 'skin', label: 'Temas 🎨' },
          { id: 'accessory', label: 'Accesorios Duo 🦉' },
          { id: 'title', label: 'Títulos 📜' },
          { id: 'powerup', label: 'Potenciadores ⚡' }
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { playSound('click'); setActiveStoreCategory(cat.id as any); }}
            className={`pb-2.5 px-2 text-xs font-black uppercase tracking-wider border-b-4 transition-all cursor-pointer shrink-0 ${
              activeStoreCategory === cat.id
                ? 'border-[#58cc02] text-[#58cc02]'
                : 'border-transparent text-gray-400 hover:text-gray-650'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* List items segmented by style panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {storeItems
          .filter(item => activeStoreCategory === 'all' || item.category === activeStoreCategory)
          .map((item) => {
            const isPurchasedSkin = item.category === 'skin' && unlockedSkinsList.includes(item.id);
            const isEquippedSkin = item.category === 'skin' && user.activeSkin === item.value;
            const isEquippedTitle = item.category === 'title' && user.levelTitle === item.value;
            const isPurchasedAccessory = item.category === 'accessory' && (user.unlockedAccessories || []).includes(item.id);
            const isEquippedAccessory = item.category === 'accessory' && user.activeAccessory === item.id;
            const isStreakFreezeOwned = item.id === 'power-streak' && (user.dailyStreakSavedCount ?? 0) > 0;

            const isEquipped = isEquippedSkin || isEquippedTitle || isEquippedAccessory;
            const isOwnedNotEquipped = isPurchasedSkin || isPurchasedAccessory;
            const isLevelLocked = item.levelRequired ? user.level < item.levelRequired : false;

            let isPlanLocked = false;
            let planRequiredName = '';
            if (item.category === 'skin') {
              if (item.id === 'skin-cyberpunk' || item.id === 'skin-emerald' || item.id === 'skin-gold') {
                if (licenseDetails.tier !== 'pro') {
                  isPlanLocked = true;
                  planRequiredName = 'Plan Pro';
                }
              } else if (item.id === 'skin-galaxy' || item.id === 'skin-bubblegum' || item.id === 'skin-retro' || item.id === 'skin-ocean') {
                if (licenseDetails.tier === 'free') {
                  isPlanLocked = true;
                  planRequiredName = 'Standard o Pro';
                }
              }
            }

            return (
              <div 
                key={item.id}
                className={`bg-white border-2 border-gray-250 border-b-6 rounded-3xl p-4 flex flex-col justify-between hover:border-gray-300 transition-all shadow-sm relative ${isLevelLocked ? 'opacity-80' : ''}`}
              >
                {isLevelLocked && (
                  <div className="absolute top-2 right-2 z-20 bg-stone-900/90 text-yellow-500 border border-yellow-500/30 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase flex items-center gap-0.5 shadow-md">
                    <span>🔒 NIVEL {item.levelRequired}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className={`h-24 w-full rounded-2xl bg-gradient-to-tr ${item.accentClass} flex items-center justify-center text-4xl shadow-inner relative border border-white/20 overflow-hidden ${isLevelLocked ? 'grayscale opacity-75' : ''}`}>
                    <div className="absolute inset-0 bg-black/5 opacity-10 pointer-events-none" />
                    <span className="transform hover:scale-110 duration-200 transition-all select-none">{item.icon}</span>
                    
                    <div className="absolute top-2 left-2">
                      {getRarityBadge(item.rarity)}
                    </div>

                    {item.category === 'skin' && (
                      <span className="absolute bottom-2 right-2 bg-black/40 text-white font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                        Skins Layout
                      </span>
                    )}
                    {item.category === 'accessory' && (
                      <span className="absolute bottom-2 right-2 bg-amber-900/60 text-amber-250 font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                        Accesorio Búho
                      </span>
                    )}
                    {item.category === 'powerup' && (
                      <span className="absolute bottom-2 right-2 bg-indigo-950/60 text-indigo-200 font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                        Activador
                      </span>
                    )}
                    {item.category === 'title' && (
                      <span className="absolute bottom-2 right-2 bg-emerald-950/60 text-emerald-250 font-black text-[7.5px] tracking-wider px-2 py-0.5 rounded uppercase">
                        Rango Rápido
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-[#3c3c3c] text-sm tracking-tight">{item.title}</h4>
                    </div>
                    <p className="text-xs text-gray-400 font-bold leading-normal min-h-[36px]">{item.description}</p>
                  </div>
                </div>

                {/* Footer and buy triggers */}
                <div className="pt-2 border-t border-dashed border-gray-100 mt-4 flex items-center justify-between">
                  <div>
                    {isEquipped ? (
                      <span className="text-[#58cc02] text-[10px] font-black uppercase flex items-center gap-0.5">
                        🟢 EQUIPADO
                      </span>
                    ) : isOwnedNotEquipped ? (
                      <span className="text-indigo-650 text-[10px] font-black uppercase flex items-center gap-0.5">
                        Adquirido
                      </span>
                    ) : item.id === 'power-streak' && isStreakFreezeOwned ? (
                      <span className="text-[#1cb0f6] text-[10px] font-black uppercase flex items-center gap-0.5">
                        Activos: x{user.dailyStreakSavedCount} ❄️
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 font-mono text-gray-800 font-black text-xs bg-amber-50 border border-amber-100/70 p-1 px-2.5 rounded-full">
                        <span>{item.cost}</span>
                        <Coins className="text-amber-500" size={13} strokeWidth={2.5} />
                      </div>
                    )}
                  </div>

                  {isLevelLocked ? (
                    <button
                      type="button"
                      disabled
                      className="bg-gray-100 border border-gray-200 text-gray-400 font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-xl select-none cursor-not-allowed flex items-center gap-1"
                    >
                      <span>🔒 Nivel {item.levelRequired}</span>
                    </button>
                  ) : isEquipped ? (
                    <button
                      type="button"
                      disabled
                      className="bg-gray-100 border border-gray-200 text-gray-400 font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-xl select-none"
                    >
                      En Uso 🔒
                    </button>
                  ) : isOwnedNotEquipped ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (item.category === 'skin') {
                          handleEquipSkin(item);
                        } else if (item.category === 'accessory') {
                          handleEquipAccessory(item);
                        }
                      }}
                      className="bg-indigo-650 text-white font-black text-[9.5px] uppercase tracking-wider py-1.5 px-3 rounded-xl border-b-2 border-indigo-800 hover:bg-indigo-500 active:translate-y-0.5 active:border-b-0 cursor-pointer"
                    >
                      Equipar 🔄
                    </button>
                  ) : isPlanLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        playSound('error');
                        toast.error(`La recompensa "${item.title}" requiere el plan ${planRequiredName}. Actualiza tu licencia en Ajustes > Planes.`, { title: 'Plan Requerido 🔒' });
                      }}
                      className="bg-gray-100 border border-gray-200 text-gray-400 font-black text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-xl cursor-not-allowed flex items-center gap-1"
                    >
                      <span>🔒 {planRequiredName}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBuyItem(item)}
                      className="bg-[#ff9600] text-white font-black text-[9.5px] uppercase tracking-wider py-1.5 px-3.5 rounded-xl border-b-2 border-amber-700 hover:bg-amber-500 active:translate-y-0.5 active:border-b-0 cursor-pointer shadow-xs shadow-orange-50"
                    >
                      {item.cost === 0 ? 'Obtener Gratis' : 'Canjear 💎'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
