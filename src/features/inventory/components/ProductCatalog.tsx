import React, { useState, useMemo } from 'react';
import { Product, User, Supplier } from '../../../types';
import { CATEGORIES } from '../../../initialData';
import { playSound } from '../../../services/sounds';
import { exportProductsToExcel } from '../../../services/exportService';
import { Search, Download, Edit, Trash, Plus, X, Check } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  suppliers: Supplier[];
  onAddProduct: (prod: Omit<Product, 'id'>) => void;
  onUpdateProduct: (prod: Product) => void;
  onDeleteProduct: (id: string) => void;
  onGrantXp?: (xp: number) => void;
  currentUser: User;
  exchangeRate?: number;
  activeRateType?: 'oficial' | 'paralelo';
}

const QUICK_EMOJIS = [
  '☕',
  '🍵',
  '🥤',
  '🍩',
  '🍰',
  '🍪',
  '🍎',
  '🍇',
  '🍫',
  '🍬',
  '🧪',
  '🩹',
  '🦉',
  '🧢',
  '👕',
  '🧸',
  '🎒',
  '🎟️',
  '⚡',
  '📦',
];

export default function ProductCatalog({
  products,
  suppliers,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onGrantXp,
  currentUser,
  exchangeRate = 0,
  activeRateType = 'oficial',
}: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Core Product Forms States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [cost, setCost] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [category, setCategory] = useState('Consumibles');
  const [emoji, setEmoji] = useState('🍩');
  const [description, setDescription] = useState('');
  const [productSupplierId, setProductSupplierId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Core Math & Filters
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleOpenNewForm = () => {
    setEditingProduct(null);
    setName('');
    setPrice(3.0);
    setCost(1.0);
    setStock(10);
    setMinStock(5);
    setCategory('Consumibles');
    setEmoji('🍩');
    setDescription('');
    setProductSupplierId('');
    setErrorMsg('');
    setIsFormOpen(true);
    playSound('click');
  };

  const handleOpenEditForm = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price);
    setCost(prod.cost);
    setStock(prod.stock);
    setMinStock(prod.minStock !== undefined ? prod.minStock : 5);
    setCategory(prod.category);
    setEmoji(prod.emoji || '🍩');
    setDescription(prod.description || '');
    setProductSupplierId((prod as any).supplierId || '');
    setErrorMsg('');
    setIsFormOpen(true);
    playSound('click');
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('El producto requiere un nombre.');
      return;
    }
    if (price <= 0) {
      setErrorMsg('La tarifa debe ser mayor a 0.');
      return;
    }
    if (cost < 0) {
      setErrorMsg('El costo de fábrica no puede ser negativo.');
      return;
    }
    if (stock < 0) {
      setErrorMsg('El stock no puede ser menor a 0.');
      return;
    }

    setErrorMsg('');
    const details = {
      name: name.trim(),
      price: Number(price),
      cost: Number(cost),
      stock: Number(stock),
      minStock: Number(minStock),
      category,
      emoji,
      description: description.trim(),
      supplierId: productSupplierId || undefined,
    };

    if (editingProduct) {
      onUpdateProduct({ id: editingProduct.id, ...details } as any);
      playSound('success');
    } else {
      onAddProduct(details as any);
      if (onGrantXp) onGrantXp(15);
      playSound('levelup');
    }
    setIsFormOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (currentUser?.role !== 'admin') {
      alert(
        '🔒 Acceso Denegado: Solo el Administrador Corporativo puede dar de baja productos del catálogo principal.',
      );
      setDeleteConfirmId(null);
      return;
    }
    onDeleteProduct(id);
    setDeleteConfirmId(null);
    playSound('swoosh');
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Action Header Button trigger in Catalog */}
      <div className="flex justify-end gap-2 mb-2">
        <button
          id="btn-new-product"
          onClick={handleOpenNewForm}
          className="bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] font-black py-3 px-5 rounded-2xl transition-all duration-100 flex items-center gap-1.5 tracking-wide uppercase text-xs cursor-pointer select-none"
        >
          <Plus size={16} /> Registrar Producto
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-5 space-y-4">
        <div className="relative">
          <span className="absolute left-4 top-3 text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Filtrar por nombre, categoría o especificaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-55 border-2 border-[#e5e5e5] rounded-2xl font-bold text-gray-700 outline-none focus:border-[#58cc02] focus:bg-white transition-all text-xs md:text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {['Todos', ...CATEGORIES.filter((c) => c !== 'Todos')].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                playSound('click');
              }}
              className={`py-1.5 px-3 rounded-xl font-black text-[10px] md:text-xs tracking-wide transition-all border-b-2 uppercase cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-[#58cc02] border-[#58cc02] border'
                  : 'bg-white text-gray-400 border border-gray-205 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
          <div className="ml-auto">
            <button
              onClick={() => {
                playSound('click');
                exportProductsToExcel(filteredProducts);
              }}
              className="py-1.5 px-3 rounded-xl font-black text-[10px] md:text-xs uppercase cursor-pointer bg-[#58cc02] text-white border-b-2 border-[#46a302] hover:bg-[#61e002] active:translate-y-0.5 flex items-center gap-1"
            >
              <Download size={12} /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Grid display */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border-2 border-gray-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
          <span className="text-5xl block animate-bounce">📦</span>
          <h3 className="text-xl font-black text-gray-600">Catálogo Vacío</h3>
          <p className="text-gray-400 text-xs font-bold leading-relaxed">
            Ningún artículo coincide con tu búsqueda. Registra insumos con el botón superior para darles vida en el POS.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredProducts.map((prod) => {
            const limit = prod.minStock !== undefined ? prod.minStock : 5;
            const low = prod.stock <= limit;
            const supplierObj = suppliers.find((s) => s.id === (prod as any).supplierId);

            return (
              <div
                key={prod.id}
                className="bg-white border-2 border-gray-200 border-b-[6px] rounded-3xl p-4 flex flex-col justify-between space-y-3 relative hover:scale-[1.01] transition-transform text-left"
              >
                <div className="flex justify-between items-start">
                  <div className="bg-gray-50 border border-gray-100 w-11 h-11 rounded-2xl flex items-center justify-center text-2xl font-bold p-1 select-none flex-shrink-0">
                    {prod.emoji || '📦'}
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditForm(prod)}
                      className="p-1.5 border border-blue-200 text-blue-500 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Edit size={12} />
                    </button>

                    {deleteConfirmId === prod.id ? (
                      <div className="flex items-center gap-1 animate-fadeIn">
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded-lg font-black text-[10px]"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-gray-105 text-gray-550 rounded-lg text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(prod.id)}
                        className="p-1.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-0.5 text-left">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[9px] bg-slate-100 text-gray-500 border border-slate-200 rounded px-1.5 py-0.5 font-bold uppercase leading-none">
                      {prod.category}
                    </span>
                    {supplierObj && (
                      <span className="text-[9px] bg-indigo-55 border border-indigo-200 text-indigo-750 px-1.5 py-0.5 rounded leading-none font-bold truncate max-w-[80px]">
                        {supplierObj.name.replace(/🦉|🍩|🧪|👕/g, '').trim()}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-black text-gray-800 leading-tight pt-1">{prod.name}</h4>
                  <p className="text-[11px] text-gray-400 font-bold line-clamp-2 leading-tight">
                    {prod.description || 'Sin detalles.'}
                  </p>
                </div>

                {/* Stock Alert block */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <span>Stock:</span>
                    {prod.stock === 0 ? (
                      <span className="text-red-500 bg-red-50 px-1.5 py-0.5 border border-red-200 rounded font-black text-[9px]">
                        Agotado
                      </span>
                    ) : low ? (
                      <span className="text-orange-500 bg-orange-55 px-1.5 py-0.5 border border-orange-200 rounded font-black text-[9px]">
                        Bajo (&lt;{limit})
                      </span>
                    ) : (
                      <span className="text-[#58cc02] bg-green-50 px-1.5 py-0.5 border border-green-200 rounded text-[9px] font-black">
                        Suficiente
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${prod.stock === 0 ? 'bg-red-500' : low ? 'bg-orange-550' : 'bg-[#58cc02]'}`}
                      style={{ width: `${Math.min((prod.stock / 50) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 pt-0.5">
                    <span>Disponible: {prod.stock} un.</span>
                    {prod.barcode && <span className="text-[8px] text-gray-300">#{prod.barcode}</span>}
                  </div>
                </div>

                {/* Cost / Price layout */}
                <div className="pt-2 border-t border-gray-100 flex justify-between items-start text-xs">
                  <div>
                    <span className="text-[9px] text-gray-405 font-extrabold uppercase block leading-none">
                      P. Venta
                    </span>
                    <span className="text-sm font-black text-gray-700 block">${prod.price.toFixed(2)}</span>
                    {exchangeRate > 0 && (
                      <span className="text-[10px] font-bold text-sky-600 block mt-1 select-none leading-tight">
                        Bs. {(prod.price * exchangeRate).toFixed(2)}
                        <span className="text-[7.5px] uppercase font-black px-1 py-0.5 bg-sky-50 border border-sky-200 rounded ml-1 text-sky-600">
                          {activeRateType === 'paralelo' ? 'PAR' : 'BCV'}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-405 font-extrabold uppercase block leading-none">
                      Costo Fábrica
                    </span>
                    <span className="text-xs font-black text-gray-500 block">${prod.cost.toFixed(2)}</span>
                    {exchangeRate > 0 && (
                      <span className="text-[9px] font-bold text-gray-400 block mt-1 select-none leading-tight">
                        Bs. {(prod.cost * exchangeRate).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------- FORMS MODAL: CREATE / EDIT PRODUCT ----------------- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn text-gray-800">
          <div className="bg-white border-2 border-gray-205 border-b-8 rounded-3xl max-w-lg w-full p-6 space-y-4 relative text-left">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X size={20} />
            </button>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-gray-800">
                {editingProduct ? '📝 Modificar Producto' : '🧁 Nuevo Producto'}
              </h3>
              <p className="text-xs text-gray-400 font-bold">
                Configura el costo, margen y vinculación comercial con tus aliados.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-650 rounded-xl text-center font-bold text-xs">⚠️ {errorMsg}</div>
            )}

            <form onSubmit={handleSubmitProduct} className="space-y-3">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-black uppercase text-gray-400">Identificador Visual (Emoji):</label>
                <div className="flex items-center gap-3">
                  <span className="text-4xl bg-gray-100 border rounded-2xl w-14 h-14 flex items-center justify-center select-none">
                    {emoji}
                  </span>
                  <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
                    <div className="flex gap-1">
                      {QUICK_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setEmoji(em)}
                          className={`text-2xl p-1 rounded-lg border hover:scale-105 transition-transform ${emoji === em ? 'bg-green-105 border-green-500' : 'bg-white'}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2 space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Nombre del Insumo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Café de la Racha (Espresso)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Precio de Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Costo de Fábrica ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Existencias Disponibles</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Límite Alerta Stock Mínimo</label>
                  <input
                    type="number"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Categoría Oficial</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold text-gray-700 cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todos').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="font-extrabold uppercase text-gray-400">Socio Proveedor Enlazado</label>
                  <select
                    value={productSupplierId}
                    onChange={(e) => setProductSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border p-2 rounded-xl font-bold text-gray-700 cursor-pointer"
                  >
                    <option value="">-- Sin proveedor definido --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-black uppercase text-gray-400">Descripción Comercial</label>
                <textarea
                  rows={2}
                  placeholder="Detalles únicos de este insumo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border p-2 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-100 hover:bg-slate-205 py-2.5 font-bold rounded-xl border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#58cc02] text-white hover:bg-[#61e002] py-2.5 font-black rounded-xl border-b-4 border-green-700 flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Check size={14} /> {editingProduct ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
