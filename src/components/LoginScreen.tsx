import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { DUO_CHARACTERS, Character } from '../initialData';
import { KeyRound, Mail, User2, ChevronRight, Award, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';


interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
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
    console.log(`[AUTH DIAGNOSTIC] ${msg}`);
  };

  useEffect(() => {
    const isConfigured = isSupabaseConfigured();
    setDiagnosticLog([
      `${new Date().toLocaleTimeString()}: 🔌 Inicializando módulo de conexión comercial...`,
      isConfigured 
        ? `${new Date().toLocaleTimeString()}: 🌐 Conexión disponible con el servidor principal de base de datos.`
        : `${new Date().toLocaleTimeString()}: ⚠️ ATENCIÓN: Las credenciales de Supabase no están configuradas en Vercel. La app operará únicamente en modo local offline.`
    ]);
  }, []);

  const characterKeys = Object.keys(DUO_CHARACTERS);
  const currentCharacter: Character = DUO_CHARACTERS[selectedCharacter] || DUO_CHARACTERS.duo;

  // Helper para mapear un row de Supabase profiles a User de TypeScript
  const mapProfileToUser = (profile: any): User => ({
    id: profile.id,
    username: profile.username,
    email: profile.email,
    avatar: profile.avatar,
    streak: profile.streak,
    lastSaleDate: profile.last_sale_date,
    xp: profile.xp,
    level: profile.level,
    dailyGoal: Number(profile.daily_goal),
    levelTitle: profile.level_title,
    role: profile.role,
    gems: profile.gems,
    gemsEarnedTotal: profile.gems_earned_total,
    unlockedSkins: profile.unlocked_skins,
    activeSkin: profile.active_skin,
    unlockedBadges: profile.unlocked_badges,
    completedMissionsToday: profile.completed_missions_today
  });

  // Crear un perfil por defecto en Supabase si no existe (self-healing)
  const createDefaultProfile = (userId: string, userEmail: string, userName: string) => ({
    id: userId,
    username: userName,
    email: userEmail,
    avatar: selectedCharacter,
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

  const isDeveloperUser = (uname: string, uemail?: string): boolean => {
    const lowerName = uname.trim().toLowerCase();
    const lowerEmail = (uemail || '').trim().toLowerCase();
    return lowerName === 'jonas' || lowerName === 'jonas_mendoza' || lowerEmail.includes('jonas') || lowerName === 'admin';
  };

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
    addLog("Iniciando flujo de sesión...");
    
    try {
      // Si Supabase no está configurado, hacer login local
      if (!isSupabaseConfigured()) {
        addLog("Supabase no configurado. Iniciando sesión local offline...");
        const localUser: User = {
          id: 'user-admin',
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
        localStorage.setItem('duo_pos_active_user', JSON.stringify(localUser));
        setSuccessAnimation(true);
        addLog("¡Sesión local iniciada con éxito!");
        setTimeout(() => onLoginSuccess(localUser), 1200);
        return;
      }

      addLog("Detectando tipo de credencial (nombre de usuario o correo)...");
      let emailToAuth = username.trim();
      
      // Si el input no es un correo, buscar el correo asociado en profiles
      if (!emailToAuth.includes('@')) {
        addLog(`Buscando correo electrónico asociado al usuario "${username.trim()}"...`);
        
        const profileTimeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_LIMIT')), 15000)
        );
        
        let profileData: any = null;
        let profileErr: any = null;
        
        try {
          const result: any = await Promise.race([
            supabase.from('profiles').select('email').eq('username', username.trim()).maybeSingle(),
            profileTimeoutPromise
          ]);
          profileData = result.data;
          profileErr = result.error;
        } catch (err: any) {
          if (err.message === 'TIMEOUT_LIMIT') {
            addLog("⚠️ Conexión lenta al buscar usuario. Activando inicio alternativo local...");
            // Cancelar sesiones pendientes de Supabase
            supabase.auth.signOut().catch(() => {});
            const localUser: User = {
              id: `local-${username.trim().toLowerCase()}`,
              username: username.trim(),
              email: `${username.trim()}@local.pos`,
              avatar: selectedCharacter || 'duo',
              streak: 2,
              lastSaleDate: null,
              xp: 120,
              level: 1,
              dailyGoal: 150,
              levelTitle: 'Cajero Novato 🦉',
              role: role,
              gems: 10,
              gemsEarnedTotal: 10,
              unlockedSkins: ['standard'],
              activeSkin: 'standard',
              unlockedBadges: [],
              completedMissionsToday: []
            };
            localStorage.setItem('duo_pos_active_user', JSON.stringify(localUser));
            setSuccessAnimation(true);
            setTimeout(() => onLoginSuccess(localUser), 1200);
            return;
          }
          addLog(`❌ Error de red durante búsqueda de usuario: ${err.message}`);
          setErrorMessage('Error de red al buscar usuario: ' + err.message);
          setIsLoading(false);
          return;
        }
          
        if (profileErr) {
          addLog(`❌ Error en tabla 'profiles': ${profileErr.message}`);
          setErrorMessage('Error al buscar usuario: ' + profileErr.message);
          setIsLoading(false);
          return;
        }
        
        if (!profileData) {
          addLog(`❌ El nombre de usuario "${username.trim()}" no está registrado.`);
          setErrorMessage('No se encontró ningún usuario con ese nombre.');
          setIsLoading(false);
          return;
        }
        
        emailToAuth = profileData.email;
        addLog(`Correo encontrado: ${emailToAuth}`);
      }

      // Autenticación con Supabase con un Límite de Tiempo (Timeout de 5s para evitar cuelgues)
      addLog(`Intentando iniciar sesión con Supabase Auth (${emailToAuth})...`);
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_LIMIT')), 15000)
      );

      let authData: any = null;
      let authErr: any = null;

      try {
        const result: any = await Promise.race([
          supabase.auth.signInWithPassword({
            email: emailToAuth,
            password: password
          }),
          timeoutPromise
        ]);
        authData = result.data;
        authErr = result.error;
      } catch (err: any) {
        if (err.message === 'TIMEOUT_LIMIT') {
          addLog("⚠️ La conexión con Supabase tardó demasiado (Timeout). Activando inicio local alternativo...");
          supabase.auth.signOut().catch(() => {});

          const localUser: User = {
             id: `local-${username.trim().toLowerCase()}`,
             username: username.trim(),
             email: emailToAuth,
             avatar: selectedCharacter || 'duo',
             streak: 2,
             lastSaleDate: null,
             xp: 120,
             level: 1,
             dailyGoal: 150,
             levelTitle: 'Cajero Novato 🦉',
             role: role,
             gems: 10,
             gemsEarnedTotal: 10,
             unlockedSkins: ['standard'],
             activeSkin: 'standard',
             unlockedBadges: [],
             completedMissionsToday: []
           };
           localStorage.setItem('duo_pos_active_user', JSON.stringify(localUser));
           setSuccessAnimation(true);
           setTimeout(() => onLoginSuccess(localUser), 1200);
           return;
         }
        addLog(`❌ Error de red en autenticación: ${err.message}`);
        setErrorMessage('Error de red al intentar conectar: ' + err.message);
        setIsLoading(false);
        return;
      }

      if (authErr) {
        addLog(`❌ Error de autenticación Supabase: ${authErr.message}`);
        if (authErr.message?.includes('429') || authErr.message?.includes('Too Many') || authErr.message?.includes('rate')) {
          setErrorMessage('⏳ Demasiados intentos. Espera 1 minuto antes de intentar de nuevo.');
        } else if (authErr.message?.includes('Email not confirmed')) {
          setErrorMessage('📧 Tu correo aún no está confirmado. Pide al administrador que lo confirme en Supabase.');
        } else {
          setErrorMessage('Error de inicio de sesión: ' + authErr.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        addLog("❌ La respuesta de sesión no devolvió datos de usuario.");
        setErrorMessage('No se pudo obtener la información del usuario.');
        setIsLoading(false);
        return;
      }

      addLog(`¡Sesión de Auth correcta! ID: ${authData.user.id}. Cargando perfil comercial...`);

      // Obtener perfil de la base de datos con Timeout
      let userProfile: any = null;
      let profileFetchErr: any = null;

      try {
        const result: any = await Promise.race([
          supabase.from('profiles').select('*').eq('id', authData.user.id).maybeSingle(),
          timeoutPromise
        ]);
        userProfile = result.data;
        profileFetchErr = result.error;
      } catch (err: any) {
        if (err.message === 'TIMEOUT_LIMIT') {
          addLog("⚠️ Timeout cargando perfil de base de datos. Creando perfil offline.");
          userProfile = {
            id: authData.user.id,
            username: username.trim(),
            email: emailToAuth,
            role: role
          };
        } else {
          addLog(`❌ Error de red cargando perfil: ${err.message}`);
          setErrorMessage('Error al obtener perfil: ' + err.message);
          setIsLoading(false);
          return;
        }
      }

      if (profileFetchErr) {
        addLog(`❌ Error de base de datos en tabla 'profiles': ${profileFetchErr.message}`);
        setErrorMessage('Error al obtener perfil: ' + profileFetchErr.message);
        setIsLoading(false);
        return;
      }

      // Self-healing: crear perfil si no existe
      if (!userProfile) {
        addLog("⚠️ El perfil comercial no existe. Iniciando creación automática (self-healing)...");
        const defaultProfile = createDefaultProfile(
          authData.user.id,
          authData.user.email || emailToAuth,
          authData.user.user_metadata?.username || username.trim()
        );

        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert(defaultProfile)
          .select()
          .maybeSingle();

        if (insertErr || !newProfile) {
          addLog(`❌ Falló la creación del perfil comercial: ${insertErr?.message}`);
          setErrorMessage('Error al crear perfil: ' + (insertErr?.message || 'Error desconocido'));
          setIsLoading(false);
          return;
        }
        userProfile = newProfile;
        addLog("¡Perfil comercial creado exitosamente!");
      } else {
        addLog("¡Perfil comercial cargado correctamente!");
      }

      const user = mapProfileToUser(userProfile);
      localStorage.setItem('duo_pos_active_user', JSON.stringify(user));

      addLog("¡Sesión iniciada con éxito! Redirigiendo...");
      setSuccessAnimation(true);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 1200);
    } catch (err: any) {
      addLog(`❌ Error general: ${err.message}`);
      setErrorMessage('Ocurrió un error inesperado: ' + err.message);
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
    addLog("----------------------------------------");
    addLog("Iniciando flujo de registro comercial...");

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_LIMIT')), 15000)
    );

    try {
      // Si Supabase no está configurado, registrar localmente
      if (!isSupabaseConfigured()) {
        addLog("Supabase no configurado. Registrando cajero en modo local offline...");
        const localUser: User = {
          id: 'user-admin',
          username: username.trim(),
          email: email.trim(),
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
        localStorage.setItem('duo_pos_active_user', JSON.stringify(localUser));
        setSuccessAnimation(true);
        addLog("¡Cajero local registrado con éxito!");
        setTimeout(() => onLoginSuccess(localUser), 1200);
        return;
      }

      // Validar si el nombre de usuario ya está tomado con Timeout
      addLog(`Verificando si el usuario "${username.trim()}" ya existe en la base de datos...`);
      let checkData: any = null;
      let checkErr: any = null;

      try {
        const result: any = await Promise.race([
          supabase.from('profiles').select('id').eq('username', username.trim()).maybeSingle(),
          timeoutPromise
        ]);
        checkData = result.data;
        checkErr = result.error;
      } catch (err: any) {
        if (err.message === 'TIMEOUT_LIMIT') {
          addLog("⚠️ La consulta de base de datos tardó demasiado (Timeout).");
          throw new Error('TIMEOUT_LIMIT');
        }
        throw err;
      }

      if (checkErr) {
        addLog(`❌ Error en tabla 'profiles': ${checkErr.message}`);
        setErrorMessage('Error al validar nombre de usuario: ' + checkErr.message);
        setIsLoading(false);
        return;
      }

      if (checkData) {
        addLog(`❌ El nombre de usuario "${username.trim()}" ya está tomado.`);
        setErrorMessage('Ese usuario ya existe. ¡Elige otro o inicia sesión!');
        setIsLoading(false);
        return;
      }

      addLog("Nombre de usuario disponible.");

      // Registro nativo en Supabase Auth con Timeout
      addLog(`Creando credenciales en Supabase Auth (${email.trim()})...`);
      let signUpData: any = null;
      let signUpErr: any = null;

      try {
        const result: any = await Promise.race([
          supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
              data: {
                username: username.trim(),
                role: role,
                avatar: selectedCharacter
              }
            }
          }),
          timeoutPromise
        ]);
        signUpData = result.data;
        signUpErr = result.error;
      } catch (err: any) {
        if (err.message === 'TIMEOUT_LIMIT') {
          addLog("⚠️ El registro en Supabase Auth tardó demasiado (Timeout).");
          throw new Error('TIMEOUT_LIMIT');
        }
        throw err;
      }

      if (signUpErr) {
        addLog(`❌ Error de Supabase Auth: ${signUpErr.message}`);
        if (signUpErr.message?.includes('429') || signUpErr.message?.includes('Too Many') || signUpErr.message?.includes('rate limit')) {
          setErrorMessage('⏳ Demasiados intentos. Por favor espera unos minutos o revisa si ya recibiste el correo de confirmación.');
        } else {
          setErrorMessage('Error al registrar: ' + signUpErr.message);
        }
        setIsLoading(false);
        return;
      }

      const authUser = signUpData.user;
      const authSession = signUpData.session;

      if (authUser && !authSession) {
        addLog("📧 Confirmación de correo requerida en Supabase. Esperando confirmación por email...");
        setSuccessMessage('¡Registro casi listo! 📧 Se ha enviado un enlace de confirmación a tu correo. Por favor, confírmalo para poder iniciar sesión.');
        setIsLoading(false);
        return;
      }

      if (!authUser) {
        addLog("❌ Error: No se pudo obtener el usuario creado.");
        setErrorMessage('Error al registrar: No se pudo crear el usuario.');
        setIsLoading(false);
        return;
      }

      addLog(`¡Usuario creado! ID: ${authUser.id}. Creando perfil comercial...`);

      // Actualizar datos del perfil creado por el trigger con Timeout
      addLog("Actualizando datos del perfil en tabla 'profiles'...");
      try {
        await Promise.race([
          supabase
            .from('profiles')
            .update({
              avatar: selectedCharacter,
              streak: 1,
              xp: 120,
              level: 1,
              daily_goal: 150,
              level_title: 'Cajero Novato 🦉',
              gems: 40,
              gems_earned_total: 40,
              unlocked_skins: ['standard'],
              active_skin: 'standard',
              unlocked_badges: [],
              completed_missions_today: []
            })
            .eq('id', authUser.id),
          timeoutPromise
        ]);
        addLog("Datos del perfil comercial guardados.");
      } catch (err: any) {
        addLog(`⚠️ Advertencia al actualizar perfil: ${err.message || err}. Se intentará autoreparar.`);
        console.error('⚠️ [REGISTER DEBUG] Error o Timeout actualizando perfil:', err);
      }

      // Obtener el perfil completo con Timeout
      addLog("Cargando perfil comercial final...");
      let userProfile: any = null;
      try {
        const result: any = await Promise.race([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle(),
          timeoutPromise
        ]);
        userProfile = result.data;
      } catch (err: any) {
        addLog(`⚠️ Advertencia al leer perfil final: ${err.message || err}`);
      }

      // Self-healing: si el trigger o la lectura fallaron, lo creamos
      if (!userProfile) {
        addLog("⚠️ Perfil no encontrado. Iniciando autoreparación de perfil comercial...");
        const defaultProfile = createDefaultProfile(authUser.id, email.trim(), username.trim());

        try {
          const result: any = await Promise.race([
            supabase
              .from('profiles')
              .insert(defaultProfile)
              .select()
              .maybeSingle(),
            timeoutPromise
          ]);
          userProfile = result.data;
          if (result.error) throw result.error;
          addLog("¡Perfil comercial reparado y creado con éxito!");
        } catch (err: any) {
          addLog(`❌ Error fatal en autoreparación: ${err.message || err}`);
          console.error("❌ [REGISTER DEBUG] Error fatal de autoreparación de perfil:", err);
          setErrorMessage('Error al crear perfil: ' + (err.message || 'Error desconocido'));
          setIsLoading(false);
          return;
        }
      } else {
        addLog("¡Perfil comercial cargado con éxito!");
      }

      const newUser = mapProfileToUser(userProfile);
      localStorage.setItem('duo_pos_active_user', JSON.stringify(newUser));

      addLog("¡Registro e inicio exitosos! Redirigiendo...");
      setSuccessAnimation(true);
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 1200);
    } catch (err: any) {
      if (err.message === 'TIMEOUT_LIMIT') {
        addLog("⚠️ Conexión lenta o bloqueada. Entrando en modo local offline automático...");
        const localUser: User = {
          id: `local-${username.trim().toLowerCase()}`,
          username: username.trim(),
          email: email.trim(),
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
        localStorage.setItem('duo_pos_active_user', JSON.stringify(localUser));
        setSuccessAnimation(true);
        setTimeout(() => onLoginSuccess(localUser), 1200);
        return;
      }
      addLog(`❌ Error general en registro: ${err.message}`);
      setErrorMessage('Ocurrió un error inesperado: ' + err.message);
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

            {/* ERROR MESSAGE BAR */}
            {errorMessage && (
              <div className="bg-[#ffedf0] border-2 border-[#ff7b7b] rounded-2xl p-3 text-[#ff4b4b] font-bold text-sm text-center mb-5 animate-shake">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* SUCCESS MESSAGE BAR */}
            {successMessage && (
              <div className="bg-[#f2ffd9] border-2 border-[#58cc02] rounded-2xl p-4 text-[#58cc02] font-black text-sm text-center mb-5 flex flex-col items-center gap-2">
                <span className="text-2xl">📧</span>
                <span>{successMessage}</span>
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
                disabled={isLoading}
                className={`w-full bg-[#58cc02] text-white border-b-[6px] border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[6px] font-black text-lg py-3.5 rounded-2xl transition-all duration-100 flex items-center justify-center gap-2 tracking-wide uppercase shadow-sm mt-8 ${isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
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

              {/* Live Connection Diagnostic Console */}
              {diagnosticLog.length > 0 && (
                <div className="mt-5 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-left shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                      Diagnóstico de Conexión en Vivo
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setDiagnosticLog([])} 
                      className="text-[9px] text-slate-500 hover:text-slate-300 font-bold uppercase transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
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
          </div>

          <p className="text-center text-xs text-gray-400 font-bold">
            💡 Tip: Si ya tienes productos registrados, usa tu nombre habitual para conservar la racha de días anteriores.
          </p>
        </div>
      )}
    </div>
  );
}
