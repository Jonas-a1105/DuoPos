import { getLocalData, setLocalData } from './supabaseSync';
import { useUserStore } from '../stores/useUserStore';

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  role: string;
  module: 'catalogo' | 'clientes' | 'roles' | 'tasas' | 'ajustes';
  action: 'crear' | 'modificar' | 'eliminar' | 'escalar' | 'ajuste';
  details: string;
}

/**
 * Adds an administrative log event to IndexedDB
 */
export async function addAuditLog(
  module: AuditLog['module'],
  action: AuditLog['action'],
  details: string
): Promise<void> {
  try {
    const currentLogs: AuditLog[] = (await getLocalData('duo_pos_audit_logs')) || [];
    
    // Read the current active user from Zustand
    const userState = useUserStore.getState();
    const username = userState.user?.username || 'Cajero';
    const role = userState.user?.role || 'cajero';

    const newLog: AuditLog = {
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      username,
      role,
      module,
      action,
      details,
    };

    // Put new logs at the beginning (newest first)
    const updated = [newLog, ...currentLogs];
    
    // Save to local IndexedDB and localStorage cache
    await setLocalData('duo_pos_audit_logs', updated);
  } catch (err) {
    console.error('⚠️ Error guardando log de auditoría:', err);
  }
}

/**
 * Retrieves audit logs from local IndexedDB
 */
export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const logs = await getLocalData('duo_pos_audit_logs');
    return Array.isArray(logs) ? logs : [];
  } catch {
    return [];
  }
}
