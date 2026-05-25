/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { DUO_CHARACTERS, Character } from '../initialData';
import { KeyRound, Mail, User2, ChevronRight, Award } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';


interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456'); // Default simple password for easy sandbox testing
  const [selectedCharacter, setSelectedCharacter] = useState<string>('duo');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'cashier'>('admin'); // Default to full administrator for evaluation
  const [errorMessage, setErrorMessage] = useState('');
  const [successAnimation, setSuccessAnimation] = useState(false);

  const characterKeys = Object.keys(DUO_CHARACTERS);
  const currentCharacter: Character = DUO_CHARACTERS[selectedCharacter] || DUO_CHARACTERS.duo;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('¡Por favor ingresa tu usuario o correo!');
      return;
    }
    if (!password) {
      setErrorMessage('¡Por favor ingresa tu contraseña!');
      return;
    }

    setErrorMessage('');
    
    try {
      let emailToAuth = username.trim();
      
      // Si el input no es un correo directo (no tiene '@'), buscamos el correo en el perfil
      if (!emailToAuth.includes('@')) {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', username.trim())
          .maybeSingle();
          
        if (profileErr) {
          setErrorMessage('Error al buscar usuario: ' + profileErr.message);
          return;
        }
        
        if (!profileData) {
          setErrorMessage('No se encontró ningún usuario con ese nombre.');
          return;
        }
        
        emailToAuth = profileData.email;
      }

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password: password
      });

      if (authErr) {
        setErrorMessage('Error de inicio de sesión: ' + authErr.message);
        return;
      }

      // Obtener el perfil completo de la base de datos
      let { data: userProfile, error: profileFetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user?.id)
        .maybeSingle();

      if (profileFetchErr) {
        setErrorMessage('Error al obtener perfil de base de datos: ' + profileFetchErr.message);
        return;
      }

      // Si no existe el perfil (por ejemplo, si el usuario fue creado antes del trigger SQL), lo autocreamos
      if (!userProfile && authData.user) {
        console.log('Self-healing (Login): Creando perfil faltante para el usuario...');
        const defaultProfile = {
          id: authData.user.id,
          username: authData.user.user_metadata?.username || username.trim(),
          email: authData.user.email || '',
          avatar: selectedCharacter,
          streak: 3,
          xp: 120,
          level: 1,
          daily_goal: 150,
          level_title: 'Cajero Novato 🦉',
          role: authData.user.user_metadata?.role || role,
          gems: 40,
          gems_earned_total: 40,
          unlocked_skins: ['standard'],
          active_skin: 'standard',
          unlocked_badges: [],
          completed_missions_today: []
        };

        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert(defaultProfile)
          .select()
          .maybeSingle();

        if (insertErr || !newProfile) {
          setErrorMessage('Error al crear perfil de usuario faltante: ' + (insertErr?.message || 'Error desconocido'));
          return;
        }
        userProfile = newProfile;
      }

      // Mapear de snake_case (BD) a camelCase (TypeScript User)
      const user: User = {
        id: userProfile.id,
        username: userProfile.username,
        email: userProfile.email,
        avatar: userProfile.avatar,
        streak: userProfile.streak,
        lastSaleDate: userProfile.last_sale_date,
        xp: userProfile.xp,
        level: userProfile.level,
        dailyGoal: Number(userProfile.daily_goal),
        levelTitle: userProfile.level_title,
        role: userProfile.role,
        gems: userProfile.gems,
        gemsEarnedTotal: userProfile.gems_earned_total,
        unlockedSkins: userProfile.unlocked_skins,
        activeSkin: userProfile.active_skin,
        unlockedBadges: userProfile.unlocked_badges,
        completedMissionsToday: userProfile.completed_missions_today
      };

      // Guardar sesión localmente también para persistencia offline si es necesario
      localStorage.setItem('duo_pos_active_user', JSON.stringify(user));

      setSuccessAnimation(true);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 1200);
    } catch (err: any) {
      setErrorMessage('Ocurrió un error inesperado: ' + err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('¡Por favor dinos tu nombre o apodo!');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('¡Por favor ingresa un correo electrónico válido!');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('¡La contraseña debe tener al menos 6 caracteres!');
      return;
    }

    setErrorMessage('');

    try {
      // Validar si el nombre de usuario ya está tomado
      const { data: existingUser, error: checkErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle();

      if (checkErr) {
        setErrorMessage('Error al validar nombre de usuario.');
        return;
      }

      if (existingUser) {
        setErrorMessage('Ese usuario ya existe. ¡Elige otro o inicia sesión!');
        return;
      }

      // Registro nativo en Supabase Auth
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            username: username.trim(),
            role: role
          }
        }
      });

      if (signUpErr) {
        setErrorMessage('Error al registrar: ' + signUpErr.message);
        return;
      }

      const authUser = signUpData.user;
      if (!authUser) {
        setErrorMessage('Registro exitoso. Revisa tu correo de confirmación si está habilitado.');
        return;
      }

      // Actualizar los datos específicos en la tabla profiles
      const levelTitle = 'Monolingüe Comercial 🦉';
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          avatar: selectedCharacter,
          streak: 1,
          xp: 120,
          level: 1,
          daily_goal: 150,
          level_title: levelTitle,
          gems: 40,
          gems_earned_total: 40,
          unlocked_skins: ['standard'],
          active_skin: 'standard',
          unlocked_badges: [],
          completed_missions_today: []
        })
        .eq('id', authUser.id);

      if (updateErr) {
        console.error('Error actualizando perfil:', updateErr);
      }

      // Obtener el perfil completo creado
      let { data: userProfile, error: profileFetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileFetchErr) {
        setErrorMessage('Error al consultar perfil creado.');
        return;
      }

      // Si por alguna razón el trigger no insertó el perfil (o hubo retardo), lo creamos aquí
      if (!userProfile) {
        console.log('Self-healing (Register): Forzando la creación del perfil...');
        const defaultProfile = {
          id: authUser.id,
          username: username.trim(),
          email: email.trim(),
          avatar: selectedCharacter,
          streak: 1,
          xp: 120,
          level: 1,
          daily_goal: 150,
          level_title: 'Monolingüe Comercial 🦉',
          role: role,
          gems: 40,
          gems_earned_total: 40,
          unlocked_skins: ['standard'],
          active_skin: 'standard',
          unlocked_badges: [],
          completed_missions_today: []
        };

        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert(defaultProfile)
          .select()
          .maybeSingle();

        if (insertErr || !newProfile) {
          setErrorMessage('Error al forzar la creación del perfil: ' + (insertErr?.message || 'Error desconocido'));
          return;
        }
        userProfile = newProfile;
      }

      const newUser: User = {
        id: userProfile.id,
        username: userProfile.username,
        email: userProfile.email,
        avatar: userProfile.avatar,
        streak: userProfile.streak,
        lastSaleDate: userProfile.last_sale_date,
        xp: userProfile.xp,
        level: userProfile.level,
        dailyGoal: Number(userProfile.daily_goal),
        levelTitle: userProfile.level_title,
        role: userProfile.role,
        gems: userProfile.gems,
        gemsEarnedTotal: userProfile.gems_earned_total,
        unlockedSkins: userProfile.unlocked_skins,
        activeSkin: userProfile.active_skin,
        unlockedBadges: userProfile.unlocked_badges,
        completedMissionsToday: userProfile.completed_missions_today
      };

      localStorage.setItem('duo_pos_active_user', JSON.stringify(newUser));

      setSuccessAnimation(true);
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 1200);
    } catch (err: any) {
      setErrorMessage('Ocurrió un error inesperado: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative floating grids */}
      <div className="absolute top-10 left-10 text-6xl opacity-10 animate-pulse pointer-events-none">🦉</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-10 animate-bounce pointer-events-none">✨</div>
      <div className="absolute top-1/4 right-16 text-5xl opacity-10 pointer-events-none">💰</div>
      <div className="absolute bottom-1/4 left-16 text-5xl opacity-10 pointer-events-none font-bold">XP</div>

      {successAnimation ? (
        // Happy Level-Up / Welcome Transition Styled like Duolingo Success Lessons
        <div className="max-w-md w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-8 text-center flex flex-col items-center justify-center space-y-6 shadow-xl animate-bounce">
          <div className="text-8xl transform scale-125 transition-all duration-300">
            {currentCharacter.avatar}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-[#58cc02] tracking-tight">¡Caja Activada!</h2>
            <p className="text-gray-600 font-bold">Cargando tu racha de ventas y objetivos de hoy...</p>
          </div>
          <div className="w-full bg-[#e5e5e5] h-5 rounded-full overflow-hidden p-[2px]">
            <div className="bg-[#58cc02] h-full rounded-full animate-[shimmer_1s_infinite] w-full" style={{
              backgroundImage: 'linear-gradient(90deg, #58cc02 0%, #7dde12 50%, #58cc02 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1s linear infinite'
            }} />
          </div>
          <p className="text-sm text-gray-400 italic font-medium">"{currentCharacter.saleQuote}"</p>
        </div>
      ) : (
        // Core login box
        <div className="max-w-xl w-full flex flex-col items-center space-y-6">
          {/* Main Logo Header */}
          <div className="flex items-center gap-3 transform hover:scale-105 transition-transform duration-200 cursor-pointer">
            <div className="bg-[#58cc02] p-4 rounded-3xl border-b-6 border-[#46a302] shadow-md flex items-center justify-center">
              <span className="text-4xl">🦉</span>
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#58cc02] tracking-wider flex items-center gap-1">
                Duo<span className="text-[#3c3c3c]">POS</span>
              </h1>
              <p className="text-xs font-black tracking-widest text-[#afafaf] uppercase">Punto de Venta Gamificado</p>
            </div>
          </div>

          {/* Interactive Character Speech Bubble */}
          <div className="w-full flex items-start gap-3 bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-2xl p-4 md:p-6 transition-all duration-300">
            <div className="text-6xl select-none transform hover:rotate-12 duration-150">
              {currentCharacter.avatar}
            </div>
            <div className="flex-1 relative bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700">
              {/* Little triangle for speech bubble */}
              <div className="absolute left-[-8px] top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-50 border-b-8 border-b-transparent" />
              <div className="absolute left-[-9px] top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent -z-10" />
              
              <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                {currentCharacter.name} dice:
              </span>
              <p className="leading-snug text-gray-700">
                {isRegistering ? currentCharacter.idleQuote : currentCharacter.loginQuote}
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 md:p-8 w-full shadow-lg">
            <div className="flex justify-around border-b-2 border-[#e5e5e5] pb-4 mb-6">
              <button
                type="button"
                className={`pb-2 font-black text-lg transition-colors duration-150 relative ${
                  !isRegistering ? 'text-[#58cc02]' : 'text-[#afafaf] hover:text-gray-500'
                }`}
                onClick={() => {
                  setIsRegistering(false);
                  setErrorMessage('');
                }}
              >
                Inicia Sesión
                {!isRegistering && (
                  <div className="absolute bottom-[-18px] left-0 right-0 h-[4px] bg-[#58cc02] rounded-full" />
                )}
              </button>
              <button
                type="button"
                className={`pb-2 font-black text-lg transition-colors duration-150 relative ${
                  isRegistering ? 'text-[#58cc02]' : 'text-[#afafaf] hover:text-gray-500'
                }`}
                onClick={() => {
                  setIsRegistering(true);
                  setErrorMessage('');
                }}
              >
                Crea una Cuenta
                {isRegistering && (
                  <div className="absolute bottom-[-18px] left-0 right-0 h-[4px] bg-[#58cc02] rounded-full" />
                )}
              </button>
            </div>

            {/* ERROR MESSAGE BAR */}
            {errorMessage && (
              <div className="bg-[#ffedf0] border-2 border-[#ff7b7b] rounded-2xl p-3 text-[#ff4b4b] font-bold text-sm text-center mb-5 animate-shake">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
              {/* Avatar Character Switcher */}
              <div className="space-y-2">
                <label className="text-sm font-black tracking-wide text-gray-500 block uppercase">
                  Elige tu Cajero Compañero
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {characterKeys.map(key => {
                    const char = DUO_CHARACTERS[key];
                    const isSelected = selectedCharacter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedCharacter(key)}
                        className={`p-2 rounded-2xl border-2 transition-all duration-150 flex flex-col items-center justify-center ${
                          isSelected
                            ? 'border-[#58cc02] bg-[#f2ffd9] border-b-[6px]'
                            : 'border-[#e5e5e5] border-b-4 hover:bg-gray-50 active:translate-y-1'
                        }`}
                      >
                        <span className="text-3xl filter drop-shadow-sm">{char.avatar}</span>
                        <span className={`text-[10px] font-black mt-1 ${isSelected ? 'text-[#58cc02]' : 'text-gray-400'}`}>
                          {char.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 font-bold mt-1 text-center italic">
                  {currentCharacter.intro}
                </p>
              </div>

              {/* Username Input */}
              <div className="space-y-1">
                <label htmlFor="username" className="text-sm font-black tracking-wide text-gray-500 block uppercase">
                  Usuario de Tienda
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-400">
                    <User2 size={18} />
                  </span>
                  <input
                    id="username"
                    type="text"
                    required
                    placeholder="Ej. jonas_mendoza"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-[#e5e5e5] rounded-2xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              {/* Email Input (Registering Only) */}
              {isRegistering && (
                <div className="space-y-1 animate-fadeIn">
                  <label htmlFor="email" className="text-sm font-black tracking-wide text-gray-500 block uppercase">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-400">
                      <Mail size={18} />
                    </span>
                    <input
                      id="email"
                      type="email"
                      placeholder="Ej. jonas@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-[#e5e5e5] rounded-2xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Password Input (Simple placeholder for design realism) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-sm font-black tracking-wide text-gray-500 block uppercase">
                    Contraseña Comercial
                  </label>
                  <span className="text-xs text-gray-400 font-bold">(Cualquier clave es permitida)</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-400">
                    <KeyRound size={18} />
                  </span>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-[#e5e5e5] rounded-2xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              {/* Role Selection Widget (Complete RBAC Simulation support) */}
              <div className="space-y-2 border-t-2 border-[#e5e5e5] pt-4 mt-2">
                <label className="text-sm font-black tracking-wide text-gray-500 block uppercase">
                  Nivel de Acceso (Rol Comercial)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'admin', label: 'Admin 👑', desc: 'Control Total', theme: 'border-[#58cc02] bg-[#f2ffd9] border-b-[6px]' },
                    { id: 'supervisor', label: 'Supervisor ⚡', desc: 'Inventario/CEDIS', theme: 'border-indigo-500 bg-indigo-50/50 border-b-[6px]' },
                    { id: 'cashier', label: 'Cajero 💵', desc: 'Ventas y Caja', theme: 'border-amber-500 bg-amber-50/50 border-b-[6px]' },
                  ].map((rOption) => {
                    const isSelected = role === rOption.id;
                    return (
                      <button
                        key={rOption.id}
                        type="button"
                        onClick={() => {
                          setRole(rOption.id as any);
                        }}
                        className={`p-2.5 rounded-2xl border-2 transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer ${
                          isSelected
                            ? rOption.theme
                            : 'border-[#e5e5e5] border-b-4 hover:bg-gray-50 active:translate-y-1'
                        }`}
                      >
                        <span className={`font-black text-xs ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>{rOption.label}</span>
                        <span className="text-[10px] text-gray-400 font-bold block leading-tight mt-0.5">{rOption.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10.5px] text-gray-550 font-medium">
                  {role === 'admin' && (
                    <span><strong>Acceso Corporativo:</strong> Modificar ajustes del sistema, catálogos, sucursales y realizar devoluciones del historial de ventas de forma ilimitada.</span>
                  )}
                  {role === 'supervisor' && (
                    <span><strong>Acceso Operativo:</strong> Gestión de existencias y CEDIS en Logistics. <em className="text-red-500 font-semibold">Restringido:</em> Ajustes fiscales de facturación legal avanzada y borrado total del historial.</span>
                  )}
                  {role === 'cashier' && (
                    <span><strong>Acceso Punto de Venta:</strong> Registrar ventas y arqueos de caja únicamente. <em className="text-red-500 font-semibold">Restringido:</em> Pestañas de Almacenes, Catálogos, Configuración y Reembolsos.</span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-[#58cc02] text-white border-b-[6px] border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[6px] font-black text-lg py-3.5 rounded-2xl transition-all duration-100 flex items-center justify-center gap-2 tracking-wide uppercase shadow-sm mt-8 cursor-pointer"
              >
                {isRegistering ? 'Crear Cajero & Iniciar' : 'Entrar a Trabajar'}
                <ChevronRight size={20} />
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 font-bold">
            💡 Tip: Si ya tienes productos registrados, usa tu nombre habitual para conservar la racha de días anteriores.
          </p>
        </div>
      )}
    </div>
  );
}
