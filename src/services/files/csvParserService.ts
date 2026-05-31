import * as XLSX from 'xlsx';
import { Product, Customer, LeagueType } from '../../types';
import { playSound } from '../audio/soundService';

export interface ImportResult<T> {
  success: boolean;
  imported: T[];
  failedCount: number;
  errors: string[];
}

/**
 * Normalizes keys of an object to lowercase and removes spaces or accents
 */
function normalizeKeys(obj: any): any {
  const normalized: any = {};
  for (const key of Object.keys(obj)) {
    const normKey = key
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/\s+/g, '') // remove spaces
      .replace(/[^a-zA-Z0-9]/g, ''); // remove special characters
    normalized[normKey] = obj[key];
  }
  return normalized;
}

/**
 * Parses an Excel or CSV file for Products import
 */
export async function parseProductsExcel(file: File): Promise<ImportResult<Product>> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse rows as raw objects
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);
        
        const imported: Product[] = [];
        const errors: string[] = [];
        let failedCount = 0;

        rawRows.forEach((row, index) => {
          const norm = normalizeKeys(row);
          const rowNum = index + 2; // spreadsheet rows are 1-indexed, headers are row 1

          // Required fields validation
          const name = norm.nombre || norm.name || norm.articulo || norm.producto;
          const priceStr = norm.precio || norm.price || norm.preciodeventa || norm.venta;
          const costStr = norm.costo || norm.cost || norm.preciodecosto || norm.compra;

          if (!name) {
            failedCount++;
            errors.push(`Fila ${rowNum}: Falta la columna 'Nombre' o 'Producto'.`);
            return;
          }

          const price = parseFloat(priceStr);
          if (isNaN(price) || price < 0) {
            failedCount++;
            errors.push(`Fila ${rowNum}: El precio del producto '${name}' es inválido.`);
            return;
          }

          const cost = parseFloat(costStr);
          if (isNaN(cost) || cost < 0) {
            failedCount++;
            errors.push(`Fila ${rowNum}: El costo del producto '${name}' es inválido.`);
            return;
          }

          // Optional fields mapping
          const stock = parseInt(norm.stock || norm.cantidad || norm.existencias || norm.inventario) || 0;
          const category = String(norm.categoria || norm.category || norm.rubro || 'General').trim();
          const emoji = String(norm.emoji || norm.icono || '📦').trim();
          const description = String(norm.descripcion || norm.description || norm.detalles || '').trim();
          const barcode = String(norm.codigo || norm.codigodebarras || norm.barcode || norm.ean || '').trim();
          const minStock = parseInt(norm.stockminimo || norm.minstock || norm.alertastock) || 5;

          const product: Product = {
            id: `prod-${Math.random().toString(36).substring(2, 9)}`,
            name: String(name).trim(),
            price,
            cost,
            stock: Math.max(0, stock),
            category,
            emoji: emoji.length > 3 ? '📦' : emoji,
            description,
            barcode,
            minStock: Math.max(1, minStock),
            branchesStock: {
              'branch-central': Math.max(0, stock) // Injects into CEDIS / Central stock
            }
          };

          imported.push(product);
        });

        resolve({
          success: true,
          imported,
          failedCount,
          errors
        });
      } catch (err) {
        resolve({
          success: false,
          imported: [],
          failedCount: 0,
          errors: ['Error al leer el archivo de Excel: ' + String(err)]
        });
      }
    };
    reader.onerror = () => {
      resolve({
        success: false,
        imported: [],
        failedCount: 0,
        errors: ['Fallo de lectura del archivo.']
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parses an Excel or CSV file for Customers import
 */
export async function parseCustomersExcel(file: File): Promise<ImportResult<Customer>> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse rows
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);
        
        const imported: Customer[] = [];
        const errors: string[] = [];
        let failedCount = 0;

        rawRows.forEach((row, index) => {
          const norm = normalizeKeys(row);
          const rowNum = index + 2;

          const name = norm.nombre || norm.name || norm.cliente || norm.razonsocial;

          if (!name) {
            failedCount++;
            errors.push(`Fila ${rowNum}: Falta la columna 'Nombre' o 'Cliente'.`);
            return;
          }

          // Optional fields mapping
          const phone = String(norm.telefono || norm.phone || norm.celular || 'S/N').trim();
          const email = String(norm.correo || norm.email || norm.emailaddress || 'sin_correo@email.com').trim();
          const gems = parseInt(norm.gemas || norm.puntos || norm.coins) || 0;
          const purchasesCount = parseInt(norm.compras || norm.purchases || norm.visitas) || 0;
          const totalSpent = parseFloat(norm.gastototal || norm.totalspent || norm.comprastotales) || 0;
          
          // Fiscal attributes mapping
          const fiscalName = norm.nombrefiscal || norm.fiscalname || name;
          const taxId = String(norm.rfc || norm.rut || norm.rif || norm.taxid || norm.identificacion || '').trim();
          const regime = String(norm.regimen || norm.regimenfiscal || norm.regime || '').trim();
          const postalCode = String(norm.codigopostal || norm.zipcode || norm.cp || '').trim();
          
          // Credit attributes mapping
          const creditLimit = parseFloat(norm.limiterecredito || norm.creditlimit || norm.fiado) || 0;
          
          const customer: Customer = {
            id: `cust-${Math.random().toString(36).substring(2, 9)}`,
            name: String(name).trim(),
            phone,
            email,
            gems: Math.max(0, gems),
            purchasesCount: Math.max(0, purchasesCount),
            totalSpent: Math.max(0, totalSpent),
            registeredAt: new Date().toISOString(),
            league: 'Bronce' as LeagueType,
            fiscalName: String(fiscalName).trim(),
            taxId,
            regime,
            postalCode,
            creditLimit: Math.max(0, creditLimit),
            creditUsed: 0,
            creditHistory: []
          };

          imported.push(customer);
        });

        resolve({
          success: true,
          imported,
          failedCount,
          errors
        });
      } catch (err) {
        resolve({
          success: false,
          imported: [],
          failedCount: 0,
          errors: ['Error al leer el archivo de Excel: ' + String(err)]
        });
      }
    };
    reader.onerror = () => {
      resolve({
        success: false,
        imported: [],
        failedCount: 0,
        errors: ['Fallo de lectura del archivo.']
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Triggers a browser download of a template .xlsx file for Products
 */
export function downloadProductsTemplate() {
  const headers = ['Nombre', 'Precio', 'Costo', 'Stock', 'Categoria', 'Emoji', 'Descripcion', 'Codigo', 'Stock Minimo'];
  const data = [
    ['Harina PAN', 1.20, 0.90, 50, 'Víveres', '🌾', 'Harina de maíz blanco precocida', '7591005000016', 5],
    ['Coca Cola 1L', 1.80, 1.30, 24, 'Bebidas', '🥤', 'Refresco de cola botella de vidrio', '7501055300075', 6],
    ['Pan de Sándwich', 2.00, 1.55, 12, 'Panadería', '🍞', 'Pan blanco artesanal fresco', '', 4]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  
  XLSX.writeFile(wb, 'duopos_plantilla_productos.xlsx');
  playSound('success');
}

/**
 * Triggers a browser download of a template .xlsx file for Customers
 */
export function downloadCustomersTemplate() {
  const headers = ['Nombre', 'Telefono', 'Email', 'Gemas', 'Nombre Fiscal', 'Tax ID', 'Regimen', 'Codigo Postal', 'Limite Credito'];
  const data = [
    ['Carlos Pérez', '0414-1234567', 'carlos@email.com', 150, 'Carlos Pérez C.A.', 'V-12345678-9', '601', '1010', 50.00],
    ['Zari la Fashionista', '555-987654', 'zari@duo.com', 400, 'Zari Styles LLC', 'CS-9807-X', '605', '90210', 100.00]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  
  XLSX.writeFile(wb, 'duopos_plantilla_clientes.xlsx');
  playSound('success');
}
