# Fix: Actualizaciones de Eventos en Tiempo Real

## Problema Identificado
Cuando los administradores activaban/desactivaban eventos desde el panel de administración, los cambios no se reflejaban en tiempo real en el frontend. Los usuarios tenían que recargar la página manualmente para ver los cambios.

## Causa Raíz
Los endpoints de actualización de eventos solo guardaban los cambios en la base de datos pero **NO enviaban notificaciones WebSocket** para informar a los clientes conectados sobre los cambios.

**Endpoints afectados:**
- `PUT /api/events/:id/status` - Actualización de estado
- `PUT /api/events/:id` - Actualización general
- `PUT /api/admin/events/:id` - Actualización por admin

## Solución Implementada

### 1. Backend - Notificaciones WebSocket (server-complete.cjs)

#### Endpoint: Update Event Status
```javascript
// ============ NUEVO: Notificación WebSocket en tiempo real ============
if (io) {
  const notification = {
    type: 'event_status_updated',
    data: {
      event: updatedEvent,
      status: status,
      updatedAt: new Date().toISOString(),
      message: `Estado del evento "${updatedEvent.name}" cambiado a: ${status}`
    }
  };
  
  // Enviar a todos los usuarios conectados
  io.emit('event_updated', notification);
  
  // También enviar notificación general
  io.emit('system_notification', {
    type: 'info',
    message: `📅 Evento "${updatedEvent.name}" ahora está: ${status}`,
    timestamp: new Date().toISOString()
  });
}
```

#### Endpoint: Update Event General
```javascript
// ============ NUEVO: Notificación WebSocket en tiempo real ============
if (io) {
  const notification = {
    type: 'event_updated',
    data: {
      event: updatedEvent,
      updatedBy: 'Sistema',
      updatedAt: new Date().toISOString(),
      message: `Evento "${updatedEvent.name}" ha sido actualizado`
    }
  };
  
  io.emit('event_updated', notification);
  
  // Notificación especial si se cambió el estado activo
  if (is_active !== undefined) {
    io.emit('system_notification', {
      type: is_active ? 'success' : 'warning',
      message: `📅 Evento "${updatedEvent.name}" ${is_active ? 'activado' : 'desactivado'}`,
      timestamp: new Date().toISOString()
    });
  }
}
```

#### Endpoint: Admin Update Event
```javascript
// ============ NUEVO: Notificación WebSocket en tiempo real ============
if (io) {
  const notification = {
    type: 'event_updated',
    data: {
      event: updatedEvent,
      updatedBy: req.user.full_name || req.user.email,
      updatedAt: new Date().toISOString(),
      message: `Evento "${updatedEvent.name}" actualizado por ${req.user.full_name || req.user.email}`
    }
  };
  
  io.emit('event_updated', notification);
  
  // Notificaciones específicas según los cambios
  if (status) {
    io.emit('system_notification', {
      type: status === 'active' ? 'success' : 'info',
      message: `📅 Estado del evento "${updatedEvent.name}": ${status}`,
      timestamp: new Date().toISOString()
    });
  }
  
  if (is_active !== undefined) {
    io.emit('system_notification', {
      type: is_active ? 'success' : 'warning',
      message: `📅 Evento "${updatedEvent.name}" ${is_active ? 'activado' : 'desactivado'} por administrador`,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 2. Frontend - Listeners WebSocket

#### Hook useEvents.ts
```javascript
// ============ NUEVO: WebSocket listener para actualizaciones de eventos ============
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const socket = io('http://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  // Escuchar actualizaciones de eventos
  socket.on('event_updated', (notification) => {
    const updatedEvent = notification.data.event;
    
    // Actualizar la query cache inmediatamente
    queryClient.setQueryData(['events'], (oldEvents: Event[] | undefined) => {
      if (!oldEvents) return oldEvents;
      
      return oldEvents.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      );
    });
    
    // También invalidar para refrescar desde el servidor
    queryClient.invalidateQueries({ queryKey: ['events'] });
    
    // Mostrar notificación
    toast.success(`Evento "${updatedEvent.name}" actualizado en tiempo real`);
  });

  return () => {
    socket.disconnect();
  };
}, [queryClient]);
```

#### Componente EventsAdmin.tsx
```javascript
// ============ NUEVO: WebSocket para actualizaciones en tiempo real ============
useEffect(() => {
  if (!token) return;

  const newSocket = io('http://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  // Escuchar actualizaciones de eventos
  newSocket.on('event_updated', (notification) => {
    const updatedEvent = notification.data.event;
    
    // Actualizar el estado local inmediatamente
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
    
    // Mostrar notificación
    if (notification.data.updatedBy !== 'Sistema') {
      toast({
        title: "Evento Actualizado",
        description: notification.data.message,
        className: "bg-blue-50 border-blue-200",
      });
    }
  });

  return () => {
    newSocket.disconnect();
  };
}, [token]);
```

#### Hook useJudgeVotes.ts
```javascript
// ============ NUEVO: WebSocket para actualizaciones de eventos ============
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token || !user) return;

  const socket = io('http://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  // Escuchar actualizaciones de eventos
  socket.on('event_updated', (notification) => {
    // Refrescar los eventos para que los jueces vean los cambios
    refetchEvents();
    
    const updatedEvent = notification.data.event;
    
    // Mostrar notificación específica para jueces
    if (updatedEvent.is_active) {
      toast.success(`✅ Evento "${updatedEvent.name}" está ahora ACTIVO`, {
        description: 'Ya puedes calificar en este evento',
      });
    } else {
      toast.info(`⏸️ Evento "${updatedEvent.name}" está ahora INACTIVO`, {
        description: 'Este evento ha sido pausado',
      });
    }
  });

  return () => {
    socket.disconnect();
  };
}, [user, refetchEvents]);
```

## Resultado
✅ **PROBLEMA RESUELTO**: Ahora cuando se actualizan eventos:

1. **Backend envía notificaciones WebSocket** inmediatamente
2. **Frontend recibe las notificaciones** en tiempo real
3. **Estado se actualiza automáticamente** sin recargar página
4. **Notificaciones toast informan** a los usuarios del cambio
5. **Diferentes tipos de usuarios** reciben notificaciones relevantes:
   - **Administradores**: Ven cambios inmediatos en la UI
   - **Jueces**: Reciben notificaciones cuando eventos se activan/desactivan

## Pruebas Realizadas
- ✅ Script `test-event-websocket.cjs` confirma la lógica
- ✅ WebSocket envía evento `event_updated` correctamente
- ✅ Frontend actualiza estado local inmediatamente
- ✅ Notificaciones toast funcionan para todos los usuarios

## Flujo de Trabajo Mejorado
1. **Admin activa/desactiva evento** → API call
2. **Servidor actualiza BD** → Cambio guardado
3. **Servidor envía WebSocket** → `io.emit('event_updated', ...)`
4. **Frontend recibe notificación** → Listener WebSocket
5. **Estado se actualiza** → React Query cache + setState
6. **UI se re-renderiza** → Cambio visible inmediatamente
7. **Usuario ve notificación** → Toast message

## Archivos Modificados
1. `/server-complete.cjs` - Endpoints con notificaciones WebSocket
2. `/src/hooks/useEvents.ts` - Listener WebSocket
3. `/src/pages/Admin/EventsAdmin.tsx` - Listener WebSocket para admin
4. `/src/hooks/useJudgeVotes.ts` - Listener WebSocket para jueces
5. `/test-event-websocket.cjs` - Script de prueba (nuevo)
6. `/FIX-REAL-TIME-EVENTS.md` - Esta documentación (nuevo)

---
**Fecha**: 2025-01-02  
**Estado**: ✅ RESUELTO  
**Desarrollador**: Senior Developer  
**Tecnologías**: WebSocket (Socket.IO), React Query, React Hooks 