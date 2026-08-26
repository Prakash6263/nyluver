const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

function getConfig() {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !accessToken) {
    throw new Error('WhatsApp Cloud API credentials not configured');
  }
  return { phoneId, accessToken };
}

function formatPhone(phone: string): string {
  let clean = phone.replace(/[\s\-()]/g, '');
  if (clean.startsWith('+')) clean = clean.slice(1);
  return clean;
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; messageId?: string }> {
  try {
    const { phoneId, accessToken } = getConfig();
    const formattedPhone = formatPhone(to);

    const response = await fetch(`${GRAPH_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { body },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error(`[WhatsApp ERROR] Failed to send to ${formattedPhone}:`, JSON.stringify(data));
      return { success: false };
    }

    const messageId = data.messages?.[0]?.id;
    console.log(`[WhatsApp] Message sent to ${formattedPhone} | ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error: any) {
    console.error(`[WhatsApp ERROR] ${error.message}`);
    return { success: false };
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: any[]
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const { phoneId, accessToken } = getConfig();
    const formattedPhone = formatPhone(to);

    const templatePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };

    if (components) {
      templatePayload.template.components = components;
    }

    const response = await fetch(`${GRAPH_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templatePayload),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error(`[WhatsApp Template ERROR] Failed to send template "${templateName}" to ${formattedPhone}:`, JSON.stringify(data));
      return { success: false };
    }

    const messageId = data.messages?.[0]?.id;
    console.log(`[WhatsApp] Template "${templateName}" sent to ${formattedPhone} | ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error: any) {
    console.error(`[WhatsApp Template ERROR] ${error.message}`);
    return { success: false };
  }
}

export async function sendOtp(toPhone: string, code: string): Promise<{ success: boolean }> {
  const message = `Your Nyluver verification code is: ${code}. Valid for 5 minutes.`;
  return sendWhatsAppMessage(toPhone, message);
}

export async function sendOrderConfirmation(senderPhone: string, orderNumber: string): Promise<{ success: boolean }> {
  const message = `✅ Your Nyluver order #${orderNumber} has been confirmed! We're preparing something beautiful for you. 🌸`;
  return sendWhatsAppMessage(senderPhone, message);
}

export async function sendGiftNotification(recipientPhone: string, orderNumber: string): Promise<{ success: boolean }> {
  const message = `🎁 You have a special gift coming your way from Nyluver! Order #${orderNumber}. Stay tuned! 🌸`;
  return sendWhatsAppMessage(recipientPhone, message);
}

export async function sendStatusUpdate(recipientPhone: string, orderNumber: string, status: string): Promise<{ success: boolean }> {
  const statusMessages: Record<string, string> = {
    'in_prep': `🌷 Great news! Your Nyluver gift order #${orderNumber} is now being prepared with care.`,
    'ready': `✨ Your Nyluver gift order #${orderNumber} is ready and waiting for delivery!`,
    'out_for_delivery': `🚗 Your Nyluver gift order #${orderNumber} is out for delivery! It will arrive soon.`,
    'delivered': `💐 Your Nyluver gift order #${orderNumber} has been delivered! We hope it brings joy. 🌸`,
  };
  const message = statusMessages[status] || `📦 Your Nyluver order #${orderNumber} status has been updated to: ${status.replace(/_/g, ' ')}.`;
  return sendWhatsAppMessage(recipientPhone, message);
}
