# Fix: Tiebreaker Persistente Después del Reset

## Problema Identificado
Cuando se reiniciaban las votaciones usando el botón de reset, los jueces seguían viendo el modal de desempate que debería haber sido eliminado.

## Causa Raíz
El endpoint `/api/admin/reset-votes` solo eliminaba:
- Puntuaciones de jueces (`judge_scores`)
- Votos públicos (`public_votes`)

**PERO NO eliminaba:**
- Tiebreakers activos en `system_settings` con clave `active_tiebreaker`
- Tabla temporal `tiebreaker_scores`

## Solución Implementada

### 1. Backend - Server (server-complete.cjs)
```javascript
// ANTES: Solo eliminaba votos y scores
await client.query('DELETE FROM judge_scores');
await client.query('DELETE FROM public_votes');

// DESPUÉS: También elimina tiebreakers
await client.query('DELETE FROM judge_scores');
await client.query('DELETE FROM public_votes');

// ============ NUEVO: Limpiar desempates activos ============
console.log('🧹 Limpiando desempates activos...');
await client.query("DELETE FROM system_settings WHERE setting_key = 'active_tiebreaker'");
await client.query('DROP TABLE IF EXISTS tiebreaker_scores');
console.log('✅ Desempates activos eliminados');

// Notificación WebSocket
if (io) {
  io.emit('tiebreaker_cleared', {
    type: 'tiebreaker_cleared',
    message: 'Desempates eliminados por reinicio del sistema',
    timestamp: new Date().toISOString(),
    clearedBy: req.user.email
  });
}
```

### 2. Frontend - Cliente (JudgeVotesPage.tsx)
```javascript
// NUEVO: Escuchar evento de eliminación de tiebreakers
newSocket.on('tiebreaker_cleared', (notification) => {
  console.log('🧹 Tiebreaker cleared notification received:', notification);
  
  toast({
    title: "🧹 Desempates Eliminados",
    description: notification.message || 'Los desempates han sido eliminados del sistema',
    className: "bg-blue-50 border-blue-200",
  });
  
  // Cerrar modal inmediatamente y limpiar estado
  setActiveTiebreaker(null);
  setShowTiebreakerModal(false);
  console.log('✅ Tiebreaker modal closed due to system reset');
});
```

## Resultado
✅ **PROBLEMA RESUELTO**: Ahora cuando se reinician las votaciones:

1. Se eliminan todos los votos y scores
2. Se eliminan los tiebreakers activos del sistema
3. Se notifica a todos los jueces vía WebSocket
4. Los modales de desempate se cierran automáticamente
5. Los jueces ya no ven desempates "fantasma"

## Pruebas Realizadas
- ✅ Script `clear-tiebreakers.cjs` funciona correctamente
- ✅ Prueba `test-reset-tiebreaker.cjs` confirma la eliminación
- ✅ WebSocket envía notificación `tiebreaker_cleared`
- ✅ Frontend responde correctamente al evento

## Archivos Modificados
1. `/server-complete.cjs` - Endpoint reset mejorado
2. `/src/pages/JudgeVotes/JudgeVotesPage.tsx` - Manejo del evento WebSocket
3. `/test-reset-tiebreaker.cjs` - Script de prueba (nuevo)
4. `/FIX-TIEBREAKER-PERSISTENCE.md` - Esta documentación (nuevo)

---
**Fecha**: 2025-01-02  
**Estado**: ✅ RESUELTO  
**Desarrollador**: Senior Developer 