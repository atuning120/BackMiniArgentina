const nodemailer = require('nodemailer');

exports.sendContactEmail = async (req, res) => {
  const { email, message, name, targetEmail } = req.body;

  if (!email || !message) {
    return res.status(400).json({ message: 'El correo y el mensaje son obligatorios.' });
  }

  try {
    // Configura el transportador de nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail', // O el servicio que uses
      auth: {
        user: process.env.EMAIL_USER, // Ej. ventas@ledclean.ar
        pass: process.env.EMAIL_PASS, // Contraseña de aplicación
      },
    });

    const destination = targetEmail || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${name || 'Cliente'} (vía Web)" <${process.env.EMAIL_USER}>`,
      to: destination, // A dónde llegará el correo
      replyTo: email, // Para que al darle "Responder" le llegue al cliente
      subject: `Nuevo mensaje de contacto web de ${name || email}`,
      text: `Has recibido un nuevo mensaje de contacto desde la web.\n\nNombre: ${name || 'No especificado'}\nCorreo del cliente: ${email}\nBuzón de destino: ${destination}\n\nMensaje:\n${message}`,
      html: `
        <h3>Nuevo mensaje de contacto</h3>
        <p><strong>Nombre:</strong> ${name || 'No especificado'}</p>
        <p><strong>Correo del cliente:</strong> ${email}</p>
        <p><strong>Buzón de destino:</strong> ${destination}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Correo enviado exitosamente' });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    res.status(500).json({ message: 'Hubo un error al enviar el correo. Por favor intenta más tarde.' });
  }
};
