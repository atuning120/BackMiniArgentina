const { redisClient } = require('../db/redis');

async function progressiveLoginLimiter(req, res, next) {
  // Si Redis no está inicializado o no hay conexión, simplemente pasamos
  if (!redisClient || !redisClient.isOpen) {
    return next();
  }

  try {
    const ip = req.ip || 'desconocida';
    const blockKey = `login_block:${ip}`;
    
    // 1. Verificar si la IP está actualmente bloqueada
    const blockTTL = await redisClient.ttl(blockKey);
    if (blockTTL > 0) {
      const minutes = Math.ceil(blockTTL / 60);
      return res.status(429).json({ 
        error: `Demasiados intentos fallidos. Tu IP ha sido bloqueada por seguridad. Intenta de nuevo en ${minutes} minuto(s).` 
      });
    }

    // 1.5 Verificar si requiere resolver CAPTCHA (después de 3 intentos)
    const attemptKey = `login_attempts:${ip}`;
    const currentAttempts = parseInt(await redisClient.get(attemptKey) || '0', 10);

    if (currentAttempts >= 3) {
      const userCaptcha = req.body.captchaToken;
      const validCaptcha = await redisClient.get(`captcha:${ip}`);
      
      if (!userCaptcha || !validCaptcha || userCaptcha.trim() !== validCaptcha) {
        return res.status(403).json({
          error: 'Demasiados intentos. Por favor, resuelve la operación matemática (CAPTCHA).',
          requireCaptcha: true
        });
      }
      
      // Si fue correcto, borramos el captcha de Redis para que no se re-use
      await redisClient.del(`captcha:${ip}`);
    }

    // 2. Interceptar la respuesta para detectar si el login fue exitoso o fallido
    const originalJson = res.json;
    res.json = function (body) {
      const isFailedAttempt = res.statusCode === 401 || res.statusCode === 400;
      const isSuccessfulLogin = res.statusCode === 200 && body.token;

      if (isFailedAttempt) {
        // Ejecutar de forma asíncrona sin bloquear la respuesta al usuario
        handleFailedAttempt(ip).catch(e => console.error('Error en Redis al registrar intento:', e));
      } else if (isSuccessfulLogin) {
        // Login exitoso: limpiar historial de intentos y bloqueos
        redisClient.del(`login_attempts:${ip}`).catch(e => console.error(e));
        redisClient.del(blockKey).catch(e => console.error(e));
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  } catch (err) {
    console.error('Error en middleware progressiveLoginLimiter:', err);
    next(); // Fallback: permitir el flujo en caso de fallo crítico en Redis
  }
}

async function handleFailedAttempt(ip) {
  const attemptKey = `login_attempts:${ip}`;
  const blockKey = `login_block:${ip}`;
  
  const attempts = await redisClient.incr(attemptKey);
  
  // Ventana base: 15 minutos
  let ttlSeconds = 15 * 60;
  
  if (attempts >= 6) {
    // A partir del sexto intento fallido, aplicamos bloqueo progresivo
    // Intento 6 -> bloquea 15 mins
    // Intento 7 -> bloquea 30 mins
    // Intento 8 -> bloquea 60 mins...
    const multiplier = Math.pow(2, attempts - 6);
    const blockTimeSeconds = 15 * 60 * multiplier;
    
    await redisClient.setEx(blockKey, blockTimeSeconds, '1');
    console.warn(`[SECURITY ALERT] Rate Limit: IP ${ip} bloqueada por ${blockTimeSeconds / 60} minutos. (Intentos fallidos acumulados: ${attempts})`);
    
    // Extender la vida de los intentos fallidos para que sobreviva al bloqueo.
    // Así, si vuelven a fallar ni bien se desbloquean, el castigo será mayor.
    ttlSeconds = blockTimeSeconds + (15 * 60); 
  }
  
  // Actualizar el tiempo de expiración del contador
  await redisClient.expire(attemptKey, ttlSeconds);
}

module.exports = { progressiveLoginLimiter };
