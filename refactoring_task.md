# Refactorización de SalesScreen en DuoPOS

Este documento sirve como tracker de la Fase 4: Modularización de `SalesScreen.tsx`.

- [x] **Extracción de Subcomponentes**
  - [x] Crear `CashDrawer.tsx` (Gestión de turnos y arqueos)
  - [x] Crear `ProductBasket.tsx` (Canasta de compras, cupones y lealtad)
  - [x] Crear `HospitalityFloorPlan.tsx` (Mapa de mesas y comensales)
  - [x] Crear `RetailControlDeck.tsx` (Simulador de escáner de retail)
  - [x] Crear `ServiceControlDeck.tsx` (Ingreso de servicios al vuelo)
  - [x] Crear `TransactionSuccessSplash.tsx` (Overlay de éxito y ticket)
  - [x] Crear `BarcodeScannerModal.tsx` (Lector de webcam)
- [x] **Integración en SalesScreen.tsx**
  - [x] Reemplazar la lógica en `SalesScreen.tsx` importando los nuevos subcomponentes
  - [x] Verificar tipos y compilación estática
- [x] **Validación Estática**
  - [x] Ejecutar `npm run lint` o `tsc --noEmit`
