const translations = {
  es: {
    common: {
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      search: 'Buscar',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Impuesto',
      discount: 'Descuento',
    },
    sales: {
      screenTitle: 'Caja Registradora',
      emptyCart: 'Carrito vacío',
      checkout: 'Cobrar Ticket',
      paymentCash: 'Efectivo',
      paymentCard: 'Tarjeta',
      paymentMixed: 'Mixto',
      paymentCredit: 'Crédito',
    },
    inventory: {
      title: 'Inventario',
      addProduct: 'Agregar Producto',
      stock: 'Stock',
      supplier: 'Proveedor',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      search: 'Search',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Tax',
      discount: 'Discount',
    },
    sales: {
      screenTitle: 'POS Terminal',
      emptyCart: 'Empty cart',
      checkout: 'Checkout',
      paymentCash: 'Cash',
      paymentCard: 'Card',
      paymentMixed: 'Mixed',
      paymentCredit: 'Credit',
    },
    inventory: {
      title: 'Inventory',
      addProduct: 'Add Product',
      stock: 'Stock',
      supplier: 'Supplier',
    },
  },
  pt: {
    common: {
      loading: 'Carregando...',
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      search: 'Pesquisar',
      total: 'Total',
      subtotal: 'Subtotal',
      tax: 'Imposto',
      discount: 'Desconto',
    },
    sales: {
      screenTitle: 'PDV',
      emptyCart: 'Carrinho vazio',
      checkout: 'Finalizar Venda',
      paymentCash: 'Dinheiro',
      paymentCard: 'Cartão',
      paymentMixed: 'Misto',
      paymentCredit: 'Crédito',
    },
    inventory: {
      title: 'Inventário',
      addProduct: 'Adicionar Produto',
      stock: 'Estoque',
      supplier: 'Fornecedor',
    },
  },
};

export type SupportedLocale = keyof typeof translations;

let currentLocale: SupportedLocale = 'es';

export function setLocale(locale: SupportedLocale) {
  currentLocale = locale;
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

export function t(path: string, locale?: SupportedLocale): string {
  const lang = locale || currentLocale;
  const keys = path.split('.');
  let result: any = translations[lang];
  for (const key of keys) {
    if (result == null) return path;
    result = result[key];
  }
  return result ?? path;
}
