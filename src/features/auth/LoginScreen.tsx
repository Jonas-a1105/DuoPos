import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { DUO_CHARACTERS, Character } from '../../initialData';
import { KeyRound, Mail, User2, ChevronRight, Award, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured, setSupabaseToken } from '../../config/supabaseClient';
import { useSignIn, useSignUp } from '@clerk/clerk-react';

// Clerk global type declaration for window.Clerk
declare global {
  interface Window {
    Clerk: any;
  }
}

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

// Helper para mapear un row de Supabase profiles a User de TypeScript
const mapProfileToUser = (profile: any, selectedCharacter: string, role: string): User => ({
  id: profile.id,
  username: profile.username || 'Cajero',
  email: profile.email || '',
  avatar: profile.avatar || selectedCharacter || 'duo',
  streak: profile.streak || 1,
  lastSaleDate: profile.last_sale_date || null,
  xp: profile.xp || 120,
  level: profile.level || 1,
  dailyGoal: Number(profile.daily_goal || 150),
  levelTitle: profile.level_title || 'Cajero Novato 🦉',
  role: profile.role || role || 'cashier',
  gems: profile.gems || 40,
  gemsEarnedTotal: profile.gems_earned_total || 40,
  unlockedSkins: profile.unlocked_skins || ['standard'],
  activeSkin: profile.active_skin || 'standard',
  unlockedBadges: profile.unlocked_badges || [],
  completedMissionsToday: profile.completed_missions_today || []
});

// Crear estructura de perfil por defecto
const createDefaultProfileObj = (userId: string, userEmail: string, userName: string, avatar: string, role: string) => ({
  id: userId,
  username: userName,
  email: userEmail,
  avatar: avatar,
  streak: 1,
  xp: 120,
  level: 1,
  daily_goal: 150,
  level_title: 'Cajero Novato 🦉',
  role: role,
  gems: 40,
  gems_earned_total: 40,
  unlocked_skins: ['standard'],
  active_skin: 'standard',
  unlocked_badges: [],
  completed_missions_today: []
});

// ─── 1. COMPONENTE DE LOGIN CON CLERK ──────────────────────────────────────────
function ClerkLoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('duo');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'cashier'>('admin');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Flujo OTP de Clerk
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setDiagnosticLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    console.log(`[AUTH CLERK] ${msg}`);
  };

  useEffect(() => {
    addLog("🔌 Inicializando módulo Clerk + Supabase en producción...");
    addLog("🌐 Conexión activa con el servidor de seguridad de Clerk.");
  }, []);

  const characterKeys = Object.keys(DUO_CHARACTERS);
  const currentCharacter: Character = DUO_CHARACTERS[selectedCharacter] || DUO_CHARACTERS.duo;

  // Registrar usuario nuevo con Clerk
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;

    if (!username.trim()) {
      setErrorMessage('¡Por favor dinos tu nombre o apodo!');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('¡Por favor ingresa un correo electrónico válido!');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('¡La contraseña debe tener al menos 8 caracteres!');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    addLog("----------------------------------------");
    addLog(`Iniciando registro de Clerk para "${username.trim()}" (${email.trim()})...`);

    try {
      // 1. Crear el intento de registro en Clerk
      await signUp.create({
        emailAddress: email.trim(),
        password: password,
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') // Nombre de usuario apto para Clerk (letras, números, guión bajo)
      });

      addLog("Cuenta creada en Clerk. Enviando código de verificación OTP de 6 dígitos...");

      // 2. Solicitar código de verificación por email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      setPendingVerification(true);
      addLog("📧 Código enviado a tu Gmail. Esperando que lo ingreses en pantalla...");
    } catch (err: any) {
      addLog(`❌ Error en registro: ${err.message || err}`);
      setErrorMessage(err.errors?.[0]?.message || err.message || 'Error al crear la cuenta en Clerk.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar código de confirmación OTP en pantalla
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;
    if (!verificationCode.trim()) {
      setErrorMessage('¡Por favor ingresa el código de 6 dígitos!');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    addLog(`Verificando código OTP "${verificationCode.trim()}"...`);

    try {
      // 3. Validar el código en Clerk
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim()
      });

      if (completeSignUp.status === 'complete') {
        addLog("¡Código verificado con éxito en Clerk!");
        
        // 4. Activar la sesión en el cliente
        await setSignUpActive({ session: completeSignUp.createdSessionId });

        // 5. Inyectar el token JWT de Clerk en Supabase Client
        const token = await window.Clerk.session.getToken({ template: 'supabase' });
        setSupabaseToken(token);

        addLog("Sincronizando y guardando perfil en Supabase PostgreSQL...");
        const userId = completeSignUp.createdUserId || 'clerk-user';
        const defaultProfile = createDefaultProfileObj(userId, email.trim(), username.trim(), selectedCharacter, role);

        // Intentar guardar perfil en Supabase
        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert(defaultProfile)
          .select()
          .maybeSingle();

        if (insertErr) {
          addLog(`⚠️ Perfil ya existía o trigger lo insertó. Cargando perfil...`);
        }

        const activeProfile = newProfile || defaultProfile;
        const finalUserObj = mapProfileToUser(activeProfile, selectedCharacter, role);
        localStorage.setItem('duo_pos_active_user', JSON.stringify(finalUserObj));

        addLog("¡Caja de Supabase inicializada! Redirigiendo...");
        setSuccessAnimation(true);
        setTimeout(() => {
          onLoginSuccess(finalUserObj);
        }, 1200);
      } else {
        addLog(`⚠️ El registro de Clerk no se completó. Estado actual: ${completeSignUp.status}`);
        addLog(`⚠️ Campos requeridos faltantes: ${JSON.stringify(completeSignUp.missingFields || [])}`);
        addLog(`⚠️ Campos por verificar: ${JSON.stringify(completeSignUp.unverifiedFields || [])}`);
        setErrorMessage(`Registro incompleto (${completeSignUp.status}). Campos faltantes: ${JSON.stringify(completeSignUp.missingFields || [])}. Revisa los requerimientos en tu panel de Clerk.`);
      }
    } catch (err: any) {
      addLog(`❌ Error de verificación: ${err.message || err}`);
      setErrorMessage(err.errors?.[0]?.message || err.message || 'Código de verificación incorrecto.');
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar Sesión con Clerk
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;

    if (!username.trim()) {
      setErrorMessage('¡Por favor ingresa tu usuario o correo!');
      return;
    }
    if (!password) {
      setErrorMessage('¡Por favor ingresa tu contraseña!');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    addLog("----------------------------------------");
    addLog(`Buscando sesión de Clerk para "${username.trim()}"...`);

    try {
      // 1. Iniciar sesión en Clerk (soporta email o username directamente en 'identifier')
      const result = await signIn.create({
        identifier: username.trim().includes('@') ? username.trim() : username.trim().toLowerCase(),
        password: password
      });

      if (result.status === 'complete') {
        addLog("¡Sesión validada exitosamente en Clerk!");
        
        // 2. Activar la sesión
        await setSignInActive({ session: result.createdSessionId });

        // 3. Inyectar el token JWT de Clerk en Supabase Client
        const token = await window.Clerk.session.getToken({ template: 'supabase' });
        setSupabaseToken(token);

        addLog("Cargando perfil comercial desde Supabase PostgreSQL...");
        const userId = (result as any).firstFactorImageAddress || result.createdSessionId; // ID del usuario de Clerk
        
        // Buscar perfil en Supabase
        const { data: userProfile, error: fetchErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', username.trim().includes('@') ? username.trim() : '')
          .maybeSingle();

        let finalProfile = userProfile;

        // Autocuración: si el perfil comercial no existe en Supabase, lo creamos
        if (!finalProfile) {
          addLog("⚠️ El perfil comercial no existe en Supabase. Autocreando perfil...");
          const clerkUserObj = result.identifier;
          const defaultProfile = createDefaultProfileObj(
            result.createdSessionId, // Fallback ID
            username.trim().includes('@') ? username.trim() : `${username.trim()}@clerk.pos`,
            username.trim(),
            selectedCharacter,
            role
          );

          // Si Clerk nos permite sacar el id del usuario directamente
          const currentClerkUser = (result as any).userData || {} as any;
          if (currentClerkUser.id) {
            (defaultProfile as any).id = currentClerkUser.id;
          }

          const { data: newProfile, error: insertErr } = await supabase
            .from('profiles')
            .insert(defaultProfile)
            .select()
            .maybeSingle();

          finalProfile = newProfile || defaultProfile;
        }

        const finalUserObj = mapProfileToUser(finalProfile, selectedCharacter, role);
        localStorage.setItem('duo_pos_active_user', JSON.stringify(finalUserObj));

        addLog("¡Sesión iniciada con éxito! Redirigiendo...");
        setSuccessAnimation(true);
        setTimeout(() => {
          onLoginSuccess(finalUserObj);
        }, 1200);
      } else {
        addLog(`⚠️ Inicio de sesión Clerk incompleto: ${result.status}`);
        setErrorMessage('La cuenta requiere autenticación adicional o confirmación de email.');
      }
    } catch (err: any) {
      addLog(`❌ Error en inicio de sesión: ${err.message || err}`);
      setErrorMessage(err.errors?.[0]?.message || err.message || 'Credenciales de acceso incorrectas.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col items-center justify-center p-4 relative overflow-y-auto py-8 font-sans">
      {/* Decorative floating grids */}
      <div className="absolute top-10 left-10 text-6xl opacity-10 animate-pulse pointer-events-none">🦉</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-10 animate-bounce pointer-events-none">✨</div>
      <div className="absolute top-1/4 right-16 text-5xl opacity-10 pointer-events-none">💰</div>
      <div className="absolute bottom-1/4 left-16 text-5xl opacity-10 pointer-events-none font-bold">XP</div>

      {successAnimation ? (
        <div className="max-w-md w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-8 text-center flex flex-col items-center justify-center space-y-6 shadow-xl animate-bounce">
          <div className="text-8xl transform scale-125 transition-all duration-300">
            {currentCharacter.avatar}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-[#58cc02] tracking-tight">¡Caja Activada!</h2>
            <p className="text-gray-600 font-bold">Cargando tu racha de ventas y objetivos de hoy...</p>
          </div>
          <div className="w-full bg-[#e5e5e5] h-5 rounded-full overflow-hidden p-[2px]">
            <div className="bg-[#58cc02] h-full rounded-full w-full" style={{
              backgroundImage: 'linear-gradient(90deg, #58cc02 0%, #7dde12 50%, #58cc02 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1s linear infinite'
            }} />
          </div>
          <p className="text-sm text-gray-400 italic font-medium">"{currentCharacter.saleQuote}"</p>
        </div>
      ) : (
        <div className="max-w-xl w-full flex flex-col items-center space-y-6">
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

          {/* Character Speech Bubble */}
          <div className="w-full flex items-start gap-3 bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-2xl p-4 md:p-6 transition-all duration-300">
            <div className="text-6xl select-none transform hover:rotate-12 duration-150">
              {currentCharacter.avatar}
            </div>
            <div className="flex-1 relative bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700">
              <div className="absolute left-[-8px] top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-50 border-b-8 border-b-transparent" />
              <div className="absolute left-[-9px] top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent -z-10" />
              
              <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                {currentCharacter.name} dice:
              </span>
              <p className="leading-snug text-gray-700">
                {pendingVerification 
                  ? "📧 ¡Te he enviado un código de 6 dígitos a tu Gmail! Ingrésalo abajo para activar tu cuenta comercial al instante."
                  : (isRegistering ? currentCharacter.idleQuote : currentCharacter.loginQuote)}
              </p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 md:p-8 w-full shadow-lg">
            {!pendingVerification && (
              <div className="flex justify-around border-b-2 border-[#e5e5e5] pb-4 mb-6">
                <button
                  type="button"
                  className={`pb-2 font-black text-lg transition-colors duration-150 relative ${
                    !isRegistering ? 'text-[#58cc02]' : 'text-[#afafaf] hover:text-gray-500'
                  }`}
                  onClick={() => {
                    setIsRegistering(false);
                    setErrorMessage('');
                    setSuccessMessage('');
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
                    setSuccessMessage('');
                  }}
                >
                  Crea una Cuenta
                  {isRegistering && (
                    <div className="absolute bottom-[-18px] left-0 right-0 h-[4px] bg-[#58cc02] rounded-full" />
                  )}
                </button>
              </div>
            )}

            {/* MESSAGE BARS */}
            {errorMessage && (
              <div className="bg-[#ffedf0] border-2 border-[#ff7b7b] rounded-2xl p-3 text-[#ff4b4b] font-bold text-sm text-center mb-5 animate-shake">
                ⚠️ {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="bg-[#f2ffd9] border-2 border-[#58cc02] rounded-2xl p-4 text-[#58cc02] font-black text-sm text-center mb-5 flex flex-col items-center gap-2">
                <span className="text-2xl">📧</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* FLUX 1: OTP EMAIL VERIFICATION FORM */}
            {pendingVerification ? (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="space-y-2 text-center">
                  <label htmlFor="otp" className="text-sm font-black tracking-wide text-gray-500 block uppercase">
                    Código de 6 dígitos
                  </label>
                  <p className="text-xs text-gray-400 font-bold mb-4">Revisa tu correo {email.trim()}</p>
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-center tracking-widest text-3xl font-black py-4 bg-gray-50 border-2 border-[#e5e5e5] rounded-2xl outline-none focus:border-[#58cc02] focus:bg-white transition-all text-gray-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#58cc02] text-white border-b-[6px] border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[6px] font-black text-lg py-3.5 rounded-2xl transition-all duration-100 flex items-center justify-center gap-2 tracking-wide uppercase shadow-sm mt-8 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Confirmar y Activar Cajero 🦉
                      <Check size={20} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPendingVerification(false)}
                  className="w-full text-center text-xs font-black text-gray-400 hover:text-gray-600 uppercase mt-4"
                >
                  Volver al formulario
                </button>
              </form>
            ) : (
              // FLUX 2: STANDARD REGISTRATION/LOGIN FORM
              <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
                {/* Avatar character switcher */}
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
                  <p className="text-xs text-gray-400 italic font-semibold text-center mt-2 leading-relaxed">
                    {currentCharacter.intro}
                  </p>
                </div>

                {/* Input Username */}
                <div className="space-y-1">
                  <label htmlFor="username" className="text-sm font-black tracking-wide text-gray-500 block uppercase">
                    {isRegistering ? 'Nombre de Cajero' : 'Usuario o Correo'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-400">
                      <User2 size={18} />
                    </span>
                    <input
                      id="username"
                      type="text"
                      required
                      placeholder={isRegistering ? "Ej. Poetica" : "Ej. Poetica o jonas@gmail.com"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-[#e5e5e5] rounded-2xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Input Email (Registering only) */}
                {isRegistering && (
                  <div className="space-y-1">
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
                        required
                        placeholder="Ej. jonas@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-[#e5e5e5] rounded-2xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Input Password */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="text-sm font-black tracking-wide text-gray-500 block uppercase">
                      Contraseña Comercial
                    </label>
                    <span className="text-xs text-gray-400 font-bold">(Al menos 8 caracteres)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-400">
                      <KeyRound size={18} />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3 bg-gray-50 border-2 border-[#e5e5e5] rounded-2xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Requisitos de Registro Interactivos */}
                {isRegistering && (
                  <div className="bg-[#f7f7f7] border-2 border-[#e5e5e5] rounded-2xl p-4 space-y-2.5 mt-3 text-xs font-bold text-gray-600 transition-all duration-200 text-left">
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1 flex items-center gap-1">
                      <span>⚡</span> Requisitos de cuenta Clerk
                    </div>
                    
                    {/* Username requirement */}
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black text-white transition-colors duration-150 ${
                        username.trim().length >= 4 ? 'bg-[#58cc02]' : 'bg-gray-300'
                      }`}>
                        {username.trim().length >= 4 ? '✓' : '•'}
                      </div>
                      <span className={username.trim().length >= 4 ? 'text-gray-700' : 'text-gray-400'}>
                        Nombre de cajero: al menos 4 letras (actual: {username.trim().length})
                      </span>
                    </div>

                    {/* Email requirement */}
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black text-white transition-colors duration-150 ${
                        email.trim().includes('@') && email.trim().includes('.') ? 'bg-[#58cc02]' : 'bg-gray-300'
                      }`}>
                        {email.trim().includes('@') && email.trim().includes('.') ? '✓' : '•'}
                      </div>
                      <span className={email.trim().includes('@') && email.trim().includes('.') ? 'text-gray-700' : 'text-gray-400'}>
                        Correo válido (ej. nombre@gmail.com)
                      </span>
                    </div>

                    {/* Password Length requirement */}
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black text-white transition-colors duration-150 ${
                        password.length >= 8 ? 'bg-[#58cc02]' : 'bg-gray-300'
                      }`}>
                        {password.length >= 8 ? '✓' : '•'}
                      </div>
                      <span className={password.length >= 8 ? 'text-gray-700' : 'text-gray-400'}>
                        Contraseña: mínimo 8 caracteres (actual: {password.length})
                      </span>
                    </div>

                    {/* Password Complexity requirement */}
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black text-white transition-colors duration-150 ${
                        /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'bg-[#58cc02]' : 'bg-gray-300'
                      }`}>
                        {/[A-Z]/.test(password) && /[0-9]/.test(password) ? '✓' : '•'}
                      </div>
                      <span className={/[A-Z]/.test(password) && /[0-9]/.test(password) ? 'text-gray-700' : 'text-gray-400'}>
                        Seguridad: incluir mayúscula y número (ej. DuoPOS.2026)
                      </span>
                    </div>
                  </div>
                )}

                {/* Role selections */}
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
                          onClick={() => setRole(rOption.id as any)}
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
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#58cc02] text-white border-b-[6px] border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[6px] font-black text-lg py-3.5 rounded-2xl transition-all duration-100 flex items-center justify-center gap-2 tracking-wide uppercase shadow-sm mt-8 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      {isRegistering ? 'Crear Cajero & Iniciar' : 'Entrar a Trabajar'}
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>

                {/* Live Diagnostic Console */}
                {diagnosticLog.length > 0 && (
                  <div className="mt-5 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left shadow-inner">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5 font-mono mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                      Diagnóstico de Conexión en Vivo
                    </span>
                    <div className="font-mono text-[10px] text-emerald-400 space-y-1 max-h-[140px] overflow-y-auto leading-relaxed scrollbar-thin">
                      {diagnosticLog.map((log, index) => (
                        <div key={index} className="flex gap-2">
                          <span className="text-slate-600 select-none">&gt;</span>
                          <span className="whitespace-pre-wrap">{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 font-bold">
            💡 Consejo: Con Clerk, puedes usar tu nombre o tu correo electrónico indistintamente para entrar a tu caja registradora.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 2. COMPONENTE DE LOGIN LOCAL (ORIGINAL FALLBACK) ─────────────────────────
function LocalLoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('duo');
  const [role, setRole] = useState<'admin' | 'supervisor' | 'cashier'>('admin');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setDiagnosticLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    console.log(`[AUTH LOCAL] ${msg}`);
  };

  useEffect(() => {
    const isConfigured = isSupabaseConfigured();
    setDiagnosticLog([
      `${new Date().toLocaleTimeString()}: 🔌 Inicializando módulo de conexión comercial...`,
      isConfigured 
        ? `${new Date().toLocaleTimeString()}: 🌐 Conexión disponible con el servidor principal de base de datos.`
        : `${new Date().toLocaleTimeString()}: ⚠️ ATENCIÓN: Las credenciales de Supabase no están configuradas. La app operará únicamente en modo local offline.`
    ]);
  }, []);

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
    setIsLoading(true);
    addLog("----------------------------------------");
    addLog("Iniciando flujo de sesión local...");
    
    const userId = `local-${username.trim().toLowerCase()}`;
    const savedUsersRaw = localStorage.getItem('duo_pos_users');
    const users: User[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
    const existingUser = users.find(u => u.id === userId);

    let localUser: User;

    if (existingUser) {
      addLog("¡Usuario existente encontrado! Recuperando tu racha, XP y nivel...");
      localUser = {
        ...existingUser,
        avatar: selectedCharacter, // allow changing avatar
        role: role // allow changing role
      };
    } else {
      addLog("Creando un perfil nuevo de cajero local...");
      localUser = {
        id: userId,
        username: username.trim(),
        email: email || `${username.trim()}@local.pos`,
        avatar: selectedCharacter,
        streak: 3,
        lastSaleDate: null,
        xp: 120,
        level: 1,
        dailyGoal: 150,
        levelTitle: 'Cajero Novato 🦉',
        role: role,
        gems: 40,
        gemsEarnedTotal: 40,
        unlockedSkins: ['standard'],
        activeSkin: 'standard',
        unlockedBadges: [],
        completedMissionsToday: []
      };
      
      // Save new user in users array
      users.push(localUser);
      localStorage.setItem('duo_pos_users', JSON.stringify(users));
    }

    localStorage.setItem('duo_pos_active_user', JSON.stringify(localUser));
    setSuccessAnimation(true);
    addLog("¡Sesión local iniciada con éxito!");
    setTimeout(() => onLoginSuccess(localUser), 1200);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('¡Por favor dinos tu nombre o apodo!');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    addLog("----------------------------------------");
    addLog("Registrando cajero local...");

    const userId = `local-${username.trim().toLowerCase()}`;
    const savedUsersRaw = localStorage.getItem('duo_pos_users');
    const users: User[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
    const existingUser = users.find(u => u.id === userId);

    let localUser: User;

    if (existingUser) {
      addLog("Este cajero ya estaba registrado. Iniciando con perfil existente...");
      localUser = {
        ...existingUser,
        avatar: selectedCharacter,
        role: role
      };
    } else {
      addLog("Creando perfil nuevo para cajero...");
      localUser = {
        id: userId,
        username: username.trim(),
        email: email.trim() || `${username.trim()}@local.pos`,
        avatar: selectedCharacter,
        streak: 1,
        lastSaleDate: null,
        xp: 120,
        level: 1,
        dailyGoal: 150,
        levelTitle: 'Cajero Novato 🦉',
        role: role,
        gems: 40,
        gemsEarnedTotal: 40,
        unlockedSkins: ['standard'],
        activeSkin: 'standard',
        unlockedBadges: [],
        completedMissionsToday: []
      };
      
      users.push(localUser);
      localStorage.setItem('duo_pos_users', JSON.stringify(users));
    }

    localStorage.setItem('duo_pos_active_user', JSON.stringify(localUser));
    setSuccessAnimation(true);
    addLog("¡Cajero registrado localmente!");
    setTimeout(() => onLoginSuccess(localUser), 1200);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col items-center justify-center p-4 relative overflow-y-auto py-8 font-sans">
      <div className="absolute top-10 left-10 text-6xl opacity-10 animate-pulse pointer-events-none">🦉</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-10 animate-bounce pointer-events-none">✨</div>

      {successAnimation ? (
        <div className="max-w-md w-full bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-8 text-center flex flex-col items-center justify-center space-y-6 shadow-xl animate-bounce">
          <div className="text-8xl transform scale-125 transition-all duration-300">
            {currentCharacter.avatar}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-[#58cc02] tracking-tight">¡Caja Activada!</h2>
            <p className="text-gray-600 font-bold">Cargando tu racha de ventas y objetivos de hoy...</p>
          </div>
          <div className="w-full bg-[#e5e5e5] h-5 rounded-full overflow-hidden p-[2px]">
            <div className="bg-[#58cc02] h-full rounded-full w-full animate-shimmer" style={{
              backgroundImage: 'linear-gradient(90deg, #58cc02 0%, #7dde12 50%, #58cc02 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1s linear infinite'
            }} />
          </div>
          <p className="text-sm text-gray-400 italic font-medium">"{currentCharacter.saleQuote}"</p>
        </div>
      ) : (
        <div className="max-w-xl w-full flex flex-col items-center space-y-6">
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

          <div className="w-full flex items-start gap-3 bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-2xl p-4 md:p-6">
            <div className="text-6xl select-none transform hover:rotate-12 duration-150">
              {currentCharacter.avatar}
            </div>
            <div className="flex-1 relative bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-sm font-bold text-gray-700">
              <div className="absolute left-[-8px] top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-50 border-b-8 border-b-transparent" />
              <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">
                {currentCharacter.name} dice:
              </span>
              <p className="leading-snug text-gray-700">
                {currentCharacter.loginQuote} (Modo Local Offline Activo)
              </p>
            </div>
          </div>

          <div className="bg-white border-2 border-[#e5e5e5] border-b-[8px] rounded-3xl p-6 md:p-8 w-full shadow-lg">
            <div className="flex justify-around border-b-2 border-[#e5e5e5] pb-4 mb-6">
              <button
                type="button"
                className={`pb-2 font-black text-lg transition-colors duration-150 relative ${
                  !isRegistering ? 'text-[#58cc02]' : 'text-[#afafaf] hover:text-gray-500'
                }`}
                onClick={() => setIsRegistering(false)}
              >
                Inicia Sesión (Local)
                {!isRegistering && (
                  <div className="absolute bottom-[-18px] left-0 right-0 h-[4px] bg-[#58cc02] rounded-full" />
                )}
              </button>
              <button
                type="button"
                className={`pb-2 font-black text-lg transition-colors duration-150 relative ${
                  isRegistering ? 'text-[#58cc02]' : 'text-[#afafaf] hover:text-gray-500'
                }`}
                onClick={() => setIsRegistering(true)}
              >
                Crea una Cuenta (Local)
                {isRegistering && (
                  <div className="absolute bottom-[-18px] left-0 right-0 h-[4px] bg-[#58cc02] rounded-full" />
                )}
              </button>
            </div>

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
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
              </div>

              <div className="space-y-1">
                <label htmlFor="local-username" className="text-sm font-black tracking-wide text-gray-500 block uppercase">
                  Nombre de Cajero
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-gray-400">
                    <User2 size={18} />
                  </span>
                  <input
                    id="local-username"
                    type="text"
                    required
                    placeholder="Ej. Poetica"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-[#e5e5e5] rounded-2xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#58cc02] text-white border-b-[6px] border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[6px] font-black text-lg py-3.5 rounded-2xl transition-all duration-100 flex items-center justify-center gap-2 tracking-wide uppercase shadow-sm mt-8 cursor-pointer"
              >
                {isRegistering ? 'Crear Cajero Local' : 'Entrar a Trabajar (Local)'}
                <ChevronRight size={20} />
              </button>

              {diagnosticLog.length > 0 && (
                <div className="mt-5 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left shadow-inner">
                  <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5 font-mono mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block"></span>
                    Consola Local Offline
                  </span>
                  <div className="font-mono text-[10px] text-amber-400 space-y-1 max-h-[140px] overflow-y-auto leading-relaxed scrollbar-thin">
                    {diagnosticLog.map((log, index) => (
                      <div key={index} className="flex gap-2">
                        <span className="text-slate-600 select-none">&gt;</span>
                        <span className="whitespace-pre-wrap">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN CONTAINER ROUTER ────────────────────────────────────────────────────
export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (isClerkConfigured) {
    return <ClerkLoginScreen onLoginSuccess={onLoginSuccess} />;
  } else {
    return <LocalLoginScreen onLoginSuccess={onLoginSuccess} />;
  }
}
