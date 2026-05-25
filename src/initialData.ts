/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, LegalBillingSettings } from './types';

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Café de la Racha (Espresso)',
    price: 3.50,
    cost: 1.20,
    stock: 25,
    category: 'Bebidas',
    emoji: '☕',
    description: 'Conserva tu racha despierta y energética.',
    barcode: '7501000100018'
  },
  {
    id: 'prod-2',
    name: 'Poción de Vida Extra',
    price: 5.00,
    cost: 1.50,
    stock: 12,
    category: 'Consumibles',
    emoji: '🧪',
    description: 'Restaura un corazón perdido durante tus turnos de caja.',
    barcode: '7501000100025'
  },
  {
    id: 'prod-3',
    name: 'Donas Góticas de Lily',
    price: 2.75,
    cost: 0.80,
    stock: 8,
    category: 'Postres',
    emoji: '🍩',
    description: 'Glaseado oscuro, fría por dentro. Lily asegura que no tienen veneno.',
    barcode: '7501000100032'
  },
  {
    id: 'prod-4',
    name: 'Merchandising Peluche de Duo',
    price: 25.00,
    cost: 10.00,
    stock: 4,
    category: 'Merch',
    emoji: '🦉',
    description: 'Te recordará que hagas tus tareas de almacén diariamente. Con ojos que te siguen.',
    barcode: '7501000100049'
  },
  {
    id: 'prod-5',
    name: 'Manzana de la Sabiduría',
    price: 1.50,
    cost: 0.40,
    stock: 50,
    category: 'Bebidas',
    emoji: '🍎',
    description: 'Fruta fresca de los huertos directos de Duolingo.',
    barcode: '7501000100056'
  },
  {
    id: 'prod-6',
    name: 'Zumo Entusiasta de Zari',
    price: 4.00,
    cost: 1.50,
    stock: 20,
    category: 'Bebidas',
    emoji: '🥤',
    description: 'Mezcla ultra vibrante de frutas tropicales con 300% de cafeína.',
    barcode: '7501000100063'
  },
  {
    id: 'prod-7',
    name: 'Barra Energética de Eddy',
    price: 3.00,
    cost: 1.00,
    stock: 15,
    category: 'Consumibles',
    emoji: '🍫',
    description: 'Proteína pura para aguantar cinco horas seguidas cobrando sin pestañear.',
    barcode: '7501000100070'
  },
  {
    id: 'prod-8',
    name: 'Gorra Oficial de Duolingo',
    price: 15.00,
    cost: 6.00,
    stock: 6,
    category: 'Merch',
    emoji: '🧢',
    description: 'Lúcela en tu tienda para un bonus del 15% de respeto vecinal.',
    barcode: '7501000100087'
  }
];

export const CATEGORIES = ['Todos', 'Bebidas', 'Postres', 'Consumibles', 'Merch'];

export interface Character {
  id: string;
  name: string;
  avatar: string; // Emoji representing the layout character
  color: string;  // Primary Hex color matching their theme
  bgColor: string; // Bg color class for UI
  borderColor: string; // Border color class for 3D buttons
  textColor: string;
  intro: string;
  loginQuote: string;
  saleQuote: string;
  failQuote: string;
  idleQuote: string;
}

export const DUO_CHARACTERS: Record<string, Character> = {
  duo: {
    id: 'duo',
    name: 'Duo',
    avatar: '🦉',
    color: '#58cc02',
    bgColor: 'bg-[#58cc02]',
    borderColor: 'border-[#46a302]',
    textColor: 'text-[#58cc02]',
    intro: 'El búho guardián y director del negocio. ¡Que nadie pierda la racha de ventas!',
    loginQuote: '¡Hola! Ya es hora de abrir caja. Recuerda: ¡Cinco ventas hoy o perderás tu racha familiar! 👀',
    saleQuote: '¡Fantástica venta! Has ganado XP. Estoy muy orgulloso... por ahora.',
    failQuote: '¿Cerraste el carrito sin vender? Recuerda que sé dónde vives... jeje.',
    idleQuote: 'Haz tu racha diaria de contabilidad. ¡Es solo 5 minutos al día!'
  },
  lily: {
    id: 'lily',
    name: 'Lily',
    avatar: '💁‍♀️', // goth female emoji alternative or look
    color: '#a435f0',
    bgColor: 'bg-[#a435f0]',
    borderColor: 'border-[#7b1fa2]',
    textColor: 'text-[#a435f0]',
    intro: 'La cajera gótica. No le pagan lo suficiente por sonreír, pero hace excelente cuadre de caja.',
    loginQuote: 'Buenas... Supongo que tenemos que vender cosas a humanos hoy. Qué remedio.',
    saleQuote: 'Alguien pagó dinero real por esto. Interesante... supongo.',
    failQuote: 'Qué mal. Menos mal que no tengo sentimientos para decepcionarme.',
    idleQuote: 'Si me quedo quieta en la esquina, los clientes quizás no me vean.'
  },
  zari: {
    id: 'zari',
    name: 'Zari',
    avatar: '🧕',
    color: '#ff4b4b',
    bgColor: 'bg-[#ff4b4b]',
    borderColor: 'border-[#ea2b2b]',
    textColor: 'text-[#ff4b4b]',
    intro: 'La optimista estrella. El servicio de atención al cliente es su mayor súper pasión.',
    loginQuote: '¡HOLA! ¡QUÉ EMOCIÓN! ¡Hoy vamos a superar todos los récords de ventas globales! 🎉',
    saleQuote: '¡OMG! ¡Increíble! ¡Eres una máquina de facturar! ¡Choca esos cinco! 💥',
    failQuote: '¡Oh no! No te preocupes, ¡la próxima venta será de un millón de dólares! ¡Sí se puede!',
    idleQuote: '¿Deberíamos sugerirles que agreguen una dona? ¡Las donas son geniales! 😍'
  },
  eddy: {
    id: 'eddy',
    name: 'Eddy',
    avatar: '🏃‍♂️',
    color: '#ff9600',
    bgColor: 'bg-[#ff9600]',
    borderColor: 'border-[#e07b00]',
    textColor: 'text-[#ff9600]',
    intro: 'El gerente deportivo. Para él, atender el POS es equivalente a una maratón de cardio extremo.',
    loginQuote: '¡¡A calentar esos dedos!! Hoy nos toca levantar pesas de dinero. ¡Vamos equipo! 💪',
    saleQuote: '¡Qué ritmo! ¡Estás quemando calorías financieras a otro nivel! ¡Upa!',
    failQuote: 'Un tropiezo no es nada, sacúdete el polvo y haz diez lagartijas comerciales.',
    idleQuote: '¿Sabías que mover cajas de refrescos trabaja increíble los hombros?'
  },
  junior: {
    id: 'junior',
    name: 'Junior',
    avatar: '👦',
    color: '#1cb0f6',
    bgColor: 'bg-[#1cb0f6]',
    borderColor: 'border-[#1899d6]',
    textColor: 'text-[#1cb0f6]',
    intro: 'El aprendiz curioso. Le encanta jugar con el escáner de barras y preguntar cosas.',
    loginQuote: '¡Hola! ¿Me dejas presionar el botón de cobrar? ¡Prometo no romper nada!',
    saleQuote: '¡Wooow! ¿Eso vale todo ese dinero? ¡Eres rico! ¿Me compras un peluche?',
    failQuote: '¡Oops! ¿El cliente se arrepintió? ¿Puedo jugar con la caja registradora ahora?',
    idleQuote: 'Papá dice que si vendo diez manzanas podré tener mi propia sucursal.'
  }
};

export const DEFAULT_CUSTOMERS = [
  {
    id: 'cust-1',
    name: 'Oscar el Pintor',
    phone: '555-0192',
    email: 'oscar.paints@duomail.com',
    gems: 150,
    purchasesCount: 16,
    totalSpent: 125.50,
    registeredAt: '2026-01-10T14:30:00Z',
    league: 'Bronce' as const,
    creditLimit: 300.00,
    creditUsed: 54.50,
    creditHistory: [
      { id: 'chhist-1', amount: 80.00, type: 'charge' as const, date: '2026-05-15T12:00:00Z', notes: 'Compra de Material Artístico en mostrador' },
      { id: 'chhist-2', amount: 30.00, type: 'pay' as const, date: '2026-05-20T15:30:00Z', notes: 'Abono en efectivo realizado por Oscar' },
      { id: 'chhist-3', amount: 4.50, type: 'charge' as const, date: '2026-05-22T08:15:00Z', notes: 'Café matutino' }
    ]
  },
  {
    id: 'cust-2',
    name: 'Zari la Fashionista',
    phone: '555-0877',
    email: 'zari.style@duomail.com',
    gems: 320,
    purchasesCount: 22,
    totalSpent: 420.00,
    registeredAt: '2026-02-14T10:15:00Z',
    league: 'Oro' as const,
    creditLimit: 800.00,
    creditUsed: 0.00,
    creditHistory: []
  },
  {
    id: 'cust-3',
    name: 'Vikram el Panadero',
    phone: '555-0144',
    email: 'vikram.bakes@duomail.com',
    gems: 640,
    purchasesCount: 35,
    totalSpent: 850.25,
    registeredAt: '2026-02-28T09:00:00Z',
    league: 'Zafiro' as const,
    creditLimit: 1500.00,
    creditUsed: 420.00,
    creditHistory: [
      { id: 'chhist-4', amount: 500.00, type: 'charge' as const, date: '2026-05-10T10:00:00Z', notes: 'Pedido mayor de harina de centeno' },
      { id: 'chhist-5', amount: 80.00, type: 'pay' as const, date: '2026-05-18T11:45:00Z', notes: 'Abono transferencia directa' }
    ]
  },
  {
    id: 'cust-4',
    name: 'Lucy la Espía Jubilada',
    phone: '555-0007',
    email: 'lucy.classified@duomail.com',
    gems: 1200,
    purchasesCount: 88,
    totalSpent: 5200.00,
    registeredAt: '2026-03-01T17:45:00Z',
    league: 'Obsidiana' as const,
    creditLimit: 5000.00,
    creditUsed: 0.00,
    creditHistory: []
  },
  {
    id: 'cust-5',
    name: 'Falstaff el Oso Sarcástico',
    phone: '555-0999',
    email: 'falstaff.bear@duomail.com',
    gems: 45,
    purchasesCount: 3,
    totalSpent: 45.00,
    registeredAt: '2026-04-12T12:00:00Z',
    league: 'Bronce' as const,
    creditLimit: 250.00,
    creditUsed: 195.00,
    creditHistory: [
      { id: 'chhist-6', amount: 195.00, type: 'charge' as const, date: '2026-05-24T18:30:00Z', notes: 'Compra de Peluches Duo y gorras para sus sobrinos' }
    ]
  }
];

export const DEFAULT_BILLING_SETTINGS: LegalBillingSettings = {
  taxName: 'IVA',
  generalTaxRate: 16,
  categoryOverrides: [
    { category: 'Alimentos', rate: 0 },
    { category: 'Bebidas', rate: 16 },
    { category: 'Mercancía', rate: 16 },
    { category: 'Cafetería', rate: 16 },
    { category: 'Accesorios', rate: 16 },
    { category: 'Electrónicos', rate: 16 },
    { category: 'Servicios', rate: 16 }
  ],
  taxIncludedInPrice: true,
  companyName: 'Duo Academia S.A. de C.V.',
  companyTaxId: 'DAC120525D10',
  companyRegime: '601 - Regimen General de Ley Personas Morales',
  companyPostalCode: '06700',
  companyAddress: 'Nido Verde #12, Bosque de Duolingo, CDMX',
  invoicePrefix: 'FAC-DUO-',
  nextInvoiceNumber: 1530,
  automaticMockInvoicing: false,
  certifyingAuthority: 'Servicio de Administración Ficticia SAT'
};
