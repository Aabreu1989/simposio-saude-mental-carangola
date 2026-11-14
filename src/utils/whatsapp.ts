/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Registration, EventConfig, PushNotificationItem } from '../types.ts';

/**
 * Standardizes a Brazilian phone number to 55XXXXXXXXXXX format
 */
export function cleanPhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';

  // If starts with 55 and has 12 or 13 digits, keep as is
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // If 10 or 11 digits (e.g. 32999998888), prepend 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

/**
 * Generates a direct WhatsApp click-to-chat URL
 */
export function createWhatsAppChatUrl(phone: string, message: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Generates a WhatsApp general broadcast/share URL (no specific recipient)
 */
export function createWhatsAppBroadcastUrl(message: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Formats a clean registration confirmation message for WhatsApp
 */
export function formatRegistrationWhatsAppMessage(
  reg: Registration,
  config?: EventConfig,
  originUrl?: string
): string {
  const title = config?.editionTitle || '1º Simpósio de Saúde Mental';
  const region = config?.regionTitle || 'da Microrregião de Carangola';
  const eventDate = config?.eventDate || '08 de Dezembro de 2026';
  const eventHours = config?.eventHours || '08h30 às 16h00';
  const location = config?.locationName || 'UEMG Carangola';
  const url = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  return (
    `*COMPROVANTE OFICIAL DE INSCRIÇÃO · SUS*\n` +
    `*${title.toUpperCase()}*\n` +
    `${region}\n\n` +
    `Olá, *${reg.fullName}*!\n` +
    `Sua inscrição no Simpósio está *CONFIRMADA* no sistema.\n\n` +
    `🎟️ *Nº do Participante / Código:* \`${reg.code}\`\n` +
    `📅 *Data:* ${eventDate}\n` +
    `⏰ *Horário:* ${eventHours}\n` +
    `📍 *Local:* ${location}\n` +
    `🏛️ *Município:* ${reg.city} - MG\n` +
    `🎯 *Eixo:* ${reg.axisInterest}\n\n` +
    `⚠️ *Instruções Importantes:*\n` +
    `1. Apresente este código \`${reg.code}\` no credenciamento para retirar seu crachá oficial.\n` +
    `2. O certificado oficial de 8 horas será emitido no portal informando seu código ou CPF.\n\n` +
    `🔗 *Acesse a programação e materiais:*\n` +
    `${url}\n\n` +
    `_Coordenação da RAPS · Sistema Único de Saúde (SUS)_`
  );
}

/**
 * Formats an official notification/alert message for WhatsApp broadcast
 */
export function formatNotificationWhatsAppMessage(
  notif: PushNotificationItem,
  config?: EventConfig,
  originUrl?: string
): string {
  const title = config?.editionTitle || '1º Simpósio de Saúde Mental';
  const url = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  const categoryEmoji: Record<string, string> = {
    lembrete: '⏰',
    aviso: '📢',
    material: '📚',
    certificado: '🎓',
    urgente: '🚨'
  };

  const emoji = categoryEmoji[notif.category] || '📢';

  return (
    `${emoji} *COMUNICADO OFICIAL DO SIMPÓSIO · SUS*\n` +
    `*${title.toUpperCase()}*\n\n` +
    `*${notif.title.toUpperCase()}*\n\n` +
    `${notif.body}\n\n` +
    `🔗 *Acesse o portal oficial do evento:*\n` +
    `${url}\n\n` +
    `_Transmissão Oficial RAPS · Carangola - MG_`
  );
}
