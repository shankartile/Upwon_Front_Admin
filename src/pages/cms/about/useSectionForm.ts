// src/pages/cms/about/useSectionForm.ts

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import * as fileService from '../../../services/fileService';

/**
 * The plumbing every singleton section form in this area repeats, in one place.
 *
 * Five of the six About Us tabs are the same screen with different fields: read
 * the singleton (null before it has ever been authored, so the form opens empty),
 * validate every field on blur and on submit, PUT the whole thing back, map a
 * 422's field errors under the inputs they name, and toast either way. That is the
 * shape ContactHeroSectionPage and PartnerProgramHeroSectionPage each spell out
 * inline - which was the right call when there were two of them and the wrong one
 * at seven, because the five copies would be five places for the retry-upload
 * rule and the error precedence to drift apart.
 *
 * What stays in the pages: their fields, their rules, their layout, and what
 * their images are. This owns only the mechanics.
 *
 * The hook deliberately does NOT own the child lists on the People and Number
 * tabs. Those are separate resources with their own endpoints, saved
 * independently of the copy above them - see useChildList.
 */

/** What a page tells the hook about its section. Read fresh on every call. */
export interface SectionFormOptions<TSection, TDraft, TInput, TField extends string> {
  /** GET. Resolves to null while the section has never been authored. */
  load: () => Promise<TSection | null>;
  /** PUT. A full replace, so the body carries every field. */
  save: (input: TInput) => Promise<TSection>;
  /** The form state for a section, or for a section that does not exist yet. */
  toDraft: (section: TSection | null) => TDraft;
  /**
   * Every field's error, or null. Recomputed on each keystroke, so the Save
   * button and the inline messages can never disagree.
   *
   * A field here need not be an input: the image slots report under the name the
   * server uses for them ('imageUrl', 'backdrops'), which is what lets a stored
   * URL that would be refused block Save without the form having a URL box.
   */
  validate: (draft: TDraft) => Record<TField, string | null>;
  /**
   * The PUT body. Async because this is where picked files are uploaded - on
   * Save, never on selection, so abandoning the form leaves no orphaned upload
   * behind. Throwing here fails the save with the usual toast.
   */
  toInput: (draft: TDraft) => Promise<TInput>;
  /** Run after a successful save, before the toast. Used to forget picked files. */
  onSaved?: (section: TSection) => void;
  /** Wording for the three things that can happen. */
  messages: { saved: string; savedDetail: string; failed: string };
}

export interface SectionForm<TSection, TDraft, TField extends string> {
  section: TSection | null;
  form: TDraft | null;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  saving: boolean;
  submitted: boolean;
  /** Every field's current error whether or not it should be shown yet. */
  errors: Record<TField, string | null>;
  /** True while anything would be refused - what Save is disabled on. */
  hasErrors: boolean;
  /** The message to render under one input: the server's, then the local one. */
  errorFor: (field: TField) => string | undefined;
  /** Marks a field as left, so its error appears on blur rather than on open. */
  touch: (field: TField) => void;
  /** Merges changes into the draft and drops the last save's errors for them. */
  patch: (changes: Partial<TDraft>) => void;
  /** For the edits a shallow merge cannot express - a list, a nested slot. */
  update: (change: (draft: TDraft) => TDraft) => void;
  /** A field the admin has just edited no longer carries the last save's error. */
  clearServerErrors: (fields: string[]) => void;
  serverErrors: Record<string, string>;
  submit: () => Promise<void>;
}

export function useSectionForm<TSection, TDraft, TInput, TField extends string>(
  options: SectionFormOptions<TSection, TDraft, TInput, TField>,
): SectionForm<TSection, TDraft, TField> {
  const toast = useToast();

  /*
   * The page rebuilds its callbacks on every render, so they are read through a
   * ref rather than captured. Without it `reload` would change identity on every
   * render and the effect below would refetch the section in a loop.
   */
  const latest = useRef(options);
  latest.current = options;

  const [section, setSection] = useState<TSection | null>(null);
  const [form, setForm] = useState<TDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<TField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  /** The draft as it is right now, so submit() never sends a stale one. */
  const draftRef = useRef<TDraft | null>(null);
  draftRef.current = form;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const found = await latest.current.load();
      setSection(found);
      setForm(latest.current.toDraft(found));
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Recomputed each render. Cheap, and it means nothing on screen can disagree
  // with what Save is blocked on.
  const errors = useMemo(
    () =>
      form
        ? latest.current.validate(form)
        : ({} as Record<TField, string | null>),
    [form],
  );

  const hasErrors = Object.values(errors).some(Boolean);

  const clearServerErrors = useCallback((fields: string[]) => {
    setServerErrors((current) => {
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });
  }, []);

  const patch = useCallback(
    (changes: Partial<TDraft>) => {
      setForm((current) => (current ? { ...current, ...changes } : current));
      clearServerErrors(Object.keys(changes));
    },
    [clearServerErrors],
  );

  const update = useCallback((change: (draft: TDraft) => TDraft) => {
    setForm((current) => (current ? change(current) : current));
  }, []);

  const touch = useCallback((field: TField) => {
    setTouched((current) => ({ ...current, [field]: true }));
  }, []);

  /**
   * A server error shows until its field changes; a local one once the field has
   * been left, or once Save has been pressed.
   */
  const errorFor = useCallback(
    (field: TField): string | undefined =>
      serverErrors[field] ??
      (submitted || touched[field] ? (errors[field] ?? undefined) : undefined),
    [errors, serverErrors, submitted, touched],
  );

  const submit = useCallback(async () => {
    const draft = draftRef.current;
    if (!draft) return;

    setSubmitted(true);

    // Checked against the draft in hand rather than the memo above, which belongs
    // to the render that is already on screen.
    const problems = latest.current.validate(draft);
    if (Object.values(problems).some(Boolean)) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const body = await latest.current.toInput(draft);
      const saved = await latest.current.save(body);
      setSection(saved);
      setForm(latest.current.toDraft(saved));
      setTouched({});
      setSubmitted(false);
      setServerErrors({});
      latest.current.onSaved?.(saved);
      toast.success(latest.current.messages.saved, latest.current.messages.savedDetail);
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error(latest.current.messages.failed, errorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [toast]);

  return {
    section,
    form,
    loading,
    loadError,
    reload,
    saving,
    submitted,
    errors,
    hasErrors,
    errorFor,
    touch,
    patch,
    update,
    clearServerErrors,
    serverErrors,
    submit,
  };
}

/**
 * Picked images, from selection to upload, for one form.
 *
 * Two jobs, both of which every image slot in the panel needs and both of which
 * were written out by hand in each form that has one:
 *
 *   the object URLs a preview is made from are revoked on unmount and after a
 *   successful save, so a long editing session does not pin every image it
 *   previewed in memory. A form that wants a rejected pick released SOONER than
 *   that calls `discard` with the outgoing preview as it writes the slot; the hero
 *   tab does, because it has twelve slots and an admin auditioning photographs in
 *   each of six rows is the case where waiting for the save costs real memory. The
 *   single-slot tabs still wait for unmount;
 *
 *   a File is uploaded ONCE however many times Save is pressed. The upload happens
 *   in save(), before the PUT. When the PUT fails the picked File is still in the
 *   form, so pressing Save again would upload the same bytes a second time and
 *   leave the first `files` row referenced by nothing - one permanent orphan per
 *   retry, on a path that has no cleanup. Keyed by the File object itself, so
 *   retrying sends the upload it already has and choosing a different picture (a
 *   new File) uploads as usual.
 *
 * A Map rather than the single slot the Partner hero remembers, because the hero
 * here has up to six slots and the two child lists have one per record.
 *
 * WHO OWNS THE HOOK MATTERS. The memo lives in a ref, so it lives exactly as long
 * as the component that called useImageUploads. A dialog that calls it itself loses
 * the memo the moment it closes, which is the one case it exists for: upload
 * succeeds, the write fails, the admin cancels, reopens, picks the same file and
 * saves - two `files` rows, one of them referenced by nothing and (About uploads
 * being public entity types) anonymously readable forever, with no sweeper behind
 * it. So the PAGE owns the hook and passes it to its dialogs, which outlives any
 * one open. See TeamMemberModal.
 */
export function useImageUploads() {
  const objectUrls = useRef<Set<string>>(new Set());
  const uploaded = useRef<Map<File, string>>(new Map());

  const release = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);

  useEffect(() => release, [release]);

  /** A local preview URL for a picked file, revoked with the rest. */
  const preview = useCallback((file: File): string => {
    const url = URL.createObjectURL(file);
    objectUrls.current.add(url);
    return url;
  }, []);

  /**
   * Revokes ONE preview early - the one the slot being written to was showing.
   *
   * Without it `release()` on unmount (or after a save) was the only revoke, so an
   * admin auditioning a handful of photographs in each of six backdrop rows pinned
   * every rejected one until they navigated away. Ignores anything this hook did
   * not hand out, so passing a stored image's server URL is a no-op rather than an
   * attempt to revoke it.
   */
  const discard = useCallback((url: string | null | undefined) => {
    if (!url || !objectUrls.current.has(url)) return;
    URL.revokeObjectURL(url);
    objectUrls.current.delete(url);
  }, []);

  /** Uploads a picked File once, and returns the id to save against it. */
  const uploadOnce = useCallback(async (file: File, entityType: string): Promise<string> => {
    const known = uploaded.current.get(file);
    if (known) return known;
    const { id } = await fileService.upload(file, entityType);
    uploaded.current.set(file, id);
    return id;
  }, []);

  /**
   * Called after a successful save: the slots now hold stored files rather than
   * picks, so there is nothing left for the remembered ids to protect against a
   * retry of, and the previews have been replaced by the server's URLs.
   */
  const settled = useCallback(() => {
    uploaded.current.clear();
    release();
  }, [release]);

  return { preview, discard, uploadOnce, settled };
}

/** What useImageUploads hands back, so a page can pass it to a dialog. */
export type ImageUploads = ReturnType<typeof useImageUploads>;
