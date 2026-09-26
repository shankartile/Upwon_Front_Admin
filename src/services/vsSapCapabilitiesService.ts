// src/services/vsSapCapabilitiesService.ts

import { createAboutChildListService } from './aboutPageChildListService';
import type {
  CreateVsSapCapabilityInput,
  UpdateVsSapCapabilityInput,
  VsSapCapability,
} from '../types/vsSap';

/**
 * The rows of the capability table on the public /compare/upwon-vs-sap page,
 * backed by the real API.
 *
 * Mirrors the /capabilities routes in modules/vs-sap-page/routes one call per
 * route. Built from the About page's child-list factory because the server gives
 * this list exactly that shape - unpaginated, in display order, a status per row,
 * reordered by sending every id - so only the row and input types differ.
 *
 * Guarded by vs_sap_page.read for the reads and vs_sap_page.update for every
 * write.
 *
 * Capped at 30 rows on the server (MAX_VS_SAP_CAPABILITIES) - the create that
 * would go over is a 409.
 */
const service = createAboutChildListService<
  VsSapCapability,
  CreateVsSapCapabilityInput,
  UpdateVsSapCapabilityInput
>('/vs-sap-page/capabilities');

export const { list, getById, create, update, setStatus, reorder, remove } = service;
