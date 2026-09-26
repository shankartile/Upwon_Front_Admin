// src/types/careers.ts

import type { PaginationMeta } from '../lib/http';
import type { ContentStatus } from './homePage';

export type { ContentStatus };

/**
 * The Career area, mirroring the backend module at src/modules/careers.
 *
 * Two resources in one file because they are two halves of one feature, and
 * the two tabs of one screen:
 *
 *   - a VACANCY is content. An admin writes it, the public /careers page reads
 *     it, and only the ACTIVE ones reach the site. Same shape of thing as an
 *     Insider news item - ordered, published, editable.
 *   - an APPLICATION runs the other way. A stranger writes it through the
 *     Apply Now form in the vacancy popup, and this panel is the only thing
 *     that ever reads it. It is never edited here: the one field an admin may
 *     change is `status`, the recruiter's own triage column.
 *
 * That split is why there is no create/update input type for an application
 * anywhere in this file, and why the two are guarded by different permissions
 * on the server (careers.* against career_applications.*).
 */

// ── vacancies ──────────────────────────────────────────────────────────────

/** WORK_MODES on the server. The location is stored separately ('Nashik'). */
export type WorkMode = 'On-site' | 'Hybrid' | 'Remote' | 'Field';

/**
 * One vacancy as GET /careers/vacancies returns it - every status, in display
 * order.
 *
 * `applicationCount` is on the list row rather than behind a second request
 * because it is a column of the Vacancy Management table AND the sentence the
 * delete confirmation has to say: an admin must learn that a role has nineteen
 * applications before deleting it, not after.
 */
export interface CareerVacancy {
  id: string;
  title: string;
  /** The small label above the title on the site ('Engineering'). */
  department: string;
  /** Just the place - 'Nashik', 'Pan-India'. The arrangement is `workMode`. */
  location: string;
  workMode: WorkMode;
  description: string;
  /** One entry per bullet, in the order they are shown. May be empty. */
  requirements: string[];
  skills: string[];
  /** Free text: '3-5 years', 'Fresher'. */
  experience: string;
  status: ContentStatus;
  /**
   * The position on the public page. Not typed into the form - it is changed
   * with the reorder arrows, which rewrite the whole set at once.
   */
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  applicationCount: number;
}

/**
 * POST body. `displayOrder` is deliberately absent: the server appends a new
 * vacancy to the end of the list, and the arrows move it from there.
 */
export interface CreateCareerVacancyInput {
  title: string;
  department: string;
  location: string;
  workMode: WorkMode;
  description: string;
  /** Replaced whole on save; `[]` clears the list. */
  requirements: string[];
  skills: string[];
  experience: string;
  status: ContentStatus;
}

/**
 * PUT body: every field optional, at least one required by the server.
 *
 * This form sends them all, so the partiality is the server's contract rather
 * than something the screen depends on.
 */
export type UpdateCareerVacancyInput = Partial<CreateCareerVacancyInput>;

/** The Vacancy Management list's two server-side controls. Paging is not one. */
export interface CareerVacancyFilters {
  status?: ContentStatus;
  /** Matched against title, department and location, case-insensitively. */
  search?: string;
}

/**
 * What DELETE /careers/vacancies/:id answers with.
 *
 * Deleting a vacancy does not delete the applications made against it - they
 * keep the title they were advertised under - so the count comes back to be
 * said out loud in the toast.
 */
export interface DeleteCareerVacancyResult {
  applicationsRetained: number;
}

// ── applications ───────────────────────────────────────────────────────────

/** APPLICATION_STATUSES on the server. Triage, not a publish state. */
export type ApplicationStatus = 'NEW' | 'IN_REVIEW' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';

/** What the inbox needs to offer a download, not the file itself. */
export interface CareerApplicationResume {
  fileId: string;
  /** The candidate's own filename, sanitised by the server at upload. */
  fileName: string;
}

/**
 * One row of the Vacancy Applications table.
 *
 * SAFETY: every value on this record is candidate-controlled text. It is all
 * rendered as text, never as markup, and the only hrefs built from it are the
 * mailto: and tel: in lib/contactLinks, which re-check the value first.
 */
export interface CareerApplicationSummary {
  id: string;
  /**
   * Null once the vacancy has been deleted. The table still shows the title
   * and marks it as a role that no longer exists, so nobody goes hunting for
   * it in Vacancy Management.
   */
  vacancyId: string | null;
  /**
   * The title as it was ADVERTISED, snapshotted at submission - not the
   * vacancy's current title. "Applied for X" has to mean the X this person
   * read, whatever it has since been renamed to.
   */
  vacancyTitle: string;
  fullName: string;
  email: string;
  phone: string;
  experience: string;
  /** Null when the stored file has been purged - then there is nothing to download. */
  resume: CareerApplicationResume | null;
  status: ApplicationStatus;
  /** When it arrived. The inbox is ordered by this, newest first. */
  createdAt: string;
}

/**
 * GET /careers/applications/:id - the row plus the fields that are read one
 * candidate at a time rather than scanned down a column.
 *
 * The IP and user agent are for telling a real application from a filed one,
 * exactly as on the contact enquiry inbox, and are deliberately absent from
 * the list response.
 */
export interface CareerApplication extends CareerApplicationSummary {
  location: string;
  /** The covering note. Optional on the form, so null when left blank. */
  message: string | null;
  statusUpdatedAt: string | null;
  /** The administrator's display name, or null while the status is untouched. */
  statusUpdatedBy: string | null;
  /** Bare address ('203.0.113.5'), not CIDR - the server strips the mask. */
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/** The inbox's query filters. Sorting is not one: the server answers newest first. */
export interface CareerApplicationFilters {
  /** Matched against the candidate's name and email only. */
  search?: string;
  /** An exact vacancy, by id - the title is a snapshot and would not match. */
  vacancyId?: string;
  status?: ApplicationStatus;
  /** ISO 8601. The server rejects a dateFrom later than dateTo. */
  dateFrom?: string;
  dateTo?: string;
}

/** One page of the inbox: the rows, and the server's count of the whole set. */
export interface CareerApplicationList {
  rows: CareerApplicationSummary[];
  meta: PaginationMeta;
}
