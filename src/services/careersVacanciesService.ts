// src/services/careersVacanciesService.ts

import { request } from '../lib/http';
import type {
  CareerVacancy,
  CareerVacancyFilters,
  ContentStatus,
  CreateCareerVacancyInput,
  DeleteCareerVacancyResult,
  UpdateCareerVacancyInput,
} from '../types/careers';

/**
 * The Career area's vacancies, backed by the real API.
 *
 * Mirrors modules/careers/routes/vacancies.routes.ts one call per admin route.
 * The public half of that router (GET /public/careers/vacancies, the Open
 * Roles list) is the website's business, never this panel's.
 *
 * Every call is behind `authenticate` and one of the careers.* permissions -
 * read for the two gets, create/update/delete for the rest. Those are the
 * vacancies' own keys rather than career_applications.*: posting a job advert
 * and reading everybody who applied for it are different decisions.
 */

const BASE = '/careers/vacancies';

/**
 * Every vacancy, of every status, in display order.
 *
 * Unpaginated on the server, and deliberately so: the reorder arrows move a
 * row against the whole set, which means the whole set has to be in hand. The
 * table therefore searches, filters and pages it client-side, like the Insider
 * news list. The server caps the set at LIMITS.MAX_VACANCIES (60).
 */
export const list = async (filters: CareerVacancyFilters = {}): Promise<CareerVacancy[]> =>
  request<CareerVacancy[]>(BASE, { query: { status: filters.status, search: filters.search } });

export const getById = async (id: string): Promise<CareerVacancy> =>
  request<CareerVacancy>(`${BASE}/${id}`);

/**
 * Creates a vacancy at the end of the list.
 *
 * `displayOrder` is not part of the body: the server appends, and the arrows
 * move it from there. 409 VACANCY_LIMIT_REACHED once the cap is reached.
 */
export const create = async (input: CreateCareerVacancyInput): Promise<CareerVacancy> =>
  request<CareerVacancy>(BASE, { method: 'POST', body: input });

/**
 * A merge: absent fields are left alone. The two lists are replaced whole -
 * `[]` clears one, absent leaves it as it was.
 */
export const update = async (
  id: string,
  input: UpdateCareerVacancyInput,
): Promise<CareerVacancy> => request<CareerVacancy>(`${BASE}/${id}`, { method: 'PUT', body: input });

/**
 * Publish / unpublish. ACTIVE is what puts the role on the public /careers
 * page; INACTIVE keeps it here and takes it off the site.
 */
export const setStatus = async (id: string, status: ContentStatus): Promise<CareerVacancy> =>
  request<CareerVacancy>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

/**
 * Rewrites the display order of the whole set, and answers with the list in
 * its new order.
 *
 * Every id has to be named, exactly once - the server refuses a partial list
 * (422 INCOMPLETE_ORDER) rather than guessing where the rest go.
 */
export const reorder = async (ids: string[]): Promise<CareerVacancy[]> =>
  request<CareerVacancy[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

/**
 * Deletes the vacancy. Its applications are NOT deleted with it: they keep the
 * title they were advertised under and stay readable in the inbox, and the
 * count of them comes back so the toast can say so.
 */
export const remove = async (id: string): Promise<DeleteCareerVacancyResult> =>
  request<DeleteCareerVacancyResult>(`${BASE}/${id}`, { method: 'DELETE' });
