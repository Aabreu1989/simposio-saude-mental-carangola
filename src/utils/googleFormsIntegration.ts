/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Registration } from '../types.ts';
import { generateRegistrationCode } from './helpers.ts';

export interface ColumnMapping {
  fullNameCol?: string;
  cpfCol?: string;
  emailCol?: string;
  phoneCol?: string;
  cityCol?: string;
  roleCol?: string;
  institutionCol?: string;
  axisCol?: string;
  accessibilityCol?: string;
  timestampCol?: string;
  cnsCol?: string;
}

export interface ParseResult {
  headers: string[];
  rawRows: Record<string, any>[];
  detectedMapping: ColumnMapping;
  mappedRegistrations: Registration[];
  duplicatesFound: number;
  newCount: number;
}

/**
 * Normalizes text for matching column header names regardless of accents or casing
 */
function normalizeHeader(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Automatically infers which column corresponds to each Registration field
 */
export function detectGoogleFormsColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const h of headers) {
    const norm = normalizeHeader(h);

    if (!mapping.timestampCol && (norm.includes('carimbo') || norm.includes('timestamp') || norm.includes('data/hora') || norm.includes('data de envio'))) {
      mapping.timestampCol = h;
    } else if (!mapping.fullNameCol && (norm.includes('nome completo') || norm === 'nome' || norm.includes('nome participante') || norm.includes('nome e sobrenome'))) {
      mapping.fullNameCol = h;
    } else if (!mapping.emailCol && (norm.includes('email') || norm.includes('e-mail') || norm.includes('correio eletronico'))) {
      mapping.emailCol = h;
    } else if (!mapping.cpfCol && (norm.includes('cpf') || norm.includes('documento'))) {
      mapping.cpfCol = h;
    } else if (!mapping.phoneCol && (norm.includes('telefone') || norm.includes('whatsapp') || norm.includes('celular') || norm.includes('contato'))) {
      mapping.phoneCol = h;
    } else if (!mapping.cityCol && (norm.includes('municipio') || norm.includes('cidade') || norm.includes('territorio'))) {
      mapping.cityCol = h;
    } else if (!mapping.roleCol && (norm.includes('cargo') || norm.includes('funcao') || norm.includes('profissao') || norm.includes('ocupacao'))) {
      mapping.roleCol = h;
    } else if (!mapping.institutionCol && (norm.includes('instituicao') || norm.includes('local de trabalho') || norm.includes('unidade') || norm.includes('orgao') || norm.includes('estabelecimento'))) {
      mapping.institutionCol = h;
    } else if (!mapping.axisCol && (norm.includes('eixo') || norm.includes('interesse') || norm.includes('tema'))) {
      mapping.axisCol = h;
    } else if (!mapping.accessibilityCol && (norm.includes('acessibilidade') || norm.includes('necessidade') || norm.includes('deficiencia') || norm.includes('pcd'))) {
      mapping.accessibilityCol = h;
    } else if (!mapping.cnsCol && (norm.includes('cns') || norm.includes('cartao sus') || norm.includes('cartao nacional'))) {
      mapping.cnsCol = h;
    }
  }

  // Fallbacks if not matched yet
  if (!mapping.fullNameCol) {
    mapping.fullNameCol = headers.find(h => normalizeHeader(h).includes('nome')) || headers[1] || headers[0];
  }
  if (!mapping.emailCol) {
    mapping.emailCol = headers.find(h => normalizeHeader(h).includes('mail'));
  }

  return mapping;
}

/**
 * Converts raw sheet rows into standardized Registration objects
 */
export function mapRowsToRegistrations(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  existingRegistrations: Registration[] = []
): { mapped: Registration[]; duplicatesCount: number; newCount: number } {
  const existingCpfs = new Set(
    existingRegistrations
      .map(r => (r.cpf || '').replace(/\D/g, ''))
      .filter(Boolean)
  );
  const existingEmails = new Set(
    existingRegistrations
      .map(r => (r.email || '').toLowerCase().trim())
      .filter(Boolean)
  );

  const mapped: Registration[] = [];
  let duplicatesCount = 0;
  let newCount = 0;

  rows.forEach((row, index) => {
    const rawName = mapping.fullNameCol ? String(row[mapping.fullNameCol] || '').trim() : '';
    if (!rawName) return; // Skip empty rows

    const rawEmail = mapping.emailCol ? String(row[mapping.emailCol] || '').trim() : '';
    const rawCpf = mapping.cpfCol ? String(row[mapping.cpfCol] || '').trim() : '';
    const cleanCpf = rawCpf.replace(/\D/g, '');
    const cleanEmail = rawEmail.toLowerCase().trim();

    const isDuplicate =
      (cleanCpf && existingCpfs.has(cleanCpf)) ||
      (cleanEmail && existingEmails.has(cleanEmail));

    if (isDuplicate) {
      duplicatesCount++;
    } else {
      newCount++;
      if (cleanCpf) existingCpfs.add(cleanCpf);
      if (cleanEmail) existingEmails.add(cleanEmail);
    }

    const rawPhone = mapping.phoneCol ? String(row[mapping.phoneCol] || '').trim() : '';
    const rawCity = mapping.cityCol ? String(row[mapping.cityCol] || '').trim() : 'Carangola';
    const rawRole = mapping.roleCol ? String(row[mapping.roleCol] || '').trim() : 'Profissional da Saúde';
    const rawInst = mapping.institutionCol ? String(row[mapping.institutionCol] || '').trim() : 'SUS / Microrregião de Carangola';
    const rawAxis = mapping.axisCol ? String(row[mapping.axisCol] || '').trim() : 'Eixo 1: Fluxograma da RAPS';
    const rawAccess = mapping.accessibilityCol ? String(row[mapping.accessibilityCol] || '').trim() : undefined;
    const rawTimestamp = mapping.timestampCol ? String(row[mapping.timestampCol] || '').trim() : '';
    const rawCns = mapping.cnsCol ? String(row[mapping.cnsCol] || '').trim() : undefined;

    const registration: Registration = {
      id: `gforms_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      code: generateRegistrationCode(existingRegistrations.length + index),
      fullName: rawName,
      cpf: rawCpf || 'Não informado no Forms',
      cns: rawCns,
      email: rawEmail || `inscrito.gforms.${index + 1}@sus.mg.gov.br`,
      phone: rawPhone || '(32) 99999-0000',
      city: rawCity || 'Carangola',
      professionalRole: rawRole || 'Profissional da Saúde',
      institution: rawInst || 'Rede de Saúde Municipal',
      axisInterest: rawAxis || 'Eixo 1: Fluxograma da RAPS',
      accessibilityNeeds: rawAccess,
      status: 'confirmada',
      registeredAt: rawTimestamp ? new Date(rawTimestamp).toISOString() : new Date().toISOString(),
      certificateIssued: false,
      notes: `Inscrição sincronizada via Planilha Google Forms (${rawTimestamp || 'Arquivo Excel'})`,
      origin: 'google_forms',
      acceptEmailNews: true,
      acceptWhatsappNews: true
    };

    mapped.push(registration);
  });

  return { mapped, duplicatesCount, newCount };
}

/**
 * Parses an Excel file (.xlsx, .xls) or CSV uploaded by the user
 */
export async function parseExcelOrCsvFile(
  file: File,
  existingRegistrations: Registration[] = []
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('O arquivo não contém nenhuma planilha legível.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON objects with first row as headers
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('A planilha selecionada está vazia ou não possui respostas preenchidas.');
  }

  // Extract header keys from the first row
  const headers = Object.keys(rawRows[0] || {});
  const detectedMapping = detectGoogleFormsColumns(headers);
  const { mapped, duplicatesCount, newCount } = mapRowsToRegistrations(rawRows, detectedMapping, existingRegistrations);

  return {
    headers,
    rawRows,
    detectedMapping,
    mappedRegistrations: mapped,
    duplicatesFound: duplicatesCount,
    newCount
  };
}

/**
 * Fetches and parses a live Google Sheets published URL (CSV or TSV)
 */
export async function fetchAndParseGoogleSheetsUrl(
  sheetUrl: string,
  existingRegistrations: Registration[] = []
): Promise<ParseResult> {
  let exportUrl = sheetUrl.trim();

  // If user pasted a standard Google Sheets edit URL, convert it to CSV export
  if (exportUrl.includes('docs.google.com/spreadsheets/d/')) {
    const match = exportUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    }
  }

  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(
      `Não foi possível acessar a planilha (Código HTTP ${response.status}). Verifique se a planilha está configurada como pública ou 'Publicada na Web' no Google Sheets.`
    );
  }

  const csvText = await response.text();
  const workbook = XLSX.read(csvText, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('Nenhuma resposta encontrada na planilha do Google Forms sincronizada.');
  }

  const headers = Object.keys(rawRows[0] || {});
  const detectedMapping = detectGoogleFormsColumns(headers);
  const { mapped, duplicatesCount, newCount } = mapRowsToRegistrations(rawRows, detectedMapping, existingRegistrations);

  return {
    headers,
    rawRows,
    detectedMapping,
    mappedRegistrations: mapped,
    duplicatesFound: duplicatesCount,
    newCount
  };
}
