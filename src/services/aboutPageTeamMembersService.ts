// src/services/aboutPageTeamMembersService.ts

import { createAboutChildListService } from './aboutPageChildListService';
import type {
  AboutTeamMember,
  CreateAboutTeamMemberInput,
  UpdateAboutTeamMemberInput,
} from '../types/aboutPage';

/**
 * The people on the About page's People grid, backed by the real API.
 *
 * Mirrors modules/about-page/routes/team-members.routes.ts one call per route.
 * A resource of its own beside the team section rather than nested under it,
 * exactly as the server has it - the section's copy and the people in it are
 * saved separately, so a reordered grid does not have to re-send the heading.
 *
 * Capped at 12 people on the server (409 TEAM_MEMBER_LIMIT_REACHED), which is why
 * the screen fetches the whole set rather than a page of it.
 */
const service = createAboutChildListService<
  AboutTeamMember,
  CreateAboutTeamMemberInput,
  UpdateAboutTeamMemberInput
>('/about-page/team-members');

export const { list, getById, create, update, setStatus, reorder, remove } = service;
