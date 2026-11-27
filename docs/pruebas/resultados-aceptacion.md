# Resultados de las pruebas de aceptación

Ejecutadas con Playwright sobre la aplicación. 31 de 31 casos cumplen.

| ID | HU | Resultado | Observación |
|---|---|---|---|
| PA-01 | HU-001 | Cumple | campos vacíos marcados (aria-invalid=true); con credenciales válidas ingresa al Resumen de la flota |
| PA-02 | HU-017 | Cumple | Panel con KPI (disponibilidad, alertas, taller, falla prevista), donut de estado y tendencia de 7 días |
| PA-03 | HU-004 | Cumple | Leyenda con 4 estados de semáforo: Normal/Alerta/Crítico/En taller |
| PA-04 | HU-003 | Cumple | Banner automático: EX-02 92 °C sobre el límite de 90 °C |
| PA-05 | HU-019 | Cumple | Indicador «En vivo» con hora de última actualización |
| PA-06 | HU-005 | Cumple | Ficha EX-02 muestra temperatura, vibración, RPM y probabilidad en tiempo real |
| PA-07 | HU-006 | Cumple | Curva de temperatura de las últimas 12 h con línea de límite |
| PA-08 | HU-008 | Cumple | Alertas clasificadas en Crítica / Alta / Media o baja con filtro por severidad |
| PA-09 | HU-009 | Cumple | Seguimiento Nueva→Revisada→Asignada→Solucionada; el botón «Pasar a Revisada» avanza la etapa |
| PA-10 | HU-021 | Cumple | Probabilidad de falla 85 % calculada por equipo con ventana ideal y recomendación |
| PA-11 | HU-038 | Cumple | Selector de equipo cambia el análisis a CF-05 (orden por riesgo) |
| PA-12 | HU-026 | Cumple | Gráfico de proyección de degradación a 4 días con umbral de 40 % |
| PA-13 | HU-042 | Cumple | Comparación costo de parar hoy vs. si se rompe y ahorro estimado |
| PA-14 | HU-032 | Cumple | 2 componentes seleccionables y botón «Generar orden» crea la orden de trabajo |
| PA-15 | HU-028 | Cumple | Diálogo «Autorizar parada» con un clic en «Confirmar parada» (40 min vs. 4 días) |
| PA-16 | HU-029 | Cumple | Kanban con 4 estados: Reportada, Asignada, En mantenimiento, Lista |
| PA-17 | HU-029 | Cumple | Al pulsar «Avanzar» se pide confirmación de acción irreversible antes de mover la orden |
| PA-18 | HU-041 | Cumple | Cada orden muestra el plazo consumido «Plazo N h de 24 h» con color por riesgo |
| PA-19 | HU-037 | Cumple | Vista compartida de operaciones: producción, salud y mantenimientos |
| PA-20 | HU-044 | Cumple | Prórroga exige horas (1–4) y justificación ≥ 20 caracteres; con datos válidos se registra |
| PA-21 | HU-020 | Cumple | Programación de preventivos con calendario de próximos mantenimientos |
| PA-22 | HU-033 | Cumple | Selección masiva aprueba 4 de 4 preventivos en un paso |
| PA-23 | HU-022 | Cumple | Historial unificado con filtros (tipo, periodo, equipo, búsqueda) y paginación |
| PA-24 | HU-047 | Cumple | Descarga historial.csv |
| PA-25 | HU-024 | Cumple | KPI MTBF 145 h vs. meta 100 h |
| PA-26 | HU-025 | Cumple | KPI MTTR 4.5 h con tendencia mensual |
| PA-27 | HU-023 | Cumple | Distribución de fallas por sistema (Pareto) como mapa de concentración de fallas |
| PA-28 | HU-035 | Cumple | 3 reportes descargables; ej. flota.csv |
| PA-29 | HU-036 | Cumple | Configuración de umbrales por equipo con validación de rangos |
| PA-30 | HU-034 | Cumple | Órdenes sincronizadas con el ERP (simulado) y reintento de pendientes |
| PA-31 | HU-027 | Cumple | Preferencias de notificación de alertas en el perfil |
