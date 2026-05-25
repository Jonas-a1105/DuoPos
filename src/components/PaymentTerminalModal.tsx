/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Wifi, ShieldCheck, HelpCircle, Activity, Delete, Key, Check, RefreshCw, X } from 'lucide-react';
import { HardwareDeviceSettings } from '../utils/hardware';
import { playSound } from '../utils/sounds';

interface PaymentTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  hardwareSettings: HardwareDeviceSettings;
  onSuccess: (cardDetails: {
    terminalId: string;
    authCode: string;
    brand: string;
    last4: string;
    cardholderName: string;
    cardType: 'credit' | 'debit';
    aid: string;
    arqc: string;
    signatureBase64: string;
  }) => void;
  onGrantXp: (amount: number) => void;
}

export default function PaymentTerminalModal({
  isOpen,
  onClose,
  totalAmount,
  hardwareSettings,
  onSuccess,
  onGrantXp
}: PaymentTerminalModalProps) {
  if (!isOpen) return null;

  const terminalSettings = hardwareSettings.paymentTerminal;

  // Connection & Transaction states: 
  // 'idle' | 'connecting' | 'waiting_card' | 'entering_pin' | 'signing' | 'processing' | 'approved' | 'declined' | 'timeout'
  const [step, setStep] = useState<'connecting' | 'waiting_card' | 'entering_pin' | 'signing' | 'processing' | 'approved' | 'declined' | 'timeout'>('connecting');
  const [logs, setLogs] = useState<string[]>([]);
  const [pin, setPin] = useState<string>('');
  
  // Simulated Card Info
  const [selectedBrand, setSelectedBrand] = useState<'VISA' | 'MASTERCARD' | 'AMEX'>('VISA');
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('4152319041285038');
  
  // Signature Canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Connection logs timing simulation
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  useEffect(() => {
    if (step === 'connecting') {
      setLogs([]);
      addLog(`[INTEGRACION POS] Inicializando modulo para terminal ID: ${terminalSettings.terminalId}`);
      addLog(`[CONEXION] Canal configurado: ${terminalSettings.connectionType.toUpperCase()}`);
      if (terminalSettings.connectionType === 'tcp_ip') {
        addLog(`[RED] Intentando handshake con socket TCP en ${terminalSettings.ipAddress}:${terminalSettings.port}...`);
      } else {
        addLog(`[CONEXION] Buscando terminal Bluetooth de baja energía (BLE)...`);
      }

      const timerId = setTimeout(() => {
        if (terminalSettings.mockResponseCode === 'TO') {
          setStep('timeout');
          addLog(`[ERROR RED] ETIMEDOUT - Sin respuesta de la pasarela local. Código: TO`);
          playSound('error');
          return;
        }
        
        playSound('levelup');
        setStep('waiting_card');
        addLog(`[CONEXION] ¡Conexión establecida con éxito!`);
        addLog(`[API POS] Envío de cobro TX: <STX>0100|${terminalSettings.terminalId}|USD${totalAmount.toFixed(2)}<ETX>`);
        addLog(`[API POS] Respuesta RX: <STX>ACK|WAITING_CARD<ETX>`);
        addLog(`[SMARTPOS] Esperando lectura de chip / tarjeta NFC...`);
      }, 1500);

      return () => clearTimeout(timerId);
    }
  }, [step]);

  // Card Tap simulation
  const handleTapCard = (brand: 'VISA' | 'MASTERCARD' | 'AMEX') => {
    playSound('click');
    setSelectedBrand(brand);
    // Auto populate mock credentials based on selected brand
    if (brand === 'VISA') {
      setCardHolder('JUANA R. LOPEZ PEREZ');
      setCardNumber('4152319041285038');
    } else if (brand === 'MASTERCARD') {
      setCardHolder('PEDRO DUO DOMINGUEZ');
      setCardNumber('5281403912808841');
    } else {
      setCardHolder('AMEX CORPORATE RACHA');
      setCardNumber('375981208310002');
    }
    
    addLog(`[READER] Tarjeta ${brand} leída por inducción electromagnética (NFC Clásico)`);
    addLog(`[EMV ISO-7816] Extrayendo datos Track 2...`);
    addLog(`[EMV ISO-7816] Cardholder Name: ${cardHolder || 'CUSTOMER NAME'}`);
    
    // Jump to PIN verification
    setStep('entering_pin');
    addLog(`[SMARTPOS] Tarjeta detectada. Solicitando autenticación NIP/PIN del cliente...`);
  };

  // PIN pad submission
  const handlePinSubmit = () => {
    if (pin.length < 4) {
      playSound('error');
      alert('⚠️ El PIN de seguridad debe contener al menos 4 dígitos digita en la terminal.');
      return;
    }
    playSound('levelup');
    addLog(`[SECURITY] PIN capturado de forma encriptada bajo llave DUKPT.`);
    addLog(`[EMV ISO-7816] Generando criptograma ARQC para validación bancaria...`);
    
    if (terminalSettings.requireSignature) {
      setStep('signing');
      addLog(`[SIGNATURE] Solicitada firma manuscrita digital por política de emisor.`);
    } else {
      triggerHostAuth();
    }
  };

  const triggerHostAuth = () => {
    setStep('processing');
    addLog(`[HOST ONLINE] Enviando autorización bancaria...`);
    addLog(`[API] Payload XML: <AuthReq><Amt>${totalAmount}</Amt><Card>${cardNumber.substring(0,6)}******${cardNumber.substring(cardNumber.length-4)}</Card></AuthReq>`);

    setTimeout(() => {
      const code = terminalSettings.mockResponseCode;
      if (code === '00') {
        playSound('levelup');
        setStep('approved');
        addLog(`[HOST ONLINE] Transacción APROBADA con éxito por el banco.`);
        addLog(`[API POS] Respuesta RX: <STX>00|APROBADA|AUTH_621453|AID_A0000000031010|ARQC_2C91B49D22<ETX>`);
      } else if (code === '51') {
        playSound('error');
        setStep('declined');
        addLog(`[HOST ONLINE] Transacción DECLINADA por el banco: Código de Rechazo 51 - FONDOS INSUFICIENTES.`);
      } else if (code === '05') {
        playSound('error');
        setStep('declined');
        addLog(`[HOST ONLINE] Transacción RECHAZADA por el banco: Código 05 - TARJETA DENEGADA / RESTRINGIDA.`);
      }
    }, 2000);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    playSound('swoosh');
  };

  const handleFinishTransaction = () => {
    const canvas = canvasRef.current;
    const signatureBase64 = canvas ? canvas.toDataURL('image/png') : '';
    
    const randomAuthCode = Math.floor(Math.random() * 899999 + 100000).toString();
    const mockAID = selectedBrand === 'VISA' ? 'A0000000031010' : selectedBrand === 'MASTERCARD' ? 'A0000000041010' : 'A0000000251010';
    const mockARQC = Math.random().toString(16).substring(2, 12).toUpperCase();

    // Call success handler
    onSuccess({
      terminalId: terminalSettings.terminalId,
      authCode: randomAuthCode,
      brand: selectedBrand,
      last4: cardNumber.substring(cardNumber.length - 4),
      cardholderName: cardHolder || 'DIOS DEL DUOLINGO',
      cardType: selectedBrand === 'AMEX' ? 'credit' : 'debit',
      aid: mockAID,
      arqc: mockARQC,
      signatureBase64
    });

    onGrantXp(15);
    playSound('levelup');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Left column: Simulated POS Machine */}
        <div className="bg-[#121214] p-6 text-white flex flex-col justify-between border-r border-slate-800">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#58cc02] rounded-lg">
                <CreditCard className="text-white w-4 h-4" />
              </span>
              <div>
                <h4 className="font-extrabold text-[#58cc02] text-xs uppercase leading-none">POS TERMINAL</h4>
                <span className="text-[9px] text-gray-500 font-mono font-black">{terminalSettings.provider.toUpperCase()} v4.1</span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[9px] font-bold">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
              <Wifi size={10} className="text-green-500" />
              <span className="font-mono text-gray-400">{terminalSettings.connectionType.toUpperCase()}</span>
            </div>
          </div>

          {/* Interactive Screen Display */}
          <div className="my-5 bg-[#1a2e23] border-4 border-[#334155] rounded-2xl p-4 font-mono select-none shadow-inner min-h-[220px] flex flex-col justify-between">
            <div className="text-emerald-400 font-black text-center border-b border-emerald-900/40 pb-1.5 flex justify-between items-center text-[11px]">
              <span>💳 DUOPOS S.A.</span>
              <span className="bg-emerald-950 px-1 py-0.5 rounded text-[8px] animate-pulse">ONLINE</span>
            </div>

            {/* Display according to steps */}
            {step === 'connecting' && (
              <div className="text-center py-6 text-emerald-300 space-y-2 animate-pulse">
                <RefreshCw size={24} className="mx-auto animate-spin" />
                <p className="text-xs font-bold uppercase tracking-wider">Estableciendo Link...</p>
                <p className="text-[9px] text-emerald-500">Puertos RS232 / TCP-IP</p>
              </div>
            )}

            {step === 'waiting_card' && (
              <div className="text-center py-4 space-y-3 animate-fadeIn">
                <p className="text-emerald-400 text-xs font-black uppercase text-center leading-tight">
                  IMPORTE A COBRAR:
                </p>
                <p className="text-2xl text-white font-extrabold leading-none tracking-tight">
                  ${totalAmount.toFixed(2)} USD
                </p>
                <div className="border border-dashed border-emerald-800 p-2 text-[10px] rounded text-emerald-300 bg-emerald-950/40">
                  ⚡ DESLIZA, INSERTA O ACERCA TU SMARTPAY NFC
                </div>
              </div>
            )}

            {step === 'entering_pin' && (
              <div className="text-center py-3 space-y-2">
                <p className="text-amber-400 text-[10px] font-black uppercase">TARJETA VERIFICADA CHIP</p>
                <p className="text-xs uppercase text-emerald-200">INTRODUCE TU NIP/PIN EN TECLADO:</p>
                <div className="bg-[#0f1d15] py-2 rounded border border-emerald-900 tracking-widest text-xl text-emerald-400 font-black">
                  {pin.replace(/./g, '●') || <span className="text-xs text-emerald-700 animate-pulse">ESPERANDO PIN</span>}
                </div>
                <p className="text-[8px] text-emerald-500">Protegido por Keypad Criptográfico PCI-PTS</p>
              </div>
            )}

            {step === 'signing' && (
              <div className="text-center py-4 space-y-1.5">
                <ShieldCheck size={20} className="mx-auto text-yellow-400" />
                <p className="text-white text-xs font-black">REQUIERE FIRMA CLIENTECART</p>
                <p className="text-[9px] text-emerald-300 leading-tight">Por favor, firma en el lienzo interactivo del tablet contiguo para autorizar.</p>
              </div>
            )}

            {step === 'processing' && (
              <div className="text-center py-6 text-emerald-300 space-y-2 animate-pulse">
                <RefreshCw size={24} className="mx-auto animate-spin text-emerald-400" />
                <p className="text-xs font-bold uppercase tracking-wider">AUTORIZANDO HOST...</p>
                <p className="text-[9px] text-emerald-500">Contactando switch emisor bancario</p>
              </div>
            )}

            {step === 'approved' && (
              <div className="text-center py-4 text-emerald-300 space-y-2">
                <div className="w-8 h-8 bg-green-900 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-400">
                  <Check size={16} className="text-emerald-400" />
                </div>
                <p className="text-xs font-extrabold uppercase text-[#58cc02] tracking-wider animate-bounce">APROBADA 00</p>
                <p className="text-[9px] text-emerald-400 font-bold leading-normal">
                  Transacción registrada de forma exitosa.
                </p>
              </div>
            )}

            {step === 'declined' && (
              <div className="text-center py-4 text-red-400 space-y-2">
                <div className="w-8 h-8 bg-red-950 rounded-full flex items-center justify-center mx-auto border-2 border-red-500">
                  <X size={16} className="text-red-400" />
                </div>
                <p className="text-xs font-extrabold uppercase tracking-wider">RECHAZADA {terminalSettings.mockResponseCode}</p>
                <p className="text-[9px] text-red-305 leading-normal font-sans">
                  El banco emisor declinó la venta. Intenta con otra forma de pago.
                </p>
              </div>
            )}

            {step === 'timeout' && (
              <div className="text-center py-4 text-amber-500 space-y-2">
                <HelpCircle size={24} className="mx-auto text-amber-500 animate-pulse" />
                <p className="text-xs font-extrabold uppercase tracking-wider">ERROR TIMEOUT TO</p>
                <p className="text-[9px] text-amber-400 leading-normal">
                  Falla de enlace físico con la terminal. Vuelve a intentar.
                </p>
              </div>
            )}

            {/* Bottom info */}
            <div className="border-t border-emerald-900/40 pt-1 flex justify-between items-center text-[8px] text-emerald-600 uppercase">
              <span>TermID: {terminalSettings.terminalId}</span>
              <span>USD: ${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Core Hardware PIN Keys */}
          <div className="bg-[#1e1e24] p-3 rounded-2xl border border-slate-800 grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num}
                type="button"
                disabled={step !== 'entering_pin' || pin.length >= 6}
                onClick={() => {
                  playSound('click');
                  setPin(p => p + num);
                }}
                className={`py-2 rounded-xl text-sm font-black transition-all ${
                  step === 'entering_pin'
                    ? 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white cursor-pointer hover:scale-105'
                    : 'bg-slate-850/30 text-gray-600 cursor-not-allowed'
                }`}
              >
                {num}
              </button>
            ))}
            
            <button 
              type="button"
              disabled={step !== 'entering_pin'}
              onClick={() => {
                playSound('click');
                setPin('');
                addLog(`[READER] Entrada de PIN borrada por usuario`);
              }}
              className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                step === 'entering_pin' ? 'bg-yellow-600 hover:bg-yellow-500 hover:scale-105 cursor-pointer text-yellow-950' : 'bg-slate-850/30 text-gray-600 cursor-not-allowed'
              }`}
            >
              Borrar
            </button>

            <button 
              type="button"
              disabled={step !== 'entering_pin'}
              onClick={() => {
                playSound('click');
                setPin(p => p + '0');
              }}
              className={`py-2 rounded-xl text-sm font-black transition-all ${
                step === 'entering_pin' ? 'bg-slate-800 hover:bg-slate-700 cursor-pointer text-white' : 'bg-slate-850/30 text-gray-600 cursor-not-allowed'
              }`}
            >
              0
            </button>

            <button 
              type="button"
              disabled={step !== 'entering_pin'}
              onClick={handlePinSubmit}
              className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                step === 'entering_pin' ? 'bg-[#58cc02] hover:bg-[#61e002] text-white hover:scale-105 cursor-pointer border-b-2 border-green-800' : 'bg-slate-850/30 text-gray-600 cursor-not-allowed'
              }`}
            >
              Confirmar
            </button>
          </div>

        </div>

        {/* Right column: Cashier Control panel */}
        <div className="p-6 bg-slate-50 flex flex-col justify-between h-full space-y-4">
          
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-1.5 leading-none">
                <span>⚡ Integración IoT</span>
              </h3>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-1 tracking-wider">
                Pasarela de Pago Segura e Interactiva
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-150 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Interactive Steps instructions for the Cashier */}
          <div className="bg-white border rounded-2xl p-4 space-y-3 shadow-sm text-left">
            
            {step === 'waiting_card' && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[#58cc02] font-black text-xs uppercase">
                  <span className="animate-pulse">🟢</span>
                  <span>Lectura de Tarjeta Física</span>
                </div>
                <p className="text-[10.5px] text-gray-600 leading-normal font-medium">
                  El cliente debe aproximar su tarjeta de crédito o débito a la zona inductiva NFC para la lectura iso-estándar de la pasarela. Selecciona un banco de prueba abajo para simular:
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTapCard('VISA')}
                    className="p-2 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:scale-103 transition-all"
                  >
                    <span className="text-[10px] font-black text-blue-700 tracking-widest">VISA</span>
                    <span className="text-[8px] text-blue-500 font-semibold uppercase mt-0.5 mt-1">Crédito</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTapCard('MASTERCARD')}
                    className="p-2 border border-orange-200 bg-orange-50/50 hover:bg-orange-100/50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:scale-103 transition-all"
                  >
                    <span className="text-[10px] font-black text-orange-700 tracking-wider">MC</span>
                    <span className="text-[8px] text-orange-500 font-semibold uppercase mt-0.5 mt-1">Débito</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTapCard('AMEX')}
                    className="p-2 border border-teal-200 bg-teal-50/50 hover:bg-teal-100/50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:scale-103 transition-all"
                  >
                    <span className="text-[10px] font-black text-teal-700 tracking-widest">AMEX</span>
                    <span className="text-[8px] text-teal-500 font-semibold uppercase mt-0.5 mt-1">Empresarial</span>
                  </button>
                </div>
              </div>
            )}

            {step === 'entering_pin' && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-amber-600 font-black text-xs uppercase">
                  <span>🔑</span>
                  <span>Captura de PIN del Cliente</span>
                </div>
                <p className="text-[10.5px] text-gray-600 leading-normal font-medium">
                  Por seguridad, el cliente debe ingresar su clave secreta (PIN de 4 dígitos) para firmar con su chip EMV. Haz clic en las teclas numéricas del controlador físico de la izquierda de forma interactiva y luego presiona <strong className="text-gray-800">Confirmar</strong>.
                </p>
                <p className="text-[9px] text-gray-400 bg-gray-50 border p-1.5 rounded italic">
                  PIN de simulación recomendado: <strong>1234</strong> o cualquier combinación de 4 dígitos.
                </p>
              </div>
            )}

            {step === 'signing' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-800 font-black text-xs uppercase flex items-center gap-1">
                    ✍️ FIRMA DIGITAL AUTORIZADA
                  </span>
                  <button 
                    type="button"
                    onClick={clearCanvas}
                    className="text-[9px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 border border-blue-200 rounded-md cursor-pointer"
                  >
                    Limpiar Lienzo
                  </button>
                </div>
                <p className="text-[10.5px] text-gray-600 leading-tight">
                  Dile al cliente que firme dentro del recuadro usando su mouse, lápiz táctil o pantalla:
                </p>

                {/* CANVAS SIGNATURE PAD */}
                <div className="border border-gray-250 rounded-xl overflow-hidden bg-white relative h-28 cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={112}
                    className="w-full h-full block"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasSigned && (
                    <div className="absolute inset-0 bg-slate-100/40 pointer-events-none flex items-center justify-center">
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider bg-white px-2 py-1 border rounded-lg shadow-sm">
                        Firmar Aquí Con El Cursor
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-1 select-none">
                  <button
                    type="button"
                    onClick={triggerHostAuth}
                    className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10.5px] uppercase font-black cursor-pointer border-b-2 border-slate-950"
                  >
                    Confirmar Firma y Procesar Cobro 🏦
                  </button>
                </div>
              </div>
            )}

            {(step === 'approved' || step === 'declined' || step === 'timeout' || step === 'processing') && (
              <div className="space-y-3 text-center py-2">
                <div className="flex items-center justify-center gap-1.5 text-gray-800 font-black text-xs uppercase border-b pb-2">
                  <Activity size={12} />
                  <span>Resultado del Enlace Fiscal Bancario</span>
                </div>
                
                {step === 'processing' && (
                  <p className="text-[10.5px] text-gray-600">Simulando el switch financiero interbancario de la red PROSA.</p>
                )}

                {step === 'approved' && (
                  <div className="space-y-4">
                    <p className="text-[10.5px] text-green-700 font-bold">
                      💳 ¡Cobro procesado con éxito! El emisor autorizó el cargo a la racha y se ha guardado el criptograma ARQC correspondiente.
                    </p>
                    <button
                      type="button"
                      onClick={handleFinishTransaction}
                      className="w-full py-3 bg-[#58cc02] text-white hover:bg-[#61e002] rounded-2xl text-xs uppercase font-black cursor-pointer border-b-4 border-green-800 active:translate-y-0.5 active:border-b-2"
                    >
                      Continuar a Facturación y Recibo ✓
                    </button>
                  </div>
                )}

                {step === 'declined' && (
                  <div className="space-y-3">
                    <p className="text-[10.5px] text-red-600 font-bold">
                      La terminal rechazó la tarjeta. Puedes reintentar con otra forma de pago, comprobar el estatus de racha del cliente o cambiar la configuración del emulador en la pestaña "Guardado".
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep('connecting')}
                      className="w-full py-2 bg-slate-800 text-teal-300 hover:bg-slate-700 rounded-xl text-[10.5px] uppercase font-black cursor-pointer"
                    >
                      Reintentar Carga Bluetooth
                    </button>
                  </div>
                )}

                {step === 'timeout' && (
                  <div className="space-y-3">
                    <p className="text-[10.5px] text-amber-700 font-bold">
                      Ocurrió un error de espera en la respuesta del Bus IoT local de periféricos. Verifica el puerto COM o IP de la terminal conectada.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep('connecting')}
                      className="w-full py-2 bg-slate-800 text-teal-350 hover:bg-slate-700 rounded-xl text-[10.5px] uppercase font-black cursor-pointer"
                    >
                      Reconectar Dispositivo IoT
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Real-time connection raw byte logger stream list */}
          <div className="space-y-1 text-left flex-1 flex flex-col justify-end">
            <label className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1">
              <span>📋</span> Monitor de Enlace de Terminal (Raw Byte Logger)
            </label>
            <div className="bg-[#1e1e24] text-emerald-400 font-mono text-[9px] rounded-xl p-3 border border-slate-200 overflow-y-auto max-h-[142px] min-h-[130px] space-y-1 text-left select-text scrollbar-thin">
              {logs.map((log, i) => (
                <div key={i} className="leading-tight break-all border-b border-white/5 pb-1">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-gray-500 italic">Desconectado. Esperando arranque de racha...</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
