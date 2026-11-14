/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import emailjs from '@emailjs/browser';
import { EventConfig } from '../types.ts';

export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  enabled: boolean;
}

export interface EmailJsTemplateParams {
  to_name: string;
  to_email: string;
  participant_code: string;
  registration_code: string;
  certificate_code: string;
  event_program: string;
  schedule_link: string;
  certificate_link: string;
  certificate_instructions: string;
  event_title: string;
  event_date: string;
  event_location: string;
  event_hours: string;
  participant_role: string;
  participant_city: string;
  participant_institution: string;
  sus_care_level: string;
  subject: string;
  message_html: string;
  message_text: string;
  reply_to?: string;
  [key: string]: unknown;
}

export interface EmailJsSendResult {
  success: boolean;
  provider: 'emailjs' | 'emailjs_rest' | 'fallback';
  status?: number;
  text?: string;
  error?: string;
}

const STORAGE_KEY = 'sus_emailjs_config';

/**
 * Retrieves the active EmailJS configuration, merging Firestore EventConfig,
 * environment variables and localStorage overrides.
 */
export function getEmailJsConfig(eventConfig?: EventConfig): EmailJsConfig {
  const envServiceId = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_EMAILJS_SERVICE_ID || '';
  const envTemplateId = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_EMAILJS_TEMPLATE_ID || '';
  const envPublicKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_EMAILJS_PUBLIC_KEY || '';

  const cloudCfg = eventConfig?.emailJsConfig;
  if (
    cloudCfg &&
    cloudCfg.serviceId &&
    cloudCfg.templateId &&
    cloudCfg.publicKey &&
    !cloudCfg.publicKey.includes('user_sus_mg_default')
  ) {
    return {
      serviceId: cloudCfg.serviceId,
      templateId: cloudCfg.templateId,
      publicKey: cloudCfg.publicKey,
      enabled: cloudCfg.enabled !== undefined ? cloudCfg.enabled : true
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        serviceId: parsed.serviceId || envServiceId || 'service_sus_carangola',
        templateId: parsed.templateId || envTemplateId || 'template_inscricao_sus',
        publicKey: parsed.publicKey || envPublicKey || 'user_sus_mg_default',
        enabled: parsed.enabled !== undefined ? parsed.enabled : true
      };
    }
  } catch (e) {
    console.warn('Error reading EmailJS config from localStorage:', e);
  }

  return {
    serviceId: envServiceId || 'service_sus_carangola',
    templateId: envTemplateId || 'template_inscricao_sus',
    publicKey: envPublicKey || 'user_sus_mg_default',
    enabled: true
  };
}

/**
 * Saves updated EmailJS configuration to localStorage for persistent runtime usage.
 */
export function saveEmailJsConfig(config: EmailJsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save EmailJS config to localStorage:', e);
  }
}

/**
 * Checks whether user has provided real custom EmailJS API keys.
 */
export function isEmailJsConfigured(eventConfig?: EventConfig): boolean {
  const cfg = getEmailJsConfig(eventConfig);
  return Boolean(
    cfg.enabled &&
    cfg.serviceId &&
    cfg.templateId &&
    cfg.publicKey &&
    !cfg.publicKey.includes('user_sus_mg_default')
  );
}

/**
 * Sends a confirmation email to the participant using the EmailJS Browser SDK,
 * with automatic fallback to EmailJS REST API.
 */
export async function sendEmailViaEmailJs(
  params: EmailJsTemplateParams,
  overrideConfig?: Partial<EmailJsConfig>,
  eventConfig?: EventConfig
): Promise<EmailJsSendResult> {
  const config = { ...getEmailJsConfig(eventConfig), ...overrideConfig };

  if (!config.enabled) {
    return {
      success: false,
      provider: 'fallback',
      error: 'Integração EmailJS está desativada nas configurações.'
    };
  }

  // Attempt 1: EmailJS Browser SDK
  try {
    if (config.publicKey && !config.publicKey.includes('user_sus_mg_default')) {
      emailjs.init({ publicKey: config.publicKey });
      const response = await emailjs.send(
        config.serviceId,
        config.templateId,
        params as unknown as Record<string, unknown>,
        { publicKey: config.publicKey }
      );

      return {
        success: true,
        provider: 'emailjs',
        status: response.status,
        text: response.text || 'Email enviado com sucesso via EmailJS SDK.'
      };
    }
  } catch (sdkError: unknown) {
    const errorMsg = sdkError instanceof Error ? sdkError.message : String(sdkError);
    console.warn('EmailJS SDK send failed, trying REST API fallback:', errorMsg);

    // Attempt 2: Direct EmailJS REST API endpoint
    try {
      const restResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: config.serviceId,
          template_id: config.templateId,
          user_id: config.publicKey,
          template_params: params
        })
      });

      if (restResponse.ok) {
        const text = await restResponse.text();
        return {
          success: true,
          provider: 'emailjs_rest',
          status: restResponse.status,
          text: text || 'Email enviado com sucesso via EmailJS REST API.'
        };
      }
    } catch (restError) {
      console.warn('EmailJS REST API also failed:', restError);
    }

    return {
      success: false,
      provider: 'fallback',
      error: `EmailJS API indisponível (${errorMsg}). Fallback acionado.`
    };
  }

  // If using placeholder default keys, simulate an intentional fallback
  return {
    success: false,
    provider: 'fallback',
    error: 'Chaves personalizadas do EmailJS ainda não cadastradas (utilizando fallback automático com entrega garantida).'
  };
}
