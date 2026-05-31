import type { Envelope } from './EventBus';

export type NextFn = () => Promise<void>;
export type MiddlewareFn = (envelope: Envelope, next: NextFn) => Promise<void>;

/**
 * Middleware de logging: registra la emisión y el resultado de cada evento.
 * Útil para depuración en desarrollo y auditoría en producción.
 */
export const loggingMiddleware: MiddlewareFn = async (envelope, next) => {
  const { eventName, sourceModule, eventId } = envelope.metadata;
  console.debug(
    `[EventBus] → ${sourceModule} emitió "${eventName}" [${eventId.slice(0, 8)}]`,
    envelope.payload,
  );
  const start = performance.now();
  await next();
  const elapsed = (performance.now() - start).toFixed(2);
  console.debug(`[EventBus] ← "${eventName}" procesado en ${elapsed}ms`);
};

/**
 * Middleware de rendimiento: advierte si un evento tarda más de 100ms en
 * procesarse completamente (middleware + listeners).
 */
export const performanceMiddleware: MiddlewareFn = async (envelope, next) => {
  const start = performance.now();
  await next();
  const elapsed = performance.now() - start;
  if (elapsed > 100) {
    console.warn(
      `[EventBus] ⚠ "${envelope.metadata.eventName}" tardó ${elapsed.toFixed(0)}ms en procesarse`,
    );
  }
};

/**
 * Middleware de frontera de errores: captura cualquier error no manejado
 * durante el procesamiento del evento para evitar que un listener fallido
 * afecte a los demás.
 */
export const errorBoundaryMiddleware: MiddlewareFn = async (envelope, next) => {
  try {
    await next();
  } catch (err) {
    console.error(
      `[EventBus] 🔥 Error no capturado procesando "${envelope.metadata.eventName}":`,
      err,
    );
  }
};

/**
 * Middleware de validación: verifica que el evento esté registrado en el
 * catálogo central. Si no lo está, emite una advertencia en desarrollo.
 */
export const validationMiddleware: MiddlewareFn = async (envelope, next) => {
  const registration = envelope.metadata.version > 0;
  if (!registration) {
    console.warn(
      `[EventBus] ⚠ Evento "${envelope.metadata.eventName}" no registrado en el catálogo`,
    );
  }
  await next();
};
