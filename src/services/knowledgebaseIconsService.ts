// src/services/knowledgebaseIconsService.ts

import { request } from '../lib/http';

/**
 * The icon names a Knowledgebase category may use - KB_CATEGORY_ICON_NAMES in
 * modules/knowledgebase/utils/icons.ts, served by GET /knowledgebase/icons.
 *
 * The server's list IS the Blog category allowlist (the three the site ships
 * with - Boxes, ShieldCheck and Truck - are all on it), but it is read from this
 * route rather than from GET /blog/icons so that picking an icon needs
 * knowledgebase.read, not blog.read. Read from the server rather than
 * duplicated here, so the picker can never offer a name the validator would
 * reject. Kept out of the categories service because that module is handed to
 * useChildList whole, and this is not one of a list's calls.
 */
export const list = async (): Promise<string[]> => request<string[]>('/knowledgebase/icons');
