/**
 * EventBus.ts — El Sistema Nervioso Central de DuoPOS v2
 *
 * Implementa el patrón publicador/suscriptor (Pub/Sub) fuertemente tipado
 * con soporte para metadata de eventos, pipeline de middleware, y registro
 * centralizado de eventos. Permite desacoplar por completo los módulos
 * autónomos (features) comunicándose exclusivamente a través de eventos.
 */

import { EVENT_REGISTRY, type EventRegistration } from './EventRegistry';

// ─── Tipos Públicos ────────────────────────────────────────────────

export type EventCallback<T = any> = (data: T) => void | Promise<void>;

export interface EventMetadata {
  eventId: string;
  correlationId: string;
  causationId: string | null;
  timestamp: string;
  sourceModule: string;
  eventName: string;
  version: number;
}

export interface Envelope<T = any> {
  metadata: EventMetadata;
  payload: T;
}

export interface PublishOptions {
  correlationId?: string;
  causationId?: string;
  sourceModule?: string;
}

/** Firma que debe cumplir toda función de middleware. */
export type MiddlewareFn = (
  envelope: Envelope,
  next: () => Promise<void>,
) => Promise<void>;

// ─── EventBus ──────────────────────────────────────────────────────

class EventBus {
  private listeners: Record<string, EventCallback[]> = {};
  private middlewareChain: MiddlewareFn[] = [];
  private counter = 0;

  // ─── API Pública ───────────────────────────────────────────

  /**
   * Registra un middleware en el pipeline.
   * Los middlewares se ejecutan en orden de registro antes de
   * notificar a los suscriptores del evento.
   */
  use(mw: MiddlewareFn): void {
    this.middlewareChain.push(mw);
  }

  /**
   * Limpia todos los middlewares registrados.
   * Útil para tests o reconfiguración.
   */
  clearMiddleware(): void {
    this.middlewareChain = [];
  }

  /**
   * Se suscribe a un evento específico.
   * Retorna una función para desuscribirse limpiamente.
   */
  subscribe<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }

  /**
   * Publica un evento de forma no bloqueante y asíncrona.
   * Los middlewares se ejecutan antes de notificar a los listeners.
   * Compatible hacia atrás: si no se pasan opciones, se genera metadata automática.
   */
  publish<T = any>(event: string, data: T, options?: PublishOptions): void {
    const envelope = this.buildEnvelope(event, data, options);

    setTimeout(async () => {
      try {
        await this.runPipeline(envelope);
      } catch (err) {
        console.error(`[EventBus] Fatal en pipeline de "${event}":`, err);
      }
    }, 0);
  }

  /**
   * Retorna la cantidad de middlewares registrados.
   */
  getMiddlewareCount(): number {
    return this.middlewareChain.length;
  }

  /**
   * Retorna si hay listeners registrados para un evento dado.
   */
  hasListeners(event: string): boolean {
    return (this.listeners[event]?.length ?? 0) > 0;
  }

  /**
   * Retorna el registro completo de un evento del catálogo central,
   * o undefined si el evento no está registrado.
   */
  getEventRegistration(event: string): EventRegistration | undefined {
    return EVENT_REGISTRY[event];
  }

  /**
   * Retorna todos los eventos registrados en el catálogo central.
   */
  getAllRegisteredEvents(): EventRegistration[] {
    return Object.values(EVENT_REGISTRY);
  }

  // ─── Privado ──────────────────────────────────────────────

  private buildEnvelope<T>(event: string, data: T, options?: PublishOptions): Envelope<T> {
    const eventId = this.generateId();
    const sourceModule = options?.sourceModule ?? event.split(':')[0] ?? 'unknown';

    const metadata: EventMetadata = {
      eventId,
      correlationId: options?.correlationId ?? eventId,
      causationId: options?.causationId ?? null,
      timestamp: new Date().toISOString(),
      sourceModule,
      eventName: event,
      version: EVENT_REGISTRY[event]?.version ?? 1,
    };

    return { metadata, payload: data };
  }

  private async runPipeline(envelope: Envelope): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middlewareChain.length) {
        await this.middlewareChain[index++](envelope, next);
      } else {
        this.dispatch(envelope);
      }
    };

    await next();
  }

  private dispatch(envelope: Envelope): void {
    const { eventName } = envelope.metadata;
    const eventListeners = this.listeners[eventName] || [];

    if (eventListeners.length === 0) return;

    eventListeners.forEach((callback) => {
      setTimeout(async () => {
        try {
          await callback(envelope.payload);
        } catch (err) {
          console.error(`[EventBus] Error en listener de "${eventName}":`, err);
        }
      }, 0);
    });
  }

  private generateId(): string {
    this.counter = (this.counter + 1) % 0xffff;
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 6);
    const seq = this.counter.toString(36).padStart(3, '0');
    return `${ts}-${rand}-${seq}`;
  }
}

// Exporta el singleton global del Bus de Eventos
export const globalEventBus = new EventBus();
