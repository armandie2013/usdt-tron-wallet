# USDT TRON Wallet

Aplicación full-stack desarrollada con Next.js, TypeScript, Tailwind CSS y MongoDB para gestionar wallets no-custodial de USDT sobre la red TRON.

El usuario mantiene el control de su clave privada y de su frase de recuperación.

Las operaciones sensibles se realizan localmente en el dispositivo y el servidor nunca recibe la clave privada ni las 12 palabras de recuperación.

---

## Arquitectura

### Frontend

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- Interfaz responsive para escritorio y dispositivos móviles.
- Tema claro y oscuro.
- Dashboard de wallet.
- Flujo de envío y recepción de USDT.
- Escáner QR mediante cámara del dispositivo.

### Backend

- Route Handlers de Next.js en `src/app/api`.
- Módulos de dominio separados.
- Autenticación mediante access token y refresh token.
- Cookies de sesión.
- Resolución de destinatarios internos.
- Consulta de balances y recursos TRON.
- Preparación y validación de transferencias.
- Broadcast de transacciones previamente firmadas por el cliente.

### Base de datos

- MongoDB.
- Usuarios.
- Wallets registradas.
- Datos públicos de las wallets.
- Información necesaria para autenticación y operación de la plataforma.

### Blockchain

- TRON.
- USDT TRC20.
- Soporte para NILE y MAINNET.
- Derivación de wallet:

```text
m/44'/195'/0'/0/0
```

- TronWeb.
- USDT trabaja internamente con 6 decimales.

---

## Modelo de seguridad

La wallet de cada usuario es no-custodial.

Esto significa que:

- La wallet se genera en el navegador o dispositivo del usuario.
- La clave privada nunca se envía al servidor.
- La frase de recuperación de 12 palabras nunca se envía al servidor.
- La información sensible de la wallet se almacena cifrada localmente.
- La contraseña local de la wallet solamente se utiliza para descifrarla en el dispositivo.
- Las transacciones se firman localmente.
- El backend solamente recibe la transacción ya firmada para realizar el broadcast a TRON.

El servidor conoce únicamente información pública necesaria para operar, como:

- Dirección pública.
- Red.
- Balance.
- Recursos TRON.
- Transacciones.
- Información asociada al usuario.

---

## Wallet local

Actualmente el sistema permite:

- Crear una wallet TRON desde el navegador.
- Generar una frase de recuperación de 12 palabras.
- Mostrar la frase al usuario durante el proceso de creación.
- Confirmar que el usuario guardó correctamente las palabras.
- Cifrar la wallet localmente mediante contraseña.
- Almacenar la información cifrada en IndexedDB.
- Recuperar una wallet mediante las 12 palabras.
- Validar que la wallet recuperada corresponde al usuario.
- Mantener la clave privada fuera del backend.

---

## Seguridad de contraseña local

La contraseña que protege la wallet tiene protección contra intentos repetidos.

Actualmente:

- 3 intentos incorrectos provocan bloqueo temporal.
- Primer bloqueo: 5 minutos.
- Segundo bloqueo: 15 minutos.
- Tercer bloqueo y posteriores: 30 minutos.

El bloqueo solamente afecta al dispositivo local.

La wallet y los fondos no son modificados.

Si el usuario conserva sus 12 palabras puede recuperar el acceso a la wallet.

---

## Dashboard

El dashboard muestra actualmente:

- Saldo USDT.
- Saldo TRX.
- Energy disponible.
- Bandwidth disponible.
- Red TRON utilizada.
- Dirección pública de la wallet.
- Acceso a Enviar.
- Acceso a Recibir.
- Sección de seguridad.
- Información del modelo no-custodial.

La interfaz está preparada para escritorio y dispositivos móviles.

---

## Recibir USDT

El usuario puede:

- Visualizar su dirección TRON.
- Copiar la dirección.
- Visualizar un código QR.
- Compartir el QR con otra persona.
- Recibir USDT TRC20 directamente en su wallet.

Los fondos se reciben directamente en la dirección blockchain del usuario.

---

## Enviar USDT

El flujo de envío permite utilizar como destinatario:

- Dirección TRON.
- Email de otro usuario de la plataforma.
- Nombre de usuario interno.
- Dirección obtenida escaneando un código QR.

### Flujo de transferencia

1. El usuario ingresa o escanea el destinatario.
2. Ingresa el importe.
3. El backend resuelve el destinatario.
4. Se obtiene una cotización de la transferencia.
5. Se muestran los datos antes de continuar.
6. Se verifica:
   - Saldo USDT.
   - Saldo TRX.
   - Energy.
   - Costo estimado de red.
7. El usuario ingresa la contraseña local de la wallet.
8. La wallet se descifra localmente.
9. La transacción TRC20 se construye y firma en el dispositivo.
10. La transacción firmada se envía al backend.
11. El backend realiza el broadcast a TRON.
12. Se devuelve el TXID al usuario.

---

## Escáner QR

El campo de destinatario permite abrir la cámara del teléfono y escanear un código QR.

Actualmente soporta:

- Dirección TRON directa.
- Formato `tron:T...`.
- Formato `tron://T...`.
- Extracción de una dirección TRON válida desde el contenido del QR.

Cuando se detecta una dirección válida:

- Se carga automáticamente en el campo Destinatario.
- Se detiene la cámara.
- Se cierra el lector QR.

La imagen de la cámara se procesa localmente y no se envía al servidor.

Para el lector QR se utiliza:

```text
@zxing/browser
```

Instalación:

```bash
npm install @zxing/browser
```

En dispositivos móviles, el acceso a la cámara normalmente requiere HTTPS.

`localhost` está permitido durante desarrollo, pero acceder desde un teléfono mediante una dirección HTTP de la red local puede impedir que el navegador habilite la cámara.

---

## Importes USDT

USDT TRC20 utiliza 6 decimales en blockchain.

Ejemplo:

```text
1 USDT = 1.000.000 unidades mínimas
```

La interfaz permite actualmente ingresar importes con hasta 2 decimales.

Ejemplos válidos:

```text
1
1,50
1000
1.000,50
1000.50
```

Los cálculos internos utilizan:

- `BigInt` para operaciones.
- `string` para persistencia y APIs.

No se utiliza `Number` ni `parseFloat` para construir montos de transferencias.

---

## Recursos TRON

Antes de realizar una transferencia el sistema consulta:

- TRX disponible.
- Energy disponible.
- Bandwidth disponible.
- Energy estimada requerida.
- Déficit de Energy.
- Costo estimado de red.

Esto permite determinar si la operación puede continuar antes de firmarla.

---

## Broadcast seguro

El sistema diferencia entre:

- Transacción aceptada.
- Transacción rechazada.
- Estado de broadcast desconocido.

Si ocurre un error de red después de enviar la transacción al backend, el sistema no asume automáticamente que la transferencia falló.

En esos casos:

- Conserva el TXID.
- Informa al usuario que debe verificarlo.
- Evita inducir a realizar inmediatamente una segunda transferencia.

Esto reduce el riesgo de envíos duplicados.

---

## Autenticación

El sistema incluye:

- Login.
- Sesión mediante access token.
- Refresh token.
- Cookies HTTP.
- Validación de sesión.
- Información del usuario autenticado.
- Cierre de sesión.

Cookies utilizadas:

```text
wallet_access
wallet_refresh
```

---

## Usuarios internos

La plataforma permite enviar USDT a otro usuario sin necesidad de conocer manualmente su dirección TRON.

El usuario puede ingresar:

```text
email
usuario
```

El backend resuelve esos datos hacia la dirección pública correspondiente.

La transferencia sigue siendo una transferencia real en blockchain.

No existe movimiento interno ficticio de saldo.

---

## Redes

El proyecto está preparado para trabajar con:

```text
NILE
MAINNET
```

### USDT NILE

Contrato utilizado actualmente en desarrollo:

```text
TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf
```

Las direcciones y contratos deben validarse siempre contra la red configurada.

---

## Variables de entorno

`.env.local` contiene la configuración local y no debe versionarse.

`.env.example` debe contener únicamente nombres de variables y valores de ejemplo.

Nunca guardar en Git:

- Claves privadas.
- Frases de recuperación.
- Seeds.
- Secretos JWT.
- Claves de cifrado.
- API keys reales.
- Credenciales de producción.

---

## Primer inicio

1. Instalar Node.js compatible con la versión actual del proyecto.

2. Instalar dependencias:

```bash
npm install
```

3. Configurar:

```text
.env.local
```

4. Tener MongoDB disponible.

5. Ejecutar:

```bash
npm run dev
```

6. Abrir:

```text
http://localhost:3000
```

---

## Comandos útiles

Desarrollo:

```bash
npm run dev
```

Instalación de dependencias:

```bash
npm install
```

Compilación y validación:

```bash
npm run build
```

Instalación del lector QR:

```bash
npm install @zxing/browser
```

---

## Estado actual

Actualmente están implementados:

- Autenticación.
- Creación de wallet.
- Almacenamiento cifrado local.
- Backup de 12 palabras.
- Recuperación de wallet.
- Bloqueo temporal por contraseña incorrecta.
- Dashboard.
- Saldo USDT.
- Saldo TRX.
- Energy.
- Bandwidth.
- Dirección pública.
- Código QR para recibir.
- Envío a dirección TRON.
- Envío a usuarios internos.
- Resolución por email o usuario.
- Cotización de transferencia.
- Estimación de costo TRON.
- Firma local.
- Broadcast.
- Manejo de broadcast ambiguo.
- TXID.
- Escáner QR mediante cámara.
- Soporte NILE.
- Estructura preparada para MAINNET.
- Diseño responsive.
- Tema claro y oscuro.

---

## Próximos bloques

Entre los siguientes módulos a desarrollar o ampliar se encuentran:

- Historial completo de transacciones.
- Auditoría de transacciones en MongoDB.
- Sincronización de operaciones desde TRON.
- Confirmaciones on-chain.
- Scanner y reconciliación de transacciones.
- Administración de la wallet de plataforma.
- Gestión de recursos TRON.
- Mejoras de seguridad.
- Pruebas automáticas.
- Preparación de producción.
- Aplicación móvil.

---

## Principio fundamental

La plataforma no debe tener capacidad para mover los fondos de las wallets personales de los usuarios.

La clave privada pertenece al usuario y permanece en su dispositivo.

```text
Usuario
   │
   ├── Wallet local cifrada
   │
   ├── Clave privada
   │
   └── Firma de transacciones
          │
          ▼
      Backend
          │
          └── Broadcast
                 │
                 ▼
               TRON
```