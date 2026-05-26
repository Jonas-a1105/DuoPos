import Dexie, { type Table } from 'dexie';

class DuoPosDatabase extends Dexie {
  // Almacén genérico clave-valor de alta capacidad para colecciones completas
  generic_store!: Table<{ key: string; value: any }>;

  constructor() {
    super('DuoPosDatabase');
    this.version(1).stores({
      generic_store: 'key' // Clave primaria
    });
  }
}

export const db = new DuoPosDatabase();
